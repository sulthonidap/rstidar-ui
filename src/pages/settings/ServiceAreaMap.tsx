import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet';

import Loader from '@/components/Loader';
import { useRegionMap, type RegionOutline } from '@/features/regions/queries';

const SERVED = { color: '#0E56A8', weight: 1, fillColor: '#0E56A8', fillOpacity: 0.3 };
const NOT_SERVED = { color: '#94a3b8', weight: 1, fillColor: '#94a3b8', fillOpacity: 0.12 };

const served = (codes: string[], code: string) => codes.some((c) => code === c || code.startsWith(c + '.'));

/** Zooms to the outlines once they're loaded. */
function FitOutlines({ outlines }: { outlines: RegionOutline[] }) {
  const map = useMap();
  useEffect(() => {
    const points = outlines.flatMap((o) => o.rings.flat());
    if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [12, 12] });
  }, [map, outlines]);
  return null;
}

/**
 * The kelurahan/desa outlines, the served ones in blue. `codes` is the area as
 * edited on the page (not yet saved), so a pick shows on the map right away.
 */
export default function ServiceAreaMap({ codes }: { codes: string[] }) {
  const { data: outlines, isLoading, isError } = useRegionMap();

  if (isLoading) return <Loader label="Memuat peta wilayah…" />;
  if (isError || !outlines) return <p className="text-sm text-destructive">Peta wilayah gagal dimuat.</p>;
  if (outlines.length === 0) return <p className="text-sm text-muted-foreground">Belum ada data batas wilayah.</p>;

  return (
    <div className="space-y-2">
      <div className="relative isolate z-0 h-96 overflow-hidden rounded-lg border">
        <MapContainer center={[-7.48, 110.22]} zoom={11} scrollWheelZoom className="size-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {outlines.map((o) => (
            <Polygon key={o.code} positions={o.rings} pathOptions={served(codes, o.code) ? SERVED : NOT_SERVED}>
              <Tooltip sticky>
                {o.code.split('.')[3]?.startsWith('1') ? 'Kel.' : 'Desa'} {o.name}, Kec. {o.district}
              </Tooltip>
            </Polygon>
          ))}
          <FitOutlines outlines={outlines} />
        </MapContainer>
      </div>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-[#0E56A8] bg-[#0E56A8]/30" /> Dilayani
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-slate-400 bg-slate-400/15" /> Tidak dilayani
        </span>
        <span>Titik lokasi pasien harus berada di area biru.</span>
      </p>
    </div>
  );
}
