import { BanknoteIcon, WalletIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePaymentInfo } from '@/features/payments/queries';
import { fileUrl } from '@/lib/api';
import { formatRupiah } from '@/lib/format';
import PaymentCard from '@/pages/orders/PaymentCard';
import type { Order } from '@/types/models';

/**
 * Pops up right after staff create an order: how the patient pays (so staff
 * can pass it on) plus the payment card to record it straight away.
 */
export default function NewOrderPaymentDialog({
  order,
  open,
  justCreated,
  onClose,
}: {
  order: Order;
  open: boolean;
  /** Opened right after "Buat order" (vs. from the unpaid banner). */
  justCreated?: boolean;
  onClose: () => void;
}) {
  const txn = order.transaction;
  const noncash = txn?.payment_method === 'noncash';
  const { data: info } = usePaymentInfo(open && noncash);

  return (
    <Dialog open={open && !!txn} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WalletIcon className="size-5 text-primary" />
            Pembayaran {order.code}
          </DialogTitle>
          <DialogDescription>
            {justCreated ? 'Order sudah dibuat. ' : ''}Sampaikan cara bayar ini ke pasien — order baru dikonfirmasi dan obatnya disiapkan setelah lunas.
          </DialogDescription>
        </DialogHeader>

        {txn && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <span className="text-muted-foreground">
                {noncash ? 'Non-tunai (transfer/QRIS)' : 'Tunai di kasir RS'}
              </span>
              <span className="text-lg font-semibold">{formatRupiah(txn.amount)}</span>
            </div>

            {noncash ? (
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <div className="space-y-1">
                  <p className="font-medium">Rekening tujuan</p>
                  {info?.account_no ? (
                    <>
                      <p>
                        {info.bank_name} ·{' '}
                        <span className="font-mono font-semibold tracking-wide">{info.account_no}</span>
                      </p>
                      <p className="text-muted-foreground">a.n. {info.account_name}</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Rekening belum diatur (menu Pembayaran).</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Cek dana masuk di mutasi rekening/QRIS, lalu tandai lunas di bawah.
                  </p>
                </div>
                {info?.qris_url && (
                  <img
                    src={fileUrl(info.qris_url)}
                    alt="QRIS pembayaran"
                    className="mx-auto size-32 rounded-lg border bg-white object-contain p-1"
                  />
                )}
              </div>
            ) : (
              <p className="flex items-start gap-2">
                <BanknoteIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                Pasien bayar tunai di kasir {order.organization?.name ?? 'RS'}. Tandai lunas setelah pembayaran
                diterima.
              </p>
            )}

            <div className="rounded-lg border p-3">
              <PaymentCard order={order} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
