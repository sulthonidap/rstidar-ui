import { STATUS_DOT } from '@/components/status-colors';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { HistoryStatus, OrderStatus } from '@/types/models';
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from '@/types/models';

export interface TimelineEntry {
  from_status?: HistoryStatus | null;
  to_status: HistoryStatus;
  changed_at: string;
  note?: string | null;
  /** Staff/courier name — internal pages only. */
  actor?: string | null;
}

/** The step after each status, and who has to take it. */
const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; who: string }>> = {
  pending: { status: 'confirmed', who: 'CCO' },
  confirmed: { status: 'ready_for_pickup', who: 'Farmasi' },
  ready_for_pickup: { status: 'packed', who: 'CCO' },
  packed: { status: 'on_delivery', who: 'Kurir' },
  on_delivery: { status: 'done', who: 'Kurir' },
};

/** "+45 mnt", "+2 j 10 mnt", "+3 hr" — time taken since the previous step. */
function elapsed(fromIso: string, toIso: string): string | null {
  const min = Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000);
  if (min < 1) return null;
  if (min < 60) return `+${min} mnt`;
  const h = Math.floor(min / 60);
  if (h < 24) return `+${h} j${min % 60 ? ` ${min % 60} mnt` : ''}`;
  return `+${Math.floor(h / 24)} hr`;
}

/**
 * Compact status history, newest first: one row per step with who did it,
 * when, how long it took since the step before, and the note. On top, the step
 * being waited on (and by whom) while the order is still open.
 */
export default function StatusTimeline({
  status,
  entries,
  showWho = true,
}: {
  status: OrderStatus;
  entries: TimelineEntry[];
  showWho?: boolean;
}) {
  // Same-second steps (and APIs sending newest-first) fall back to flow order.
  const rank = (s: HistoryStatus) => ORDER_STATUSES.indexOf(s === 'assigned' || s === 'collected' ? 'packed' : s);
  const chronological = [...entries].sort(
    (a, b) => a.changed_at.localeCompare(b.changed_at) || rank(a.to_status) - rank(b.to_status),
  );
  const rows = chronological.map((e, i) => ({
    ...e,
    // Same from/to status = the order was edited, not moved.
    edit: e.from_status === e.to_status,
    took: i > 0 ? elapsed(chronological[i - 1].changed_at, e.changed_at) : null,
  }));
  rows.reverse();
  const next = NEXT[status];

  if (rows.length === 0 && !next) return <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>;

  const total = rows.length + (next ? 1 : 0);

  return (
    <ol className="text-sm">
      {next && (
        <TimelineRow index={0} total={total} dot={<span className="size-2.5 rounded-full border-2 border-dashed border-brand-orange bg-card" />} upcoming>
          <p className="text-muted-foreground">
            Berikutnya: <span className="font-medium text-brand-orange">{ORDER_STATUS_LABELS[next.status]}</span>
            {showWho && <> · menunggu {next.who}</>}
          </p>
        </TimelineRow>
      )}
      {rows.map((r, i) => (
        <TimelineRow
          key={`${r.changed_at}-${i}`}
          index={i + (next ? 1 : 0)}
          total={total}
          dot={
            <span
              className={cn(
                'size-2.5 rounded-full',
                r.edit ? 'border-2 border-muted-foreground/50 bg-card' : STATUS_DOT[r.to_status],
              )}
            />
          }
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <p className="font-medium">
              {r.edit ? 'Order diubah' : ORDER_STATUS_LABELS[r.to_status]}
              {showWho && r.actor && <span className="font-normal text-muted-foreground"> · {r.actor}</span>}
            </p>
            <p className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
              {formatDateTime(r.changed_at)}
              {r.took && <span className="ms-1.5 text-muted-foreground/70">{r.took}</span>}
            </p>
          </div>
          {r.note && <p className="text-xs text-muted-foreground">{r.note}</p>}
        </TimelineRow>
      ))}
    </ol>
  );
}

/**
 * One row: the dot on a vertical rail (line above unless first, below unless
 * last — dashed after the upcoming step), and the content with a divider.
 */
function TimelineRow({
  index,
  total,
  dot,
  upcoming,
  children,
}: {
  index: number;
  total: number;
  dot: React.ReactNode;
  upcoming?: boolean;
  children: React.ReactNode;
}) {
  const first = index === 0;
  const last = index === total - 1;
  return (
    <li className="flex gap-3">
      {/* The dot sits at the first text line (content py-2 + half a 20px line = 18px). */}
      <div className="relative flex w-2.5 shrink-0 justify-center" aria-hidden>
        {!first && <span className="absolute top-0 h-[18px] w-0.5 bg-border" />}
        {!last && (
          <span
            className={cn(
              'absolute top-[18px] bottom-0',
              upcoming ? 'border-l-2 border-dashed border-border' : 'w-0.5 bg-border',
            )}
          />
        )}
        <span className="relative z-10 mt-[13px] flex">{dot}</span>
      </div>
      <div className={cn('min-w-0 flex-1 py-2', !last && 'border-b')}>{children}</div>
    </li>
  );
}
