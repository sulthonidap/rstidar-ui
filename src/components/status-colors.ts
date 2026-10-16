import type { HistoryStatus } from '@/types/models';

/** Chip colors per status (StatusBadge); one hue per step of the flow. */
export const STATUS_BADGE: Record<HistoryStatus, string> = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  confirmed: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300',
  ready_for_pickup: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  collected: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  packed: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  on_delivery: 'bg-primary/10 text-primary dark:bg-primary/20',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
  assigned: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

/** Matching dot colors (status filter cards). */
export const STATUS_DOT: Record<HistoryStatus, string> = {
  pending: 'bg-gray-400',
  confirmed: 'bg-sky-500',
  ready_for_pickup: 'bg-violet-500',
  collected: 'bg-amber-500',
  packed: 'bg-orange-500',
  on_delivery: 'bg-primary',
  done: 'bg-emerald-500',
  cancelled: 'bg-rose-500',
  assigned: 'bg-slate-400',
};
