import { api } from '@/lib/api';
import type { LatLng } from '@/lib/geocode';
import type { Order } from '@/types/models';

/** Straight-line distance in km between two points (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "± 4,2 km" (or "± 850 m" when close). */
export function formatKm(km: number): string {
  if (km < 1) return `± ${Math.round(km * 1000)} m`;
  return `± ${km.toLocaleString('id-ID', { maximumFractionDigits: 1 })} km`;
}

/** RS → destination road distance of an order (km), as measured when it was priced. */
export function orderDistanceKm(order: Order): number | null {
  return order.distance_km ?? null;
}

const LINK_PATTERNS = [
  /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/,
  /[?&](?:q|query|ll|destination|center)=(-?\d{1,2}\.\d+)(?:,|%2C)\s*(-?\d{1,3}\.\d+)/,
  /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/,
];

/** True for a Google Maps link, e.g. from "Share" in Maps or a WhatsApp location. */
export function isMapsLink(text: string): boolean {
  return /^https?:\/\/(?:[\w-]+\.)*(?:google\.[a-z.]+|goo\.gl)\//i.test(text.trim());
}

/**
 * Coordinates of a Google Maps link: read from the URL when they're in it,
 * otherwise (short maps.app.goo.gl links) resolved by the API.
 */
export async function pointFromMapsLink(link: string): Promise<LatLng> {
  let text = link.trim();
  try {
    text = decodeURIComponent(text);
  } catch {
    // keep as is
  }
  for (const re of LINK_PATTERNS) {
    const m = text.match(re);
    if (m) return [Number(m[1]), Number(m[2])];
  }
  const { data } = await api.get<{ data: { lat: number; lng: number } }>('/public/maps-link', {
    params: { url: link.trim() },
  });
  return [data.data.lat, data.data.lng];
}
