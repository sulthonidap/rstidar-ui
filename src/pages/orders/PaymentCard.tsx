import { CheckCheckIcon, CheckIcon, LoaderCircleIcon, RotateCcwIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { PaymentAction } from '@/features/payments/queries';
import { usePaymentAction } from '@/features/payments/queries';
import { useTransitionOrder } from '@/features/orders/queries';
import { apiErrorMessage, fileUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_COLOR, PAYMENT_STATUS_LABELS } from '@/lib/payment';
import { canMoveOrder, hasRole } from '@/lib/roles';
import type { Order } from '@/types/models';

// "paid-confirm": mark paid, then confirm the order in one go (the CCO's usual step).
type DialogKind = PaymentAction | 'paid-confirm';

/**
 * The order's payment for staff: method, status and amount, with the actions
 * the role may take — the RS's CCO marks it paid once the cash is received or
 * the transfer/QRIS is in (Finance/Admin too), refund (Finance/Admin). Orders
 * from before receipts were dropped still show their old receipt.
 */
export default function PaymentCard({ order }: { order: Order }) {
  const { user } = useAuth();
  const txn = order.transaction;
  const action = usePaymentAction(order.id);
  const transition = useTransitionOrder(order.id);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!txn) {
    return <p className="text-sm text-muted-foreground">Belum ada tagihan untuk order ini.</p>;
  }

  const finance = hasRole(user, 'admin', 'finance');
  const cash = txn.payment_method === 'cash';
  const approver = finance || hasRole(user, 'cco');
  const canMarkPaid = txn.payment_status === 'unpaid' && approver && order.status !== 'cancelled';
  const canRefund = finance && txn.payment_status === 'paid';
  // A new order is confirmed only once paid: offer both in one click.
  const canConfirm = order.status === 'pending' && canMoveOrder(user, 'pending', 'confirmed');
  const busy = action.isPending || transition.isPending;

  const run = async () => {
    if (!dialog) return;
    setError(null);
    const payAction: PaymentAction = dialog === 'refund' ? 'refund' : 'paid';
    try {
      await action.mutateAsync({ action: payAction, note: note.trim() || undefined });
    } catch (err) {
      setError(apiErrorMessage(err, 'Gagal menyimpan'));
      return;
    }
    if (dialog === 'paid-confirm') {
      try {
        await transition.mutateAsync({ status: 'confirmed' });
        toast.success(`${order.code} dikonfirmasi`);
      } catch (err) {
        // Paid is saved; only confirming failed (e.g. someone else just changed the order).
        toast.error(apiErrorMessage(err, 'Sudah lunas, tapi gagal konfirmasi order'));
      }
    }
    setDialog(null);
    setNote('');
  };

  const titles: Record<DialogKind, string> = {
    'paid-confirm': 'Tandai lunas & konfirmasi order?',
    paid: 'Tandai lunas?',
    refund: 'Refund pembayaran?',
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start">
      <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Status</dt>
          <dd>
            <Badge variant="outline" className={`border-transparent ${PAYMENT_STATUS_COLOR[txn.payment_status]}`}>
              {PAYMENT_STATUS_LABELS[txn.payment_status]}
            </Badge>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Nominal</dt>
          <dd className="font-semibold">{formatRupiah(txn.amount)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Metode</dt>
          <dd>{txn.payment_method ? PAYMENT_METHOD_LABELS[txn.payment_method] : '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Dibayar</dt>
          <dd>{formatDateTime(txn.paid_at)}</dd>
        </div>
        {txn.note && (
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Catatan</dt>
            <dd>{txn.note}</dd>
          </div>
        )}
        {txn.recorded_by_user && (
          <div className="col-span-2 text-xs text-muted-foreground">Terakhir diubah oleh {txn.recorded_by_user.name}</div>
        )}

        <div className="col-span-2 flex flex-wrap gap-2 pt-1">
          {canMarkPaid && canConfirm && (
            <Button size="sm" onClick={() => setDialog('paid-confirm')}>
              <CheckCheckIcon />
              Lunas & Konfirmasi
            </Button>
          )}
          {canMarkPaid && (
            <Button size="sm" variant={canConfirm ? 'outline' : 'default'} onClick={() => setDialog('paid')}>
              <CheckIcon />
              {canConfirm ? 'Tandai lunas saja' : cash ? 'Tandai lunas (tunai)' : 'Tandai lunas (transfer/QRIS)'}
            </Button>
          )}
          {canRefund && (
            <Button size="sm" variant="outline" onClick={() => setDialog('refund')}>
              <RotateCcwIcon />
              Refund
            </Button>
          )}
        </div>
      </dl>

      {txn.proof_url && (
        <a href={fileUrl(txn.proof_url)} target="_blank" rel="noreferrer" className="shrink-0" title="Buka bukti bayar">
          <img
            src={fileUrl(txn.proof_url)}
            alt="Bukti bayar"
            className="size-36 rounded-lg border object-cover transition-opacity hover:opacity-90"
          />
        </a>
      )}

      <Dialog
        open={!!dialog}
        onOpenChange={(v) => {
          if (!v) {
            setDialog(null);
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog ? titles[dialog] : ''}</DialogTitle>
            <DialogDescription>
              {order.code} · {formatRupiah(txn.amount)} · {cash ? 'tunai di kasir RS' : 'transfer/QRIS'}
              {dialog === 'paid-confirm' && <> — setelah ini Farmasi dikabari untuk menyiapkan obat.</>}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={dialog !== 'refund' && !cash ? 'Catatan (opsional), mis. transfer BCA 14.30' : 'Catatan (opsional)'}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>
              Batal
            </Button>
            <Button
              onClick={run}
              disabled={busy}
              variant={dialog === 'refund' ? 'destructive' : 'default'}
            >
              {busy && <LoaderCircleIcon className="animate-spin" />}
              {dialog === 'paid-confirm' ? 'Ya, lunas & konfirmasi' : dialog === 'paid' ? 'Ya, lunas' : 'Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
