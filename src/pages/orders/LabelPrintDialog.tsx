import { PrinterIcon } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import ShippingLabel, { SHIPPING_LABEL_PRINT_CSS } from '@/components/ShippingLabel';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { printElement } from '@/lib/print';
import type { Order } from '@/types/models';

/** Preview + print shipping labels for one or many orders; each label prints on its own page. */
export default function LabelPrintDialog({
  orders,
  open,
  onOpenChange,
}: {
  orders: Order[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const stackRef = useRef<HTMLDivElement>(null);
  const [readyIds, setReadyIds] = useState<ReadonlySet<number>>(new Set());
  const markReady = useCallback(
    (id: number) => setReadyIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id))),
    [],
  );
  const ready = orders.every((o) => readyIds.has(o.id));
  const single = orders.length === 1;

  const print = () => {
    if (!stackRef.current) return;
    printElement(
      stackRef.current,
      SHIPPING_LABEL_PRINT_CSS,
      single ? `Label ${orders[0].code}` : `Label ${orders.length} order`,
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) setReadyIds(new Set());
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-fit">
        <DialogHeader>
          <DialogTitle>{single ? `Label ${orders[0].code}` : `Cetak ${orders.length} label`}</DialogTitle>
          <DialogDescription>
            Di dialog print, pilih printer thermal, kertas 100 × 150 mm, margin None. Bagian bawah garis gunting untuk pemesan.
            {!single && ' Tiap label tercetak di halaman sendiri.'}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-muted p-4">
          <div ref={stackRef} className="label-stack flex flex-col items-center gap-4">
            {orders.map((o) => (
              <div key={o.id} className="label-frame shadow-md">
                <ShippingLabel order={o} onReady={() => markReady(o.id)} />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <Button onClick={print} disabled={!ready || orders.length === 0}>
            <PrinterIcon />
            {single ? 'Cetak' : `Cetak ${orders.length} label`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
