import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { Fragment, useState } from 'react';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import { Link } from 'react-router';

import Loader from '@/components/Loader';
import { AutoResize, FitToPoints } from '@/components/map/MapHelpers';
import StatusBadge from '@/components/StatusBadge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { CourierRoute, CourierRouteStop } from '@/features/couriers/queries';
import { useCourierRoutes } from '@/features/couriers/queries';
import type { LatLng } from '@/lib/geocode';
import { escapeHtml, pair, pin } from '@/lib/map-icons';
import { toDateParam } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { MapView } from '@/pages/orders/MapViewTabs';
import MapViewTabs from '@/pages/orders/MapViewTabs';

const JAKARTA: LatLng = [-6.2, 106.816666];
/** One color per route (courier), in the order they set off. */
const ROUTE_COLORS = ['#0E56A8', '#E0650F', '#7C3AED', '#059669', '#DB2777', '#0891B2', '#CA8A04', '#475569'];
const DONE_HEX = '#10b981';
const CANCELLED_HEX = '#94a3b8';
/** Handed over farther than this from the destination: shown with a dashed line. */
const FAR_M = 150;

const time = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

/** Numbered stop marker: route color while waiting, green once handed over, grey if cancelled. */
function stopIcon(stop: CourierRouteStop, color: string) {
  const fill = stop.status === 'done' ? DONE_HEX : stop.status === 'cancelled' ? CANCELLED_HEX : color;
  const label = stop.status === 'done' ? '✓' : stop.status === 'cancelled' ? '✕' : String(stop.seq);
  return L.divIcon({
    className: '',
    html: `<div style="transform:translate(-50%,-50%)">
      <span style="display:grid;place-items:center;width:26px;height:26px;box-sizing:border-box;border-radius:9999px;background:${fill};border:2.5px solid #fff;color:#fff;font:800 12px/1 system-ui,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.4)">${label}</span>
    </div>`,
    iconSize: [0, 0],
    popupAnchor: [0, -14],
  });
}

function offText(m: number) {
  return m >= 1000 ? `${(m / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} km` : `${m} m`;
}

/**
 * Rute kurir: each courier's planned delivery order for the chosen day (saved
 * from "Urutan antar" in the courier app), drawn along the roads, with each
 * package's status and where it was really handed over (proof-of-delivery GPS).
 */
