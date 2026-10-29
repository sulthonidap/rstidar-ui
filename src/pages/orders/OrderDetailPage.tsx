import {
  ArrowLeftIcon,
  HandHeartIcon,
  PencilIcon,
  WalletIcon,
  PrinterIcon,
  UserRoundPlusIcon,
  XCircleIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';

import OrderPharmacy from '@/components/OrderPharmacy';
import OrderPrice from '@/components/OrderPrice';
import Loader from '@/components/Loader';
import DeliveryProof from '@/components/DeliveryProof';
import OrderMap from '@/components/OrderMap';
import StatusTimeline from '@/components/StatusTimeline';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrder } from '@/features/orders/queries';
import { useAuth } from '@/lib/auth';
import { formatDateTime, formatRupiah } from '@/lib/format';
import { hasRole } from '@/lib/roles';
import { formatSchedule } from '@/lib/schedule';
import { isFreeClaim } from '@/lib/free-program';
import { PAYMENT_METHOD_LABELS, PAYMENT_OPEN_TINT } from '@/lib/payment';
import { cn } from '@/lib/utils';
import { orderDistanceKm } from '@/lib/geo';
import { distanceText } from '@/components/QuoteLine';
import { FreeClaimDialog } from '@/pages/orders/FreeClaimDialog';
import NewOrderPaymentDialog from '@/pages/orders/NewOrderPaymentDialog';
import PaymentCard from '@/pages/orders/PaymentCard';
import { UNPAID_HINT, useOrderActions } from '@/pages/orders/useOrderActions';
import type { Order } from '@/types/models';
import { ORDER_SOURCE_LABELS, PATIENT_CATEGORY_LABELS } from '@/types/models';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

