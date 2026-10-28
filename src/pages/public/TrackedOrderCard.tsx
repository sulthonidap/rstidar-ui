import DeliveryProof from '@/components/DeliveryProof';
import PaymentPanel from '@/components/PaymentPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { formatSchedule } from '@/lib/schedule';
import PackingNotice from '@/pages/public/PackingNotice';
import PatientProgress from '@/pages/public/PatientProgress';
import type { TrackedOrder } from '@/types/models';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

/** Order summary + simplified patient progress shown on the public success & tracking pages. */
export default function TrackedOrderCard({
  order,
  showPrice,
  title,
  compactUntilSent,
}: {
  order: TrackedOrder;
  showPrice?: boolean;
  /** Card heading instead of the order code (when the page already shows the code). */
  title?: string;
  /** Tracking page: until the courier takes the package, show only a "being prepared" notice. */
  compactUntilSent?: boolean;
}) {
  // Until the courier takes the package, only a "being prepared" notice (+ payment, still needed).
  const sent = order.status === 'on_delivery' || order.status === 'done' || order.status === 'cancelled';
  if (compactUntilSent && !sent) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className={title ? 'text-lg' : 'font-mono text-lg tracking-wide'}>
              {title ?? order.code}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PackingNotice order={order} />
          </CardContent>
        </Card>
        <PaymentPanel order={order} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className={title ? 'text-lg' : 'font-mono text-lg tracking-wide'}>{title ?? order.code}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <PatientProgress order={order} />
          <dl className="divide-y">
            <Row label="RS / Instansi" value={order.organization?.name ?? '—'} />
            <Row label="Layanan" value={order.service_name ?? '—'} />
            {showPrice && <Row label="Estimasi biaya" value={formatRupiah(order.price)} />}
            <Row label="Penerima" value={order.customer_name} />
            <Row label="Telepon" value={order.customer_phone} />
            <Row label="Tujuan" value={order.dropoff_address} />
            <Row label="Jadwal kirim" value={formatSchedule(order.scheduled_date, order.scheduled_slot)} />
            <Row label="Kurir" value={order.courier_name ?? 'Belum ditugaskan'} />
            <Row label="Dibuat" value={formatDateTime(order.created_at)} />
          </dl>
        </CardContent>
      </Card>

      <PaymentPanel order={order} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Bukti terima (POD)</CardTitle>
        </CardHeader>
        <CardContent>
          <DeliveryProof
            proof={order.delivery}
            pendingText={
              order.status === 'cancelled'
                ? 'Order dibatalkan, tidak ada bukti terima.'
                : 'Belum ada. Foto bukti terima muncul di sini setelah paket diterima.'
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
