import L from 'leaflet';

import type { LatLng } from '@/lib/geocode';

/** Labeled pin (RS / kurir), same style as OrderMap. */
export function pin(color: string, label: string) {
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

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export const pair = (lat?: number | null, lng?: number | null): LatLng | null =>
  lat != null && lng != null ? [lat, lng] : null;
