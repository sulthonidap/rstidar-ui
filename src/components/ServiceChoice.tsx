import { CheckIcon } from 'lucide-react';

import type { Quote } from '@/features/public/queries';
import { formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Service } from '@/types/models';

/**
 * Service picker as cards, each with its price for this order: priced by
 * distance once the destination point is known, else the base price
 * ("mulai …" for distance-priced services).
 */
export default function ServiceChoice({
  services,
  quote,
  value,
  onChange,
  invalid,
  size = 'default',
  free,
}: {
  services: Service[] | undefined;
  quote: Quote | undefined;
  value: string;
  onChange: (serviceId: string) => void;
  invalid?: boolean;
  /** lg: big touch cards for the kiosk. */
  size?: 'default' | 'lg';
  /** Program ongkir gratis: show "Gratis" with the tariff struck through. */
  free?: boolean;
}) {
  const lg = size === 'lg';
  const hasDistance = quote?.distance_km != null;
  if (services?.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Belum ada tipe layanan aktif.</p>
    );
  }
  return (
    <div role="radiogroup" aria-label="Tipe layanan" className={cn('grid gap-2 sm:grid-cols-3', lg && 'gap-4 sm:grid-cols-2')}>
      {services?.map((s) => {
        const q = quote?.services?.find((x) => x.service_id === s.id);
        const tiered = (s.tiers?.length ?? 0) > 0;
        const price = q?.price ?? s.price_base;
        const selected = value === String(s.id);
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(String(s.id))}
            className={cn(
              'relative flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors hover:border-primary/50',
              lg && 'gap-2 rounded-2xl border-2 p-6',
              selected && 'border-primary bg-primary/5 ring-1 ring-primary',
              invalid && !value && 'border-destructive',
            )}
          >
            {selected && (
              <span
                className={cn(
                  'absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground',
                  lg && 'top-4 right-4 size-8',
                )}
              >
                <CheckIcon className={cn('size-3.5', lg && 'size-5')} />
              </span>
            )}
            <span className={cn('font-medium', lg && 'text-2xl font-bold')}>{s.name}</span>
            {free ? (
              <span className="text-base font-semibold text-emerald-700 dark:text-emerald-400">
                Gratis{' '}
                <span className="text-xs font-normal text-muted-foreground line-through">{formatRupiah(price)}</span>
              </span>
            ) : (
              <span className={cn('text-base font-semibold text-primary', lg && 'text-3xl font-extrabold')}>
                {tiered && !hasDistance && (
                  <span className={cn('text-xs font-normal text-muted-foreground', lg && 'text-base')}>mulai </span>
                )}
                {formatRupiah(price)}
              </span>
            )}
            {s.description && <span className={cn('text-xs text-muted-foreground', lg && 'text-base')}>{s.description}</span>}
          </button>
        );
      })}
    </div>
  );
}
