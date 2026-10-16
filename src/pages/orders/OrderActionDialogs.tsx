import { useState } from 'react';
import { toast } from 'sonner';

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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { CancelPayment } from '@/features/orders/queries';
import { useAssignCourier, useAssignableCouriers, useTransitionOrder } from '@/features/orders/queries';
import { apiErrorMessage } from '@/lib/api';
import { formatRupiah } from '@/lib/format';
import type { Order } from '@/types/models';

export function AssignCourierDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const assign = useAssignCourier(order.id);
  // Only fetch the courier list once the dialog is actually opened.
  const { data: couriers, isLoading } = useAssignableCouriers(open ? order.id : '');
  const [courierId, setCourierId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      await assign.mutateAsync(Number(courierId));
      toast.success(`Kurir untuk ${order.code} disimpan`);
      onOpenChange(false);
    } catch (err) {
      setError(apiErrorMessage(err, 'Gagal menugaskan kurir'));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setCourierId(order.courier_id ? String(order.courier_id) : '');
          setError(null);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{order.courier_id ? 'Ganti kurir' : 'Tugaskan kurir'}</DialogTitle>
          <DialogDescription>
            {order.code} · {order.customer_name}
            {order.status === 'confirmed' && ' — status otomatis jadi Assigned.'}
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-1.5">
          <Label>Kurir</Label>
          <Select value={courierId} onValueChange={setCourierId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoading ? 'Memuat kurir…' : '— pilih kurir —'} />
            </SelectTrigger>
            <SelectContent>
              {couriers?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.user?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={submit} disabled={!courierId || assign.isPending}>
            {assign.isPending ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Cancelling a paid order: the money goes back to the patient (the CCO refunds
 * on the spot), or stays — e.g. the medicine was already prepared — with a reason.
 */
export function CancelPaymentChoice({
  value,
  onChange,
  title,
  refundLabel,
}: {
  value: CancelPayment;
  onChange: (v: CancelPayment) => void;
  title: string;
  refundLabel: string;
}) {
  const options: { v: CancelPayment; label: string; hint: string }[] = [
    { v: 'refund', label: refundLabel, hint: 'Uang dikembalikan ke pasien, tercatat sebagai Refund.' },
    { v: 'keep', label: 'Batal tanpa refund', hint: 'Mis. obat sudah disiapkan. Alasan wajib diisi.' },
  ];
  return (
    <fieldset className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/40">
      <legend className="sr-only">{title}</legend>
      <p className="font-medium text-amber-900 dark:text-amber-200">{title}</p>
      {options.map((o) => (
        <label key={o.v} className="flex cursor-pointer items-start gap-2.5 rounded-md p-1.5 hover:bg-amber-100/60 dark:hover:bg-amber-900/30">
          <input
            type="radio"
            name="cancel-payment"
            className="mt-0.5 size-4 accent-primary"
            checked={value === o.v}
            onChange={() => onChange(o.v)}
          />
          <span>
            <span className="block font-medium">{o.label}</span>
            <span className="block text-xs text-muted-foreground">{o.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function CancelOrderDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const transition = useTransitionOrder(order.id);
  const [note, setNote] = useState('');
  const [payment, setPayment] = useState<CancelPayment>('refund');
  const [error, setError] = useState<string | null>(null);
  const txn = order.transaction;
  const paid = txn?.payment_status === 'paid';
  const reasonRequired = paid && payment === 'keep';

  const submit = async () => {
    setError(null);
    if (reasonRequired && !note.trim()) {
      setError('Isi alasan kenapa pembayarannya tidak di-refund');
      return;
    }
    try {
      await transition.mutateAsync({
        status: 'cancelled',
        note: note.trim() || undefined,
        payment: paid ? payment : undefined,
      });
      toast.success(paid && payment === 'refund' ? `${order.code} dibatalkan & di-refund` : `${order.code} dibatalkan`);
      onOpenChange(false);
    } catch (err) {
      setError(apiErrorMessage(err, 'Gagal membatalkan order'));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setNote('');
          setPayment('refund');
          setError(null);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Batalkan order {order.code}?</DialogTitle>
          <DialogDescription>
            Order yang dibatalkan tidak bisa diaktifkan lagi.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {paid && txn && (
          <CancelPaymentChoice
            value={payment}
            onChange={setPayment}
            title={`Order ini sudah lunas ${formatRupiah(txn.amount)}`}
            refundLabel={`Batal + refund ${formatRupiah(txn.amount)}`}
          />
        )}
        <div className="space-y-1.5">
          <Label htmlFor={`cancel-note-${order.id}`}>Alasan {reasonRequired ? '(wajib)' : '(opsional)'}</Label>
          <Textarea
            id={`cancel-note-${order.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Mis. customer membatalkan"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kembali
          </Button>
          <Button variant="destructive" onClick={submit} disabled={transition.isPending}>
            {transition.isPending ? 'Membatalkan…' : paid && payment === 'refund' ? 'Ya, batalkan & refund' : 'Ya, batalkan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
