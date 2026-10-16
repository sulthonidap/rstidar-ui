import { BanknoteIcon, CheckIcon, QrCodeIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { PaymentMethod } from '@/types/models';

const OPTIONS: { value: PaymentMethod; title: string; text: string; icon: typeof BanknoteIcon }[] = [
  {
    value: 'cash',
    title: 'Tunai',
    text: 'Bayar di kasir RS sebelum obat diambil petugas.',
    icon: BanknoteIcon,
  },
  {
    value: 'noncash',
    title: 'Non-tunai',
    text: 'Transfer bank atau QRIS. Obat dikirim setelah petugas RS memastikan pembayaran masuk.',
    icon: QrCodeIcon,
  },
];

/** Payment method picker for the order forms. */
export default function PaymentChoice({
  value,
  onChange,
  invalid,
  size = 'default',
}: {
  value: string;
  onChange: (method: PaymentMethod) => void;
  invalid?: boolean;
  /** lg: big touch cards for the kiosk. */
  size?: 'default' | 'lg';
}) {
  const lg = size === 'lg';
  return (
    // lg stacks the options as full-width rows: side by side they get squeezed
    // in a kiosk column ("Non-" / "tunai", a thin column of text).
    <div role="radiogroup" aria-label="Metode pembayaran" className={cn('grid gap-2', lg ? 'gap-4' : 'sm:grid-cols-2')}>
      {OPTIONS.map(({ value: v, title, text, icon: Icon }) => {
        const selected = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(v)}
            className={cn(
              'relative flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:border-primary/50',
              lg && 'items-center gap-5 rounded-2xl border-2 p-5',
              selected && 'border-primary bg-primary/5 ring-1 ring-primary',
              invalid && !value && 'border-destructive',
            )}
          >
            {lg ? (
              <span
                className={cn(
                  'grid size-16 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-colors',
                  selected && 'bg-primary text-primary-foreground',
                )}
              >
                <Icon className="size-8" />
              </span>
            ) : (
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
            )}
            <span className={cn('min-w-0', lg && 'flex-1 pr-10')}>
              <span className={cn('block font-medium', lg && 'text-2xl font-bold')}>{title}</span>
              <span className={cn('text-xs text-muted-foreground', lg && 'mt-1 block text-base leading-snug')}>{text}</span>
            </span>
            {selected && (
              <span
                className={cn(
                  'absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground',
                  lg && 'top-1/2 right-5 size-8 -translate-y-1/2',
                )}
              >
                <CheckIcon className={cn('size-3.5', lg && 'size-5')} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
