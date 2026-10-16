import type { ScheduleSlot } from '@/types/models';

export const SCHEDULE_SLOTS: { value: ScheduleSlot; label: string; hours: string }[] = [
  { value: 'pagi', label: 'Pagi', hours: '08–12' },
  { value: 'siang', label: 'Siang', hours: '12–15' },
  { value: 'sore', label: 'Sore', hours: '15–18' },
];

const dayFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

/** "YYYY-MM-DD" → local Date (no timezone shift). */
export function parseDay(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** "Secepatnya", or e.g. "Rab, 1 Okt 2026 · Pagi (08–12)". */
export function formatSchedule(date?: string | null, slot?: ScheduleSlot | null): string {
  if (!date) return 'Secepatnya';
  const s = SCHEDULE_SLOTS.find((x) => x.value === slot);
  return `${dayFmt.format(parseDay(date))}${s ? ` · ${s.label} (${s.hours})` : ''}`;
}

/** True when the schedule is today (for highlighting in lists). */
export function isToday(date?: string | null): boolean {
  if (!date) return false;
  return parseDay(date).toDateString() === new Date().toDateString();
}
