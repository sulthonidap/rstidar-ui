import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { UserRoundPlusIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { Link } from 'react-router';

import Loader from '@/components/Loader';
import { AutoResize, FitToPoints } from '@/components/map/MapHelpers';
import StatusBadge from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { OrderFilters } from '@/features/orders/queries';
import { useOrders } from '@/features/orders/queries';
import { useCouriers } from '@/features/couriers/queries';
import { useAuth } from '@/lib/auth';
import { formatRupiah } from '@/lib/format';
import type { LatLng } from '@/lib/geocode';
import { escapeHtml, pair, pin } from '@/lib/map-icons';
import { ASSIGNABLE_STATUSES, hasRole } from '@/lib/roles';
import { AssignCourierDialog } from '@/pages/orders/OrderActionDialogs';
import type { Order, OrderStatus } from '@/types/models';
import { ORDER_STATUS_LABELS } from '@/types/models';

const JAKARTA: LatLng = [-6.2, 106.816666];
/** The API caps per_page at 100. */
const MAP_LIMIT = 100;
const FINISHED: OrderStatus[] = ['done', 'cancelled'];

/** Same hues as STATUS_DOT, as hex for the HTML markers. */
const STATUS_HEX: Record<OrderStatus, string> = {
  pending: '#64748b',
  confirmed: '#0ea5e9',
  ready_for_pickup: '#8b5cf6',
  packed: '#f97316',
  on_delivery: '#18186C',
  done: '#10b981',
  cancelled: '#f43f5e',
};

/** Lucide "package" glyph, white, for inside the order pin. */
const PACKAGE_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="position:absolute;left:8px;top:7px"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><polyline points="3.29 7 12 12 20.71 7"/><path d="m7.5 4.27 9 5.15"/></svg>`;

/**
 * Teardrop pin per order (tip on the destination), colored by status; orders
 * still waiting for a courier get a red "!" badge.
 */
function orderIcon(status: OrderStatus, needsCourier: boolean) {
  const badge = needsCourier
    ? `<span style="position:absolute;right:-6px;top:-6px;width:16px;height:16px;box-sizing:border-box;border-radius:9999px;background:#dc2626;border:2px solid #fff;color:#fff;font:800 10px/12px system-ui,sans-serif;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.4)">!</span>`
    : '';
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:30px;height:37px;transform:translate(-50%,-100%)">
      <span style="position:absolute;inset:0 0 auto 0;width:30px;height:30px;box-sizing:border-box;background:${STATUS_HEX[status]};border:2.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 8px rgba(0,0,0,.45)"></span>
      ${PACKAGE_SVG}${badge}
    </div>`,
    iconSize: [0, 0],
    popupAnchor: [0, -36], // open above the pin, not over it
  });
}

const RS_ICON = pin('#0E56A8', 'RS');

/**
 * Sebaran paket: destination of each order matching the list filters (newest
 * 100), colored by status, plus the RS and the couriers' last positions.
 * Admin/Ops can assign a courier straight from a pin's popup.
 */
