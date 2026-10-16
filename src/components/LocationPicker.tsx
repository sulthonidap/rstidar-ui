import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { ExternalLinkIcon, LoaderCircleIcon, LocateFixedIcon, MapPinIcon, SearchIcon, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiErrorMessage } from '@/lib/api';
import { isMapsLink, pointFromMapsLink } from '@/lib/geo';
import type { LatLng, PlaceResult } from '@/lib/geocode';
import { parseLatLng, searchPlaces } from '@/lib/geocode';
import { cn } from '@/lib/utils';

const JAKARTA: LatLng = [-6.2, 106.816666];

function pin(color: string, label: string) {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-100%)">
      <span style="background:${color};color:#fff;font:600 11px/1 system-ui,sans-serif;padding:4px 7px;border-radius:9999px;box-shadow:0 1px 4px rgba(0,0,0,.35);white-space:nowrap">${label}</span>
      <span style="width:2px;height:10px;background:${color}"></span>
      <span style="width:12px;height:12px;border-radius:9999px;background:${color};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4);margin-top:-2px"></span>
    </div>`,
    iconSize: [0, 0],
  });
}

/** Clicking the map moves the pin there. */
function PlaceOnClick({ onPlace }: { onPlace: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPlace([e.latlng.lat, e.latlng.lng]) });
  return null;
}

/** Re-frames the map when `target` changes: one point zoomed in, or both points in view. */
function Frame({ target, other }: { target: LatLng | null; other: LatLng | null }) {
  const map = useMap();
  const key = target ? target.join(',') : '';
  const otherKey = other ? other.join(',') : '';
  useEffect(() => {
    if (!key) return;
    const t = key.split(',').map(Number) as LatLng;
    if (otherKey) map.fitBounds([t, otherKey.split(',').map(Number) as LatLng], { padding: [40, 40], maxZoom: 17 });
    else map.setView(t, 17);
  }, [map, key, otherKey]);
  return null;
}

export interface LocationPickerProps {
  value: LatLng | null;
  onChange: (point: LatLng | null) => void;
  /** Prefilled search text. */
  initialQuery?: string;
  /** Pin label + color, e.g. "Lokasi RS" (blue) or "Tujuan" (orange). */
  pinLabel?: string;
  pinColor?: string;
  /** A fixed point shown for context (the RS). */
  reference?: { point: LatLng; label: string } | null;
  /** Distance text shown under the map, e.g. "10,5 km lewat jalan dari RS Sentosa". */
  distanceLabel?: string | null;
  /** Road route from the reference to the pin ([lat, lng] points), drawn instead of a straight line. */
  route?: LatLng[] | null;
  /** Show "Gunakan lokasi saya" (the device's GPS). */
  allowMyLocation?: boolean;
  placeholder?: string;
  /** Map box size, e.g. a taller map on the kiosk (default h-64). */
  mapClassName?: string;
  /** "lg": touch-sized, eye-catching search for the kiosk (big field, labelled, primary button). */
  size?: 'default' | 'lg';
}

/**
 * Pick an exact map point, all free: search a name/address (Nominatim), paste
 * coordinates or a Google Maps / WhatsApp location link, or use the device's
 * location — then click the map or drag the pin to fine-tune.
 */
export default function LocationPicker({
  value,
  onChange,
  initialQuery = '',
  pinLabel = 'Lokasi RS',
  pinColor = '#0E56A8',
  reference = null,
  distanceLabel = null,
  route = null,
  allowMyLocation = false,
  placeholder = 'Cari nama/alamat, tempel link Google Maps, atau koordinat -6.2253, 106.8331',
  mapClassName,
  size = 'default',
}: LocationPickerProps) {
  const lg = size === 'lg';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [busy, setBusy] = useState<'search' | 'gps' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<LatLng | null>(value);

  const set = (p: LatLng, frame = true) => {
    const rounded: LatLng = [Number(p[0].toFixed(7)), Number(p[1].toFixed(7))];
    onChange(rounded);
    if (frame) setFocus(rounded);
  };

  const search = async () => {
    setError(null);
    setResults(null);
    const text = query.trim();
    const coords = parseLatLng(text);
    if (coords) return set(coords);
    setBusy('search');
    try {
      if (isMapsLink(text)) {
        set(await pointFromMapsLink(text));
        return;
      }
      const found = await searchPlaces(text);
      setResults(found);
      if (found.length === 0) setError('Tidak ketemu. Coba kata lain, tempel link Google Maps, atau klik langsung di peta.');
    } catch (err) {
      setError(apiErrorMessage(err, 'Lokasi tidak bisa dibaca'));
    } finally {
      setBusy(null);
    }
  };

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setError('Perangkat ini tidak mendukung lokasi.');
      return;
    }
    setError(null);
    setBusy('gps');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(null);
        set([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        setBusy(null);
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Izin lokasi ditolak. Aktifkan izin lokasi di browser, atau cari/klik di peta.'
            : 'Lokasi tidak terbaca. Coba lagi di tempat terbuka, atau cari/klik di peta.',
        );
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const refIcon = reference ? pin('#64748B', reference.label) : null;

  return (
    <div className={lg ? 'space-y-3' : 'space-y-2'}>
      {lg && (
        <p className="flex items-center gap-2 text-lg font-bold text-slate-800">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <MapPinIcon className="size-4" />
          </span>
          Cari lokasi rumah, lalu geser pin ke titik yang tepat
        </p>
      )}
      <div className={cn('flex flex-wrap', lg ? 'gap-3' : 'gap-2')}>
        <div className="relative min-w-60 flex-1">
          <SearchIcon
            className={cn(
              'pointer-events-none absolute top-1/2 -translate-y-1/2',
              lg ? 'left-4 size-6 text-primary' : 'left-3 size-4 text-muted-foreground',
            )}
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault(); // don't submit the surrounding form
                void search();
              }
            }}
            placeholder={placeholder}
            className={cn(
              lg
                ? 'h-16 rounded-xl border-2 border-primary/50 bg-white pl-13 text-xl shadow-md focus-visible:border-primary md:text-xl'
                : 'pl-9',
            )}
          />
        </div>
        <Button
          type="button"
          variant={lg ? 'default' : 'outline'}
          onClick={() => void search()}
          disabled={!!busy || query.trim().length < 3}
          className={cn(lg && 'h-16 w-full rounded-xl px-8 text-lg font-bold sm:w-auto')}
        >
          {busy === 'search' ? <LoaderCircleIcon className="animate-spin" /> : lg ? (<><SearchIcon className="size-5" />Cari</>) : 'Cari'}
        </Button>
        {allowMyLocation && (
          <Button type="button" variant="outline" onClick={useMyLocation} disabled={!!busy}>
            {busy === 'gps' ? <LoaderCircleIcon className="animate-spin" /> : <LocateFixedIcon />}
            Lokasi saya
          </Button>
        )}
      </div>

      {error && <p className={cn('text-destructive', lg ? 'text-base' : 'text-xs')}>{error}</p>}
      {results && results.length > 0 && (
        <ul className={cn('overflow-y-auto rounded-md border', lg ? 'max-h-72 rounded-xl bg-white text-lg shadow-md' : 'max-h-40 text-sm')}>
          {results.map((r) => (
            <li key={r.label}>
              <button
                type="button"
                className={cn('w-full text-left hover:bg-muted', lg ? 'border-b px-4 py-3 last:border-b-0' : 'px-3 py-2')}
                onClick={() => {
                  set(r.point);
                  setResults(null);
                }}
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={cn('relative isolate z-0 h-64 overflow-hidden rounded-lg border', mapClassName)}>
        <MapContainer
          center={value ?? reference?.point ?? JAKARTA}
          zoom={value || reference ? 15 : 11}
          scrollWheelZoom
          className="size-full cursor-crosshair"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {reference && refIcon && <Marker position={reference.point} icon={refIcon} />}
          {reference && value && (route && route.length > 1 ? (
            // Follows the roads; outlined so it stays visible on busy map tiles.
            <>
              <Polyline positions={route} pathOptions={{ color: '#ffffff', weight: 7, opacity: 0.9 }} />
              <Polyline positions={route} pathOptions={{ color: '#0E56A8', weight: 4 }} />
            </>
          ) : (
            // No road route (yet, or the routing server is down): just connect the points.
            <Polyline positions={[reference.point, value]} pathOptions={{ color: '#18186C', weight: 2, dashArray: '6 8' }} />
          ))}
          {value && (
            <Marker
              position={value}
              icon={pin(pinColor, pinLabel)}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat, lng } = (e.target as L.Marker).getLatLng();
                  set([lat, lng], false);
                },
              }}
            />
          )}
          <PlaceOnClick onPlace={(p) => set(p, false)} />
          <Frame target={focus} other={reference?.point ?? null} />
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        {value ? (
          <>
            <span className={cn('flex flex-wrap items-center gap-x-3')}>
              <span className="font-mono">
                {value[0].toFixed(6)}, {value[1].toFixed(6)}
              </span>
              {distanceLabel && <span className="font-medium text-foreground">{distanceLabel}</span>}
            </span>
            <span className="flex gap-3">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${value[0]},${value[1]}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLinkIcon className="size-3" />
                Cek di Google Maps
              </a>
              <button
                type="button"
                className="inline-flex items-center gap-1 hover:text-destructive"
                onClick={() => onChange(null)}
              >
                <XIcon className="size-3" />
                Hapus titik
              </button>
            </span>
          </>
        ) : (
          <span>Belum ada titik (opsional). Cari lokasinya, tempel link, atau klik langsung di peta.</span>
        )}
      </div>
    </div>
  );
}
