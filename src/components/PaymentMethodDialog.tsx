import { LoaderCircleIcon } from 'lucide-react';
import { useState } from 'react';

import PaymentChoice from '@/components/PaymentChoice';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatRupiah } from '@/lib/format';
import type { PaymentMethod } from '@/types/models';

/**
 * Last step of the order forms: once the form is valid, "Buat order" opens
 * this to pick how the patient pays, and only then is the order created.
 */
export default function PaymentMethodDialog({
  open,
  onOpenChange,
  price,
  pending,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Price of the chosen service, when it's known. */
  price?: number;
  pending: boolean;
  error?: string | null;
  onConfirm: (method: PaymentMethod) => void;
}) {
  const [method, setMethod] = useState<PaymentMethod | ''>('');

  return (
    <Dialog open={open} onOpenChange={(v) => !pending && onOpenChange(v)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pilih pembayaran</DialogTitle>
          <DialogDescription>
            {price != null ? (
              <>
                Total biaya <b className="text-foreground">{formatRupiah(price)}</b>. Mau bayar pakai apa?
              </>
            ) : (
              'Mau bayar pakai apa?'
            )}
          </DialogDescription>
        </DialogHeader>

        <PaymentChoice value={method} onChange={setMethod} />

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            Kembali
          </Button>
          <Button onClick={() => method && onConfirm(method)} disabled={!method || pending}>
            {pending && <LoaderCircleIcon className="animate-spin" />}
            {pending ? 'Membuat order…' : 'Buat order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
