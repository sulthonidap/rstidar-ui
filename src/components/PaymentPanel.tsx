import { BanknoteIcon, CheckCircle2Icon, ClockIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePaymentInfo } from '@/features/payments/queries';
import { fileUrl } from '@/lib/api';
import { formatRupiah } from '@/lib/format';
import type { TrackedOrder } from '@/types/models';

/**
 * Payment box on the public success & tracking pages: what to pay and how,
 * and where the payment stands. Non-cash has no receipt upload — the RS's CCO
 * checks the transfer/QRIS coming in and marks it paid. `bare` drops the card
 * frame (used inside the pop-up after an order is made).
 */
export default function PaymentPanel({ order, bare }: { order: TrackedOrder; bare?: boolean }) {
  const payment = order.payment;
  const noncash = payment?.method === 'noncash';
  const needsPayment = noncash && payment?.status === 'unpaid' && order.status !== 'cancelled';
  const { data: info } = usePaymentInfo(noncash);
  const [copied, setCopied] = useState(false);

  if (!payment) return null;

  const copyAccount = async () => {
    if (!info?.account_no) return;
    try {
      await navigator.clipboard.writeText(info.account_no.replace(/\s/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked; the number is on screen
    }
  };

  const body = (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-muted-foreground">{noncash ? 'Non-tunai (transfer/QRIS)' : 'Tunai di kasir RS'}</span>
        <span className="text-lg font-semibold">{formatRupiah(payment.amount)}</span>
      </div>

      {payment.status === 'paid' && (
        <p className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2Icon className="size-4" /> Lunas. Terima kasih!
        </p>
      )}
      {payment.status === 'refunded' && <p className="text-muted-foreground">Pembayaran sudah dikembalikan (refund).</p>}
      {!noncash && payment.status === 'unpaid' && (
        <p className="flex items-start gap-2">
          <BanknoteIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          Bayar tunai di kasir {order.organization?.name ?? 'RS'}. Obat dikirim setelah pembayaran tercatat.
        </p>
      )}

      {needsPayment && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1">
              <p className="font-medium">Transfer ke rekening</p>
              {info?.account_no ? (
                <>
                  <p>
                    {info.bank_name} ·{' '}
                    <span className="font-mono text-base font-semibold tracking-wide">{info.account_no}</span>{' '}
                    <Button type="button" variant="ghost" size="icon-xs" onClick={copyAccount} aria-label="Salin nomor rekening">
                      {copied ? <CheckCircle2Icon className="text-emerald-600" /> : <CopyIcon />}
                    </Button>
                  </p>
                  <p className="text-muted-foreground">a.n. {info.account_name}</p>
                </>
              ) : (
                <p className="text-muted-foreground">Rekening belum diatur, hubungi petugas RS.</p>
              )}
              {info?.instructions && <p className="text-xs whitespace-pre-line text-muted-foreground">{info.instructions}</p>}
            </div>
            {info?.qris_url && (
              <div className="text-center">
                <img
                  src={fileUrl(info.qris_url)}
                  alt="QRIS pembayaran"
                  className="mx-auto size-40 rounded-lg border bg-white object-contain p-1"
                />
                <p className="mt-1 text-xs text-muted-foreground">Atau scan QRIS</p>
              </div>
            )}
          </div>

          <p className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3">
            <ClockIcon className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Transfer sesuai nominal di atas. Petugas {order.organization?.name ?? 'RS'} akan memastikan pembayaran
              masuk, lalu status di halaman ini berubah jadi <b>Lunas</b>. Simpan bukti transfer kamu kalau sewaktu-waktu
              diminta petugas.
            </span>
          </p>
        </div>
      )}
    </div>
  );

  if (bare) return body;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Pembayaran</CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