export default function CourierRoutesMap({ view, onViewChange }: { view: MapView; onViewChange: (v: MapView) => void }) {
  const [date, setDate] = useState(() => toDateParam(new Date())!);
  const [selected, setSelected] = useState<number | null>(null);
  const { data, isLoading, isError } = useCourierRoutes(date);

  const routes = data?.routes ?? [];
  const colorOf = (r: CourierRoute) => ROUTE_COLORS[routes.indexOf(r) % ROUTE_COLORS.length];
  const focus = routes.find((r) => r.id === selected) ?? null;
  const shown = focus ? [focus] : routes;
  const fitPoints = shown.flatMap((r) => r.path);
  const anyEstimate = routes.some((r) => r.path_source === 'estimate');

  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <MapViewTabs value={view} onChange={onViewChange} />
        <p className="text-sm text-muted-foreground">
          {routes.length} rute · urutan antar yang disimpan kurir dari aplikasinya
        </p>
        <Input
          type="date"
          value={date}
          max={toDateParam(new Date())}
          onChange={(e) => {
            if (e.target.value) setDate(e.target.value);
            setSelected(null);
          }}
          className="w-auto"
          aria-label="Tanggal rute"
        />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid gap-3 lg:grid-cols-[16rem_1fr]">
          <ul className="flex max-h-[28rem] flex-col gap-1.5 overflow-y-auto lg:pr-1">
            {routes.length === 0 && !isLoading && (
              <li className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Belum ada rute di tanggal ini. Rute muncul setelah kurir menekan "Simpan rute" di layar Urutan antar.
              </li>
            )}
            {routes.map((r) => {
              const active = selected === r.id;
              const finished = !!r.finished_at;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(active ? null : r.id)}
                    className={cn(
                      'w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/60',
                      active && 'border-primary bg-primary/5 ring-1 ring-primary/30',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="size-3 shrink-0 rounded-full" style={{ background: colorOf(r) }} />
                      <span className="min-w-0 flex-1 truncate font-medium">{r.courier || 'Kurir'}</span>
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                          finished ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-orange/10 text-brand-orange',
                        )}
                      >
                        {finished ? 'Selesai' : 'Berjalan'}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${r.stops.length ? (r.done / r.stops.length) * 100 : 0}%`, background: DONE_HEX }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {r.done}/{r.stops.length} diserahkan · ± {r.km.toLocaleString('id-ID')} km · mulai {time(r.started_at)}
                      {r.finished_at && ` · selesai ${time(r.finished_at)}`}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="relative isolate z-0 h-96 overflow-hidden rounded-lg border lg:h-[28rem]">
            <MapContainer center={JAKARTA} zoom={11} scrollWheelZoom={false} className="size-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {/* With a courier picked in the list, only their route is drawn. */}
              {shown.map((r) => (
                <RouteLayer key={r.id} route={r} color={colorOf(r)} />
              ))}
              <FitToPoints points={fitPoints} />
              <AutoResize />
            </MapContainer>
            {isLoading && (
              <div className="absolute inset-0 z-[1000] grid place-items-center bg-background/60">
                <Loader label="Memuat rute…" />
              </div>
            )}
            {isError && (
              <div className="absolute inset-x-0 top-0 z-[1000] bg-destructive/10 px-3 py-1 text-xs text-destructive">
                Gagal memuat rute kurir.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="grid size-4 place-items-center rounded-full bg-[#0E56A8] text-[9px] font-extrabold text-white">1</span>
            Urutan antar (belum diserahkan)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="grid size-4 place-items-center rounded-full text-[9px] font-extrabold text-white" style={{ background: DONE_HEX }}>
              ✓
            </span>
            Sudah diserahkan
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-full border-2 border-slate-700 bg-white" />
            Titik serah aktual (GPS kurir)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 border-t-2 border-dashed border-rose-500" />
            Diserahkan &gt; {FAR_M} m dari tujuan
          </span>
          {anyEstimate && <span>· Sebagian garis lurus (server rute belum diatur)</span>}
        </div>
      </CardContent>
    </Card>
  );
}

/** One route on the map: its line, a numbered marker per stop, and the actual handover points. */
function RouteLayer({ route, color }: { route: CourierRoute; color: string }) {
  const start = route.start;
  return (
    <>
      {route.path.length > 1 && (
        <Polyline positions={route.path} pathOptions={{ color, weight: 5, opacity: 0.8 }} />
      )}
      {start && (
        <Marker
          position={start}
          icon={pin(route.start_from === 'rs' ? '#0E56A8' : color, route.start_from === 'rs' ? 'RS' : escapeHtml(route.courier.split(' ')[0] || 'Kurir'))}
        >
          <Popup>
            <b>{route.courier}</b>
            <br />
            {route.start_from === 'rs' ? 'Berangkat dari RS' : `Posisi saat berangkat · ${time(route.started_at)}`}
          </Popup>
        </Marker>
      )}
      {route.stops.map((s) => {
        const point = pair(s.lat, s.lng);
        const actual = pair(s.delivered_lat, s.delivered_lng);
        const far = s.off_by_m != null && s.off_by_m > FAR_M;
        return (
          <Fragment key={s.order_id}>
            {point && (
              <Marker position={point} icon={stopIcon(s, color)}>
                <Popup minWidth={220}>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <Link to={`/orders/${s.order_id}`} className="font-semibold text-primary hover:underline">
                        #{s.seq} · {s.code}
                      </Link>
                      <StatusBadge status={s.status} />
                    </div>
                    <div>
                      <div className="font-medium">{s.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{s.dropoff_address}</div>
                    </div>
                    <div className="text-xs">
                      Kurir: <b>{route.courier}</b>
                      {s.delivered_at && (
                        <>
                          <br />
                          Diserahkan {time(s.delivered_at)}
                          {s.off_by_m != null && (
                            <span className={cn(far && 'font-semibold text-rose-600')}>
                              {' '}
                              · {offText(s.off_by_m)} dari titik tujuan
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}
            {actual && (
              <CircleMarker
                center={actual}
                radius={5}
                pathOptions={{ color: '#334155', weight: 2, fillColor: '#fff', fillOpacity: 1 }}
              >
                <Popup>
                  <b>{s.code}</b> diserahkan di sini
                  {s.delivered_at && ` · ${time(s.delivered_at)}`}
                </Popup>
              </CircleMarker>
            )}
            {actual && point && far && (
              <Polyline positions={[point, actual]} pathOptions={{ color: '#f43f5e', weight: 2, dashArray: '6 6' }} />
            )}
          </Fragment>
        );
      })}
    </>
  );
}
