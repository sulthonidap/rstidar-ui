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
import { useLabelOrders } from '@/features/orders/queries';
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
  // The package label keeps the panel's masked patient data; only the stub the
  // patient keeps needs the full order, fetched per print.
  const full = useLabelOrders(
    orders.map((o) => o.id),
    open,
  );
  const labels = (full.data ?? []).map((stub) => {
    const masked = orders.find((o) => o.id === stub.id);
    const top: Order = masked
      ? {
          ...stub,
          customer_name: masked.customer_name,
          customer_phone: masked.customer_phone,
          dropoff_address: masked.dropoff_address,
          patient_name: masked.patient_name,
          medical_record_no: masked.medical_record_no,
        }
      : stub;
    return { top, stub };
  });
  const ready = labels.length > 0 && labels.every((l) => readyIds.has(l.stub.id));
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
          {full.isLoading && <p className="p-8 text-center text-sm text-muted-foreground">Menyiapkan label…</p>}
          {full.isError && (
            <p className="p-8 text-center text-sm text-destructive">Gagal memuat data label. Tutup lalu coba lagi.</p>
          )}
          <div ref={stackRef} className="label-stack flex flex-col items-center gap-4">
            {labels.map(({ top, stub }) => (
              <div key={stub.id} className="label-frame shadow-md">
                <ShippingLabel order={top} stubOrder={stub} onReady={() => markReady(stub.id)} />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <Button onClick={print} disabled={!ready || labels.length === 0}>
            <PrinterIcon />
            {single ? 'Cetak' : `Cetak ${orders.length} label`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
