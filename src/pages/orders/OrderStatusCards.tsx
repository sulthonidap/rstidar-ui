import { STATUS_DOT } from '@/components/status-colors';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types/models';
import { ORDER_STATUS_LABELS, ORDER_STATUSES as STATUSES } from '@/types/models';

// 'Menunggu konfirmasi' has no card (still counted in Semua, and in the status dropdown).
const CARD_STATUSES = STATUSES.filter((s) => s !== 'pending');

/** Shorter labels so every card fits on one line. */
const CARD_LABELS: Partial<Record<OrderStatus, string>> = {
  on_delivery: 'Sedang diantar',
};

/** Dot colors match the StatusBadge chips in the table. */
const DOT = STATUS_DOT;

/**
 * Per-status counts above the orders table (for the current search + date range),
 * doubling as quick status filters. `active` is the selected status ('' = all).
 */
export default function OrderStatusCards({
  counts,
  active,
  onSelect,
  loading,
}: {
  counts: Partial<Record<OrderStatus, number>> | undefined;
  active: OrderStatus | '';
  onSelect: (status: OrderStatus | '') => void;
  loading: boolean;
}) {
  const total = STATUSES.reduce((sum, s) => sum + (counts?.[s] ?? 0), 0);
  const items: { key: OrderStatus | ''; label: string; count: number; dot?: string }[] = [
    { key: '', label: 'Semua', count: total },
    ...CARD_STATUSES.map((s) => ({
      key: s,
      label: CARD_LABELS[s] ?? ORDER_STATUS_LABELS[s],
      count: counts?.[s] ?? 0,
      dot: DOT[s],
    })),
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7" role="group" aria-label="Filter status order">
      {items.map((item) => {
        const selected = item.key === active;
        return (
          <button
            key={item.key || 'all'}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(selected && item.key !== '' ? '' : item.key)}
            title={item.key ? ORDER_STATUS_LABELS[item.key] : undefined}
            className={cn(
              'flex min-w-0 flex-col items-start gap-1 rounded-xl border bg-card px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
              // Semua takes a full row on small screens so the 6 status cards pair up evenly.
              item.key === '' && 'col-span-2 sm:col-span-3 xl:col-span-1',
              selected && 'border-primary bg-sidebar-accent ring-1 ring-primary',
            )}
          >
            <span className="flex w-full min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
              {item.dot && <span className={cn('size-2 shrink-0 rounded-full', item.dot)} aria-hidden />}
              <span className="truncate">{item.label}</span>
            </span>
            <span className={cn('text-2xl font-semibold', selected && 'text-sidebar-accent-foreground')}>
              {loading ? '—' : item.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
