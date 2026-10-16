import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { MapPinnedIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';

import Loader from '@/components/Loader';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSaveCoordinates } from '@/features/orders/queries';
import { useQuote } from '@/features/public/queries';
import { apiErrorMessage } from '@/lib/api';
import type { LatLng } from '@/lib/geocode';
import { useGeoPoint } from '@/lib/geocode';
import { cn } from '@/lib/utils';
import type { Order } from '@/types/models';

const JAKARTA: LatLng = [-6.2, 106.816666];

/** Colored pin built from HTML, so no marker image assets are needed. */
function pin(color: string, label: string) {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-100%)">
      <span style="background:${color};color:#fff;font:600 11px/1 system-ui,sans-serif;padding:4px 7px;border-radius:9999px;box-shadow:0 1px 4px rgba(0,0,0,.35);white-space:nowrap">${label}</span>
      <span style="width:2px;height:10px;background:${color}"></span>
      <span style="width:10px;height:10px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);margin-top:-2px"></span>
    </div>`,
    iconSize: [0, 0],
  });
}

const PICKUP_ICON = pin('#0E56A8', 'Pickup');
const DROPOFF_ICON = pin('#F07A22', 'Tujuan');
const COURIER_ICON = pin('#18186C', 'Kurir');
const DELIVERED_ICON = pin('#059669', 'Diterima');

type Which = 'pickup' | 'dropoff';

const pair = (lat?: number | null, lng?: number | null): LatLng | null =>
  lat != null && lng != null ? [lat, lng] : null;

/** Redraws tiles when the map box changes size (sidebar toggle, window resize). */
function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

/** Keeps every marker in view whenever the set of points changes. */
function FitToPoints({ points }: { points: LatLng[] }) {
  const map = useMap();
  const key = JSON.stringify(points);
  useEffect(() => {
    const pts = JSON.parse(key) as LatLng[];
    if (pts.length === 1) map.setView(pts[0], 15);
    else if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 16 });
  }, [map, key]);
  return null;
}

/** In edit mode, a click on the map moves the selected pin there. */
function PlaceOnClick({ onPlace }: { onPlace: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPlace([e.latlng.lat, e.latlng.lng]) });
  return null;
}

/**
 * Pickup & destination on a map. Points come from the saved coordinates, else
 * from searching the address. With `editable`, staff can fix a point by hand
 * ("Atur titik": pick Pickup/Tujuan, click the map or drag the pin, save).
 */
export default function OrderMap({
  order,
  editable = false,
  fill = false,
}: {
  order: Order;
  editable?: boolean;
  /** Grow to fill the parent's remaining height (parent must be a flex column). */
  fill?: boolean;
}) {
  const org = order.organization;
  // The order's own point, else the RS point set by the admin.
  const savedPickup = pair(order.pickup_lat, order.pickup_lng) ?? pair(org?.lat, org?.lng);
  const savedDropoff = pair(order.dropoff_lat, order.dropoff_lng);
  // Pickup addresses are often just "Farmasi Lt. 1", so fall back to the RS itself.
  const pickup = useGeoPoint(savedPickup, [
    [order.pickup_address, org?.address].filter(Boolean).join(', '),
    org?.address ?? '',
    org?.name ?? '',
  ]);
  const dropoff = useGeoPoint(savedDropoff, [order.dropoff_address]);
  const courier = pair(order.courier?.last_lat, order.courier?.last_lng);
  // Where the courier handed the package over (GPS from the proof of delivery).
  const delivered = pair(order.delivery?.lat, order.delivery?.lng);

  const save = useSaveCoordinates(order.id);

  // Road route between the two points (from the routing server, cached there).
  const routeQuote = useQuote(
    pickup.point && dropoff.point
      ? {
          service_id: order.service_id ?? undefined,
          pickup_lat: pickup.point[0],
          pickup_lng: pickup.point[1],
          dropoff_lat: dropoff.point[0],
          dropoff_lng: dropoff.point[1],
        }
      : null,
  );
  const route = routeQuote.data?.route;
  const [editing, setEditing] = useState(false);
  const [active, setActive] = useState<Which>('dropoff');
  // Points moved by hand in this edit session (untouched ones aren't saved).
  const [draft, setDraft] = useState<Partial<Record<Which, LatLng>>>({});

  const shownPickup = draft.pickup ?? pickup.point;
  const shownDropoff = draft.dropoff ?? dropoff.point;
  const place = (which: Which, p: LatLng) => setDraft((d) => ({ ...d, [which]: p }));

  const startEditing = () => {
    setDraft({});
    setActive(!dropoff.point || dropoff.estimated ? 'dropoff' : 'pickup');
    setEditing(true);
  };
  const saveDraft = async () => {
    const p = draft.pickup ?? savedPickup;
    const d = draft.dropoff ?? savedDropoff;
    try {
      await save.mutateAsync({
        pickup_lat: p?.[0] ?? null,
        pickup_lng: p?.[1] ?? null,
        dropoff_lat: d?.[0] ?? null,
        dropoff_lng: d?.[1] ?? null,
      });
      setEditing(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Gagal menyimpan titik'));
    }
  };

  // Don't re-fit the view on every drag while editing.
  const [fitPoints, setFitPoints] = useState<LatLng[]>([]);
  const points = [pickup.point, dropoff.point, delivered ?? courier].filter((p): p is LatLng => p !== null);
  if (!editing && JSON.stringify(points) !== JSON.stringify(fitPoints)) setFitPoints(points);

  const loading = pickup.isLoading || dropoff.isLoading;
  const missing = [
    !pickup.point && !pickup.isLoading && 'pickup',
    !dropoff.point && !dropoff.isLoading && 'tujuan',
  ].filter(Boolean);
  const confirmed = [savedPickup && 'pickup', savedDropoff && 'tujuan'].filter(Boolean);
  const estimated = [pickup.estimated && pickup.point && 'pickup', dropoff.estimated && dropoff.point && 'tujuan'].filter(Boolean);

  const dragHandlers = (which: Which) => ({
    dragend: (e: L.DragEndEvent) => {
      const { lat, lng } = (e.target as L.Marker).getLatLng();
      place(which, [lat, lng]);
    },
  });

  return (
    <div className="flex flex-1 flex-col gap-2">
      {editing && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={active}
            onValueChange={(v) => v && setActive(v as Which)}
          >
            <ToggleGroupItem value="pickup" className="px-3 data-[state=on]:bg-brand-blue data-[state=on]:text-white">
              Pickup
            </ToggleGroupItem>
            <ToggleGroupItem value="dropoff" className="px-3 data-[state=on]:bg-brand-orange data-[state=on]:text-white">
              Tujuan
            </ToggleGroupItem>
          </ToggleGroup>
          <span className="text-xs text-muted-foreground">Klik peta atau geser pin untuk memindahkan titik.</span>
          <div className="ms-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={save.isPending}>
              Batal
            </Button>
            <Button size="sm" onClick={saveDraft} disabled={save.isPending || Object.keys(draft).length === 0}>
              {save.isPending ? 'Menyimpan…' : 'Simpan titik'}
            </Button>
          </div>
        </div>
      )}

      <div
        className={cn(
          'relative isolate z-0 overflow-hidden rounded-lg border',
          fill ? 'min-h-80 flex-1' : 'h-80 lg:h-96',
        )}
      >
        <MapContainer
          center={JAKARTA}
          zoom={11}
          scrollWheelZoom={editing}
          className={editing ? 'size-full cursor-crosshair' : 'size-full'}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {shownPickup && (
            <Marker
              position={shownPickup}
              icon={PICKUP_ICON}
              draggable={editing}
              eventHandlers={editing ? dragHandlers('pickup') : undefined}
            >
              <Popup>
                <b>Pickup</b>
                <br />
                {order.pickup_address}
                {org && <> — {org.name}</>}
              </Popup>
            </Marker>
          )}
          {shownDropoff && (
            <Marker
              position={shownDropoff}
              icon={DROPOFF_ICON}
              draggable={editing}
              eventHandlers={editing ? dragHandlers('dropoff') : undefined}
            >
              <Popup>
                <b>Tujuan</b>
                <br />
                {order.dropoff_address}
              </Popup>
            </Marker>
          )}
          {delivered && !editing && (
            <Marker position={delivered} icon={DELIVERED_ICON}>
              <Popup>
                <b>Lokasi serah terima</b>
                <br />
                Diterima oleh {order.delivery?.receiver_name}
              </Popup>
            </Marker>
          )}
          {courier && !delivered && !editing && (
            <Marker position={courier} icon={COURIER_ICON}>
              <Popup>
                <b>Posisi terakhir kurir</b>
                <br />
                {order.courier?.user?.name}
              </Popup>
            </Marker>
          )}
          {shownPickup && shownDropoff && (!editing && route && route.length > 1 ? (
            // Follows the roads; outlined so it stays visible on busy map tiles.
            <>
              <Polyline positions={route} pathOptions={{ color: '#ffffff', weight: 7, opacity: 0.9 }} />
              <Polyline positions={route} pathOptions={{ color: '#0E56A8', weight: 4 }} />
            </>
          ) : (
            // While moving pins, or without a road route: just connect the points.
            <Polyline positions={[shownPickup, shownDropoff]} pathOptions={{ color: '#18186C', weight: 3, dashArray: '6 8' }} />
          ))}
          {editing && <PlaceOnClick onPlace={(p) => place(active, p)} />}
          <FitToPoints points={fitPoints} />
          <AutoResize />
        </MapContainer>
        {loading && (
          <div className="absolute inset-x-0 top-0 z-[1000] flex items-center gap-2 bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <Loader compact size={0.4} className="w-8" label="Mencari lokasi dari alamat…" />
            Mencari lokasi dari alamat…
          </div>
        )}
        {editable && !editing && (
          <Button
            size="sm"
            variant="outline"
            className="absolute top-2 right-2 z-[1000] bg-card/95 shadow-sm backdrop-blur"
            onClick={startEditing}
          >
            <MapPinnedIcon />
            Atur titik
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {missing.length > 0 && `Lokasi ${missing.join(' & ')} tidak ditemukan dari alamatnya. `}
        {confirmed.length > 0 && `Titik ${confirmed.join(' & ')} sudah dipastikan petugas. `}
        {estimated.length > 0 &&
          `Titik ${estimated.join(' & ')} diperkirakan dari alamat (OpenStreetMap), bisa meleset${editable ? ' — betulkan lewat "Atur titik"' : ''}.`}
      </p>
    </div>
  );
}
