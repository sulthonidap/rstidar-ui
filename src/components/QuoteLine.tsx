import { BadgeCheckIcon, BanIcon, LoaderCircleIcon, WalletIcon } from 'lucide-react';

import type { Quote } from '@/features/public/queries';
import { formatRupiah } from '@/lib/format';

/** 42.3 → "42,3". */
export function formatKm(km: number | null | undefined) {
  return (km ?? 0).toLocaleString('id-ID', { maximumFractionDigits: 1 });
}

/** "1,2 km lewat jalan" / "± 1,2 km (perkiraan)" for a quote or an order. */
export function distanceText(km: number | null | undefined, source: 'road' | 'estimate' | null | undefined) {
  if (km == null) return null;
  const n = formatKm(km);
  return source === 'estimate' ? `± ${n} km (perkiraan)` : `${n} km lewat jalan`;
}

/**
 * The price estimate under an order form: distance-based when the destination
 * point is set, else the service's base price (with a hint to set the point).
 */
export default function QuoteLine({
  quote,
  loading,
  free,
}: {
  quote: Quote | undefined;
  loading: boolean;
  /** Program ongkir gratis: the patient pays nothing. */
  free?: boolean;
}) {
  if (!quote) {
    return loading ? (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircleIcon className="size-4 animate-spin" /> Menghitung biaya…
      </p>
    ) : null;
  }
  const dist = distanceText(quote.distance_km, quote.distance_source);
  if (quote.out_of_range) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
        <BanIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="text-sm">
          <p className="font-medium text-destructive">Mohon maaf, area Anda belum terjangkau layanan kami</p>
          <p className="text-xs text-muted-foreground">
            {quote.distance_km != null ? `${formatKm(quote.distance_km)} km — ` : ''}maksimal {formatKm(quote.max_distance_km)} km.
          </p>
        </div>
      </div>
    );
  }
  if (free) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
        <BadgeCheckIcon className="mt-0.5 size-4 shrink-0" />
        <p className="text-sm">
          Biaya <span className="font-semibold">Gratis</span>
          <span className="text-muted-foreground">
            {' '}
            · normal <span className="line-through">{formatRupiah(quote.price)}</span>
            {dist && ` · ${dist}`}
          </span>
          {loading && <LoaderCircleIcon className="ms-2 inline size-3.5 animate-spin text-muted-foreground" />}
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
      <WalletIcon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="text-sm">
        <p>
          {quote.tiered && dist ? 'Estimasi biaya' : 'Biaya'} <span className="font-semibold">{formatRupiah(quote.price)}</span>
          {dist && <span className="text-muted-foreground"> · {dist}</span>}
          {loading && <LoaderCircleIcon className="ms-2 inline size-3.5 animate-spin text-muted-foreground" />}
        </p>
        {quote.tiered && !dist && (
          <p className="text-xs text-muted-foreground">
            Harga dasar. Isi titik lokasi tujuan supaya biaya dihitung sesuai jarak.
          </p>
        )}
      </div>
    </div>
  );
}
