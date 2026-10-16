import { CheckIcon, CircleCheckBigIcon, CopyIcon, PackageSearchIcon, WalletIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';

import Loader from '@/components/Loader';
import PaymentPanel from '@/components/PaymentPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTrackOrder } from '@/features/public/queries';
import KioskCountdown, { KIOSK_FORM } from '@/pages/public/KioskCountdown';
import TrackedOrderCard from '@/pages/public/TrackedOrderCard';

/** /order/:code/selesai — shown right after a public order is submitted. */
export default function PublicOrderSuccessPage() {
  const { code = '' } = useParams<{ code: string }>();
  const kiosk = useSearchParams()[0].get('kios') === '1';
  const { data: order, isLoading, isError } = useTrackOrder(code);
  const [copied, setCopied] = useState(false);
  // Pop the payment instructions up once, right after the order is made.
  const [payOpen, setPayOpen] = useState(true);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context): the code is still visible to copy by hand.
    }
  };

  if (isLoading) return <Loader label="Memuat order…" />;
  if (isError || !order) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Order <b className="text-foreground">{code}</b> tidak ditemukan.
        </CardContent>
      </Card>
    );
  }

  const unpaid = order.payment?.status === 'unpaid' && order.status !== 'cancelled';
  const noncash = order.payment?.method === 'noncash';

  return (
    <div className="space-y-6">
      <Dialog open={payOpen && unpaid} onOpenChange={setPayOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WalletIcon className="size-5 text-primary" />
              Selesaikan pembayaran
            </DialogTitle>
            <DialogDescription>
              Order <b className="text-foreground">{order.code}</b> sudah dibuat.{' '}
              {noncash
                ? 'Transfer atau scan QRIS sesuai nominal di bawah. Petugas RS akan memastikan pembayaran masuk.'
                : 'Bayar tunai di kasir RS supaya obat bisa diambil dan dikirim.'}
            </DialogDescription>
          </DialogHeader>
          <PaymentPanel order={order} bare />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>
              {noncash ? 'Nanti saja' : 'Mengerti'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-emerald-200 bg-emerald-50 ring-emerald-200 dark:border-emerald-900 dark:bg-emerald-950/40">
        <CardContent className="flex flex-col items-center gap-3 py-4 text-center">
          <CircleCheckBigIcon className="size-10 text-emerald-600 dark:text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold">Order berhasil dibuat</h1>
            <p className="text-sm text-muted-foreground">
              Petugas {order.organization?.name ?? 'RS'} akan memvalidasi order kamu.
              {order.payment?.method === 'noncash' && order.payment.status === 'unpaid'
                ? ' Selesaikan pembayaran di bawah supaya obat bisa segera dikirim.'
                : ''}{' '}
              Simpan kode di bawah untuk melacak status.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-background px-4 py-2">
            <span className="font-mono text-lg font-bold tracking-wider">{order.code}</span>
            <Button variant="ghost" size="icon-sm" onClick={copy} aria-label="Salin kode order">
              {copied ? <CheckIcon className="text-emerald-600" /> : <CopyIcon />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <TrackedOrderCard order={order} showPrice title="Detail order" />

      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to={`/lacak/${encodeURIComponent(order.code)}`}>
            <PackageSearchIcon />
            Lacak order ini
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={kiosk ? KIOSK_FORM : '/order'}>Buat order lagi</Link>
        </Button>
      </div>

      {kiosk && <KioskCountdown />}
    </div>
  );
}
