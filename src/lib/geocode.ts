import { useQuery } from '@tanstack/react-query';

export type LatLng = [number, number];

/**
 * Address → coordinates via OpenStreetMap Nominatim.
 * Usage policy: at most 1 request/second and cache results, so requests go
 * through a single queue and answers (including "not found") are cached in
 * localStorage. https://operations.osmfoundation.org/policies/nominatim/
 */
const CACHE_KEY = 'medsend_geocode_v1';
const MIN_INTERVAL_MS = 1100;

function readCache(): Record<string, LatLng | null> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function writeCache(key: string, value: LatLng | null) {
  try {
    const cache = readCache();
    cache[key] = value;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full/blocked: just skip caching.
  }
}

let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
    return fn();
  });
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Nominatim misses common Indonesian abbreviations ("Jl. Diponegoro" fails,
 * "Jalan Diponegoro" works; "RS X" matches the wrong hospital, "Rumah Sakit X"
 * the right one), so expand them and drop floor numbers before searching.
 */
export function normalizeAddress(address: string): string {
  return address
    .replace(/\b(?:Jl|Jln)\.?\s+/gi, 'Jalan ')
    .replace(/\bGg\.?\s+/gi, 'Gang ')
    .replace(/\bRS(?:U|UD|UP|UPN|IA|B)?\.?\s+/g, 'Rumah Sakit ')
    .replace(/\bKec\.?\s+/gi, 'Kecamatan ')
    .replace(/\bKel\.?\s+/gi, 'Kelurahan ')
    .replace(/\b(?:Lt|Lantai)\.?\s*\d+\b/gi, '')
    .replace(/\s+,/g, ',')
    .replace(/\s*,\s*(?=,|$)/g, '')
    .replace(/^\s*,\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function geocodeOne(rawQuery: string): Promise<LatLng | null> {
  const query = normalizeAddress(rawQuery);
  if (query.length < 3) return null;
  const key = query.toLowerCase();
  const cache = readCache();
  if (key in cache) return cache[key];

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ q: query, format: 'jsonv2', limit: '1', countrycodes: 'id' }).toString();
  const res = await throttled(() => fetch(url, { headers: { 'Accept-Language': 'id' } }));
  if (!res.ok) throw new Error(`Geocoding gagal (${res.status})`);

  const [hit] = (await res.json()) as { lat: string; lon: string }[];
  const result: LatLng | null = hit ? [Number(hit.lat), Number(hit.lon)] : null;
  writeCache(key, result);
  return result;
}

/** Tries each candidate address in order; returns the first that resolves. */
export async function geocodeFirst(candidates: string[]): Promise<LatLng | null> {
  for (const q of candidates) {
    const hit = await geocodeOne(q);
    if (hit) return hit;
  }
  return null;
}

/**
 * Coordinates for a place: the stored lat/lng when present, otherwise the first
 * of `candidates` that Nominatim can find. `estimated` is true for geocoded points.
 */
export function useGeoPoint(stored: LatLng | null, candidates: string[]) {
  const usable = candidates.map((c) => c.trim()).filter((c) => c.length >= 3);
  const query = useQuery({
    queryKey: ['geocode', usable],
    queryFn: () => geocodeFirst(usable),
    enabled: !stored && usable.length > 0,
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    retry: false,
  });

  if (stored) return { point: stored, estimated: false, isLoading: false, isError: false };
  return {
    point: query.data ?? null,
    estimated: true,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export interface PlaceResult {
  label: string;
  point: LatLng;
}

/** "−6.2253, 106.8331" (e.g. copied from Google Maps) → point; null if it isn't coordinates. */
export function parseLatLng(text: string): LatLng | null {
  const m = text.trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lat, lng];
}

/**
 * Up to 5 places in Indonesia matching `query` (Nominatim, through the same
 * 1 request/second queue). Meant for an explicit "Cari" click — Nominatim's
 * policy forbids search-as-you-type.
 */
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const q = normalizeAddress(query);
  if (q.length < 3) return [];
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ q, format: 'jsonv2', limit: '5', countrycodes: 'id' }).toString();
  const res = await throttled(() => fetch(url, { headers: { 'Accept-Language': 'id' } }));
  if (!res.ok) throw new Error(`Pencarian lokasi gagal (${res.status})`);
  const hits = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  return hits.map((h) => ({ label: h.display_name, point: [Number(h.lat), Number(h.lon)] }));
}