export default function OrdersMap({
  filters,
  tabs,
}: {
  filters: Omit<OrderFilters, 'page' | 'perPage'>;
  /** "Sebaran paket | Rute kurir" switch for Admin & Ops, in place of the title. */
  tabs?: ReactNode;
}) {
  const { user } = useAuth();
  const canAssign = hasRole(user, 'admin', 'ops');
  const [showFinished, setShowFinished] = useState(false);
  const [assigning, setAssigning] = useState<Order | null>(null);

  const { data, isLoading, isError } = useOrders({ ...filters, page: 1, perPage: MAP_LIMIT });
  const { data: couriers } = useCouriers({ enabled: canAssign });

  const orders = (data?.data ?? []).filter((o) => showFinished || filters.status || !FINISHED.includes(o.status));
  const placed = orders.flatMap((o) => {
    const point = pair(o.dropoff_lat, o.dropoff_lng);
    return point ? [{ order: o, point }] : [];
  });
  const unplaced = orders.length - placed.length;
  const waiting = placed.filter(({ order }) => !order.courier_id && ASSIGNABLE_STATUSES.includes(order.status)).length;

  // Every distinct RS point (pickup) among the orders.
  const rsPoints = new Map<string, { point: LatLng; name: string }>();
  for (const o of orders) {
    const point = pair(o.pickup_lat, o.pickup_lng) ?? pair(o.organization?.lat, o.organization?.lng);
    if (point) rsPoints.set(point.join(','), { point, name: o.organization?.name ?? 'RS' });
  }
  const activeCouriers = (couriers ?? []).flatMap((c) => {
    const point = pair(c.last_lat, c.last_lng);
    return c.is_active && point ? [{ courier: c, point }] : [];
  });

  const fitPoints = [...placed.map((p) => p.point), ...[...rsPoints.values()].map((r) => r.point)];
  const legend = (Object.keys(STATUS_HEX) as OrderStatus[]).filter(
    (s) => showFinished || filters.status === s || !FINISHED.includes(s),
  );

  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        {tabs}
        <div>
          {!tabs && <CardTitle>Sebaran paket</CardTitle>}
          <p className={tabs ? 'text-sm text-muted-foreground' : 'mt-1 text-sm text-muted-foreground'}>
            {placed.length} paket di peta
            {canAssign && waiting > 0 && ` · ${waiting} belum ada kurir`}
            {data && data.meta.total > MAP_LIMIT && ` · ${MAP_LIMIT} order terbaru`}
          </p>
        </div>
        {!filters.status && (
          <div className="flex items-center gap-2">
            <Switch id="show-finished" checked={showFinished} onCheckedChange={setShowFinished} />
            <Label htmlFor="show-finished" className="text-sm font-normal">
              Tampilkan selesai &amp; dibatalkan
            </Label>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="relative isolate z-0 h-96 overflow-hidden rounded-lg border lg:h-[28rem]">
          <MapContainer center={JAKARTA} zoom={11} scrollWheelZoom={false} className="size-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {[...rsPoints.values()].map((r) => (
              <Marker key={r.point.join(',')} position={r.point} icon={RS_ICON}>
                <Popup>
                  <b>{r.name}</b>
                  <br />
                  Titik pickup
                </Popup>
              </Marker>
            ))}
            {activeCouriers.map(({ courier, point }) => (
              <Marker
                key={`c${courier.id}`}
                position={point}
                icon={pin('#18186C', escapeHtml(courier.user?.name?.split(' ')[0] ?? 'Kurir'))}
              >
                <Popup>
                  <b>{courier.user?.name}</b>
                  <br />
                  Posisi terakhir kurir
                </Popup>
              </Marker>
            ))}
            {placed.map(({ order, point }) => {
              const assignable = canAssign && ASSIGNABLE_STATUSES.includes(order.status);
              return (
                <Marker
                  key={order.id}
                  position={point}
                  icon={orderIcon(order.status, !order.courier_id && ASSIGNABLE_STATUSES.includes(order.status))}
                >
                  <Popup minWidth={220}>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <Link to={`/orders/${order.id}`} className="font-semibold text-primary hover:underline">
                          {order.code}
                        </Link>
                        <StatusBadge status={order.status} />
                      </div>
                      <div>
                        <div className="font-medium">{order.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{order.dropoff_address}</div>
                      </div>
                      <div className="text-xs">
                        {order.service?.name ?? '—'} · {formatRupiah(order.price)}
                        <br />
                        Kurir: <b>{order.courier?.user?.name ?? 'belum ada'}</b>
                      </div>
                      {assignable && (
                        <Button size="sm" className="w-full" onClick={() => setAssigning(order)}>
                          <UserRoundPlusIcon />
                          {order.courier_id ? 'Ganti kurir' : 'Tugaskan kurir'}
                        </Button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            <FitToPoints points={fitPoints} />
            <AutoResize />
          </MapContainer>
          {isLoading && (
            <div className="absolute inset-0 z-[1000] grid place-items-center bg-background/60">
              <Loader label="Memuat peta…" />
            </div>
          )}
          {isError && (
            <div className="absolute inset-x-0 top-0 z-[1000] bg-destructive/10 px-3 py-1 text-xs text-destructive">
              Gagal memuat order untuk peta.
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {legend.map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span
                className="size-3 -rotate-45 rounded-[50%_50%_50%_0] shadow-sm"
                style={{ background: STATUS_HEX[s] }}
              />
              {ORDER_STATUS_LABELS[s]}
            </span>
          ))}
          {canAssign && (
            <span className="flex items-center gap-1.5">
              <span className="grid size-3.5 place-items-center rounded-full bg-red-600 text-[9px] leading-none font-extrabold text-white">
                !
              </span>
              Belum ada kurir
            </span>
          )}
        </div>
        {unplaced > 0 && (
          <p className="text-xs text-muted-foreground">
            {unplaced} order belum punya titik tujuan, jadi tidak tampil di peta — atur lewat &ldquo;Atur titik&rdquo; di
            detail order.
          </p>
        )}
      </CardContent>

      {assigning && (
        <AssignCourierDialog order={assigning} open onOpenChange={(open) => !open && setAssigning(null)} />
      )}
    </Card>
  );
}
