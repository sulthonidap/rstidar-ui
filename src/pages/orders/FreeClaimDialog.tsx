import { BadgeCheckIcon, LoaderCircleIcon, TriangleAlertIcon, XIcon } from 'lucide-react';
import { useState } from 'react';

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
import type { FreeClaimAction } from '@/features/free-program/queries';
import { useFreeClaim, useFreeProgram } from '@/features/free-program/queries';
import { apiErrorMessage } from '@/lib/api';
import { formatRupiah } from '@/lib/format';
import { PATIENT_CATEGORY_LABELS, type Order } from '@/types/models';

/**
 * A patient's free-delivery claim from the public form/kiosk: CCO checks the
 * KTP, then approves (ongkir Rp0, payment settled) or rejects (a regular order).
 */
export function FreeClaimDialog({
  order,
  open,
  onOpenChange,
}: {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: program } = useFreeProgram();
  const claim = useFreeClaim(order.id);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<FreeClaimAction | null>(null);
  const category = order.patient_category ?? 'umum';

  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v) {
      setNote('');
      setError(null);
    }
  };

  const decide = async (action: FreeClaimAction) => {
    setError(null);
    setPending(action);
    try {
      await claim.mutateAsync({ action, note: note.trim() || undefined });
      close(false);
    } catch (err) {
      setError(apiErrorMessage(err, 'Gagal menyimpan'));
    } finally {
      setPending(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pengajuan ongkir gratis</DialogTitle>
          <DialogDescription>
            {order.code} · pasien mengajukan sebagai <b>{PATIENT_CATEGORY_LABELS[category]}</b> dari form pasien
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Cek dulu sebelum menyetujui:</p>
            <ul className="mt-1 list-disc space-y-0.5 ps-4">
              <li>
                KTP pasien berdomisili <b>{program?.domicile ?? '…'}</b>
              </li>
              {category === 'lansia' ? (
                <li>Umur pasien 60 tahun ke atas (lihat tanggal lahir di KTP)</li>
              ) : (
                <li>Kartu / surat keterangan disabilitas</li>
              )}
            </ul>
          </div>
        </div>

        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>
            <b className="text-foreground">Setujui</b>: ongkir jadi Rp0 (normal {formatRupiah(order.price)}), pembayaran
            otomatis lunas.
          </li>
          <li>
            <b className="text-foreground">Tolak</b>: jadi order biasa, pasien tetap membayar {formatRupiah(order.price)}.
          </li>
        </ul>

        <Textarea
          rows={2}
          maxLength={150}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={`Catatan (opsional), mis. alasan ditolak: KTP luar ${program?.domicile ?? 'domisili'}`}
        />
        <p className="text-xs text-muted-foreground">Keputusan dan nama petugas tercatat di riwayat order.</p>
        {error && <p className="text-xs text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => decide('reject')}
            disabled={claim.isPending}
          >
            {pending === 'reject' ? <LoaderCircleIcon className="animate-spin" /> : <XIcon />}
            Tolak
          </Button>
          <Button onClick={() => decide('approve')} disabled={claim.isPending}>
            {pending === 'approve' ? <LoaderCircleIcon className="animate-spin" /> : <BadgeCheckIcon />}
            Setujui, gratiskan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
