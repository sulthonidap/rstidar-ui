import { CheckIcon, ClipboardListIcon, HouseIcon, PillIcon, TruckIcon, XCircleIcon } from 'lucide-react';
import type { ComponentType } from 'react';

import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { HistoryStatus, TrackedOrder } from '@/types/models';

/**
 * What the patient sees: 4 steps instead of the internal statuses — they don't
 * need to know who confirmed, prepared or packed the medicine.
 */
const STEPS: { label: string; icon: ComponentType<{ className?: string }> }[] = [
  { label: 'Pesanan diterima', icon: ClipboardListIcon },
  { label: 'Obat disiapkan', icon: PillIcon },
  { label: 'Dalam pengiriman', icon: TruckIcon },
  { label: 'Sudah diterima', icon: HouseIcon },
];

/** Index in STEPS of each (internal) status; old history statuses included. */
const STEP_OF: Record<Exclude<HistoryStatus, 'cancelled'>, number> = {
  pending: 0,
  confirmed: 1,
  ready_for_pickup: 1,
  collected: 1,
  assigned: 1,
  packed: 1,
  on_delivery: 2,
  done: 3,
};

/** One-line explanation of the current step, in the patient's words. */
export const DETAIL: Partial<Record<HistoryStatus, string>> = {
  pending: 'Pesanan sedang dicek petugas rumah sakit.',
  confirmed: 'Pesanan sudah dicek, farmasi sedang menyiapkan obat.',
  ready_for_pickup: 'Obat sudah siap di farmasi dan segera dikemas petugas.',
  packed: 'Obat sudah dikemas dan menunggu dijemput kurir.',
  on_delivery: 'Kurir sedang mengantar obat ke alamat tujuan.',
  done: 'Obat sudah diterima. Semoga lekas sembuh!',
};

export default function PatientProgress({ order }: { order: TrackedOrder }) {
  const history = [...order.status_history].sort((a, b) => a.changed_at.localeCompare(b.changed_at));

  if (order.status === 'cancelled') {
    const cancel = history.findLast((h) => h.to_status === 'cancelled');
    return (
      <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <XCircleIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div>
          <p className="font-semibold text-destructive">Pesanan dibatalkan</p>
          {cancel && <p className="text-xs text-muted-foreground">{formatDateTime(cancel.changed_at)}</p>}
          {cancel?.note && <p className="mt-1">Alasan: {cancel.note}</p>}
          <p className="mt-1 text-muted-foreground">Hubungi rumah sakit kalau ada pertanyaan.</p>
        </div>
      </div>
    );
  }

  const current = STEP_OF[order.status];
  // When each step was reached: the first history entry belonging to it.
  const reachedAt = STEPS.map((_, i) =>
    i === 0
      ? order.created_at
      : history.find((h) => h.to_status !== 'cancelled' && STEP_OF[h.to_status] === i)?.changed_at,
  );

  return (
    <div className="space-y-5">
      <ol className="grid grid-cols-4">
        {STEPS.map(({ label, icon: Icon }, i) => {
          const done = i < current || order.status === 'done';
          const active = i === current && order.status !== 'done';
          return (
            <li key={label} className="relative flex flex-col items-center text-center">
              {/* Connector to the previous step. */}
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-5 right-1/2 h-0.5 w-full -translate-y-1/2',
                    i <= current ? 'bg-primary' : 'bg-border',
                  )}
                />
              )}
              <span
                className={cn(
                  'relative z-10 grid size-10 place-items-center rounded-full border-2 transition-colors',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && 'border-brand-orange bg-brand-orange text-white ring-4 ring-brand-orange/20',
                  !done && !active && 'border-border bg-card text-muted-foreground',
                )}
              >
                {done ? <CheckIcon className="size-5" /> : <Icon className="size-5" />}
              </span>
              <span
                className={cn(
                  'mt-2 px-1 text-xs leading-tight font-medium sm:text-sm',
                  !done && !active && 'text-muted-foreground',
                  active && 'text-brand-orange',
                )}
              >
                {label}
              </span>
              {reachedAt[i] && i <= current && (
                <span className="mt-0.5 hidden text-[11px] text-muted-foreground tabular-nums sm:block">
                  {formatDateTime(reachedAt[i]!)}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {DETAIL[order.status] && (
        <p className="rounded-lg bg-muted/60 px-4 py-3 text-center text-sm">{DETAIL[order.status]}</p>
      )}
    </div>
  );
}
