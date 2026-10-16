import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

import type { LatLng } from '@/lib/geocode';

/** Redraws tiles when the map box changes size (sidebar toggle, window resize). */
export function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

/** Fits the view to the points whenever the set of points changes. */
export function FitToPoints({ points }: { points: LatLng[] }) {
  const map = useMap();
  const key = JSON.stringify(points);
  useEffect(() => {
    const pts = JSON.parse(key) as LatLng[];
    if (pts.length === 1) map.setView(pts[0], 14);
    else if (pts.length > 1) map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
  }, [map, key]);
  return null;
}