/** Action buttons in the page header — same actions as the "⋯" row menu. */
function OrderDetailActions({ order }: { order: Order }) {
  const a = useOrderActions(order);
  // This role's next step is the main call to action.
  const primary = a.quickMoves;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {a.showCancel && (
        <Button
          variant="outline"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={a.openCancel}
        >
          <XCircleIcon />
          Batalkan
        </Button>
      )}
      {a.showPrint && (
        <Button variant="outline" onClick={a.openLabel}>
          <PrinterIcon />
          Cetak label
        </Button>
      )}
      {a.showFreeClaim && (
        <Button className="bg-sky-600 text-white hover:bg-sky-700" onClick={a.openFreeClaim}>
          <HandHeartIcon />
          Cek pengajuan gratis
        </Button>
      )}
      {a.showEdit && (
        <Button variant="outline" onClick={a.openEdit}>
          <PencilIcon />
          Edit
        </Button>
      )}
      {a.showAssign && (
        <Button variant={primary.length > 0 ? 'outline' : 'default'} onClick={a.openAssign}>
          <UserRoundPlusIcon />
          {a.assignLabel}
        </Button>
      )}
      {primary.map(({ to, label, icon: Icon, blocked }) => (
        <Button key={to} onClick={() => a.moveTo(to)} disabled={a.isMoving || !!blocked} title={blocked}>
          <Icon />
          {label}
        </Button>
      ))}
      {primary.some((m) => m.blocked) && (
        <p className="basis-full text-right text-xs text-amber-700 dark:text-amber-300">{UNPAID_HINT}</p>
      )}

      {a.dialogs}
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: order, isLoading } = useOrder(id ?? '');
  const location = useLocation();
  const navigate = useNavigate();
  // Just made on "Buat order": pop the payment up once (state is cleared on close,
  // so a refresh doesn't bring it back).
  const [justCreated] = useState(() => !!(location.state as { created?: boolean } | null)?.created);
  const [payOpen, setPayOpen] = useState(justCreated);
  const [freeClaimOpen, setFreeClaimOpen] = useState(false);
  const closePay = () => {
    setPayOpen(false);
    navigate('.', { replace: true, state: null });
  };

  if (isLoading) return <Loader label="Memuat order…" />;
  if (!order) return <p className="text-sm text-destructive">Order tidak ditemukan.</p>;

  // Fixing map points: whoever plans the route (CCO/Ops/Admin), while the order is open.
  const canFixMap = hasRole(user, 'admin', 'cco', 'ops') && order.status !== 'done' && order.status !== 'cancelled';
  // Not paid yet (or receipt waiting for a check): colour the payment so it stands out.
  const txn = order.transaction;
  const payTint = txn && order.status !== 'cancelled' ? PAYMENT_OPEN_TINT[txn.payment_status] : undefined;
  // A patient's free-delivery claim still open: CCO decides it before taking the payment.
  const freeClaim = isFreeClaim(order) && order.status !== 'done' && order.status !== 'cancelled';
  const canDecideClaim = hasRole(user, 'admin', 'cco');

  return (
    <div className="space-y-4">
      <NewOrderPaymentDialog order={order} open={payOpen} justCreated={justCreated && !!location.state} onClose={closePay} />
      <div className="space-y-2">
        <Link to="/orders" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeftIcon className="size-4" />
          Kembali ke Order
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-bold">{order.code}</h2>
            <StatusBadge status={order.status} />
          </div>
          <OrderDetailActions order={order} />
        </div>
      </div>

      {freeClaim && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sky-300 bg-sky-50 px-4 py-3 dark:border-sky-800 dark:bg-sky-950/40">
          <HandHeartIcon className="size-5 shrink-0 text-sky-600 dark:text-sky-400" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">
              Pasien mengajukan ongkir gratis · {PATIENT_CATEGORY_LABELS[order.patient_category ?? 'umum']}
            </p>
            <p className="text-muted-foreground">
              Cek KTP pasien, lalu setujui atau tolak. Sampai diputuskan, ongkir tetap {formatRupiah(order.price)}.
            </p>
          </div>
          {canDecideClaim && (
            <>
              <Button size="sm" className="bg-sky-600 text-white hover:bg-sky-700" onClick={() => setFreeClaimOpen(true)}>
                Cek pengajuan
              </Button>
              <FreeClaimDialog order={order} open={freeClaimOpen} onOpenChange={setFreeClaimOpen} />
            </>
          )}
        </div>
      )}

      {txn && payTint && (
        <div className={cn('flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3', payTint)}>
          <WalletIcon className="size-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-semibold">
              Belum dibayar ·{' '}
              {formatRupiah(txn.amount)}
              {txn.payment_method && (
                <span className="font-normal text-muted-foreground"> · {PAYMENT_METHOD_LABELS[txn.payment_method]}</span>
              )}
            </p>
            <p className="text-muted-foreground">
              {order.status === 'pending'
                ? 'Order belum bisa dikonfirmasi (dan obat belum disiapkan) sampai pembayaran lunas.'
                : 'Obat belum bisa diambil dari RS sampai pembayaran lunas.'}
            </p>
          </div>
          <Button size="sm" variant="outline" className="bg-background" onClick={() => setPayOpen(true)}>
            {order.status === 'pending' ? 'Proses pembayaran' : 'Lihat pembayaran'}
          </Button>
        </div>
      )}

      {/* Left: order facts + history. Right (as tall as the left column): recipient,
          addresses and the map. Below, full width: proof of delivery. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Order</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <Field label="Layanan" value={order.service?.name ?? '—'} />
                <Field
                  label="Harga"
                  value={
                    <>
                      <OrderPrice order={order} />
                      {!order.is_free && order.service?.tiers?.length && order.distance_km != null ? (
                        <span className="text-xs text-muted-foreground"> (tarif jarak)</span>
                      ) : null}
                    </>
                  }
                />
                <Field label="Farmasi" value={<OrderPharmacy order={order} />} />
                <Field label="Sumber" value={ORDER_SOURCE_LABELS[order.source] ?? order.source} />
                <Field label="Kurir" value={order.courier?.user?.name ?? 'Belum ditugaskan'} />
                <Field label="Dibuat" value={formatDateTime(order.created_at)} />
                <Field label="Jadwal kirim" value={formatSchedule(order.scheduled_date, order.scheduled_slot)} />
                <Field
                  label="Jarak RS → tujuan"
                  value={(() => {
                    const text = distanceText(orderDistanceKm(order), order.distance_source);
                    return text ?? <span className="text-muted-foreground">Titik tujuan belum diatur</span>;
                  })()}
                />
              </dl>
            </CardContent>
          </Card>

          {/* Grows so both columns end at the same line. */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle className="text-sm">Riwayat status</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusTimeline
                status={order.status}
                entries={(order.status_history ?? []).map((h) => ({ ...h, actor: h.changed_by_user?.name }))}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Customer & Alamat</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Nama" value={order.customer_name} />
              <Field label="Telepon" value={order.customer_phone} />
              {order.patient_name && <Field label="Nama pasien" value={order.patient_name} />}
              {order.medical_record_no && <Field label="No. Rekam Medis" value={order.medical_record_no} />}
              <Field label="Pickup" value={order.pickup_address} />
              {order.notes && <Field label="Catatan" value={order.notes} />}
              <div className="col-span-2">
                <Field
                  label="Tujuan"
                  value={
                    <>
                      {order.dropoff_address}
                      {order.dropoff_region && <span className="block text-muted-foreground">{order.dropoff_region}</span>}
                    </>
                  }
                />
              </div>
            </dl>
            <OrderMap order={order} editable={canFixMap} fill />
          </CardContent>
        </Card>

        <Card className={cn('lg:col-span-2', payTint)}>
          <CardHeader>
            <CardTitle className="text-sm">Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentCard order={order} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Bukti terima (POD)</CardTitle>
          </CardHeader>
          <CardContent>
            <DeliveryProof
              proof={order.delivery}
              pendingText={
                order.status === 'cancelled'
                  ? 'Order dibatalkan, tidak ada bukti terima.'
                  : 'Belum ada. Diisi kurir saat menyerahkan paket: foto, nama penerima, dan lokasi.'
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
