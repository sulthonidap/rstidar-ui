import 'react-day-picker/style.css';

import { CalendarIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { DayPicker } from 'react-day-picker';
import { id as localeId } from 'react-day-picker/locale';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type { DateRange };

const dayMonth = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });
const dayMonthYear = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

/** "1 Sep – 15 Sep 2026", "15 Sep 2026", or the placeholder. */
function rangeLabel(range: DateRange | undefined, placeholder: string) {
  if (!range?.from) return placeholder;
  const to = range.to ?? range.from;
  if (range.from.toDateString() === to.toDateString()) return dayMonthYear.format(range.from);
  const sameYear = range.from.getFullYear() === to.getFullYear();
  return `${(sameYear ? dayMonth : dayMonthYear).format(range.from)} – ${dayMonthYear.format(to)}`;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function presets(): { label: string; range: DateRange }[] {
  const today = startOfDay(new Date());
  const y = today.getFullYear();
  const m = today.getMonth();
  return [
    { label: 'Hari ini', range: { from: today, to: today } },
    { label: '7 hari terakhir', range: { from: addDays(today, -6), to: today } },
    { label: '30 hari terakhir', range: { from: addDays(today, -29), to: today } },
    { label: 'Bulan ini', range: { from: new Date(y, m, 1), to: today } },
    { label: 'Bulan lalu', range: { from: new Date(y, m - 1, 1), to: new Date(y, m, 0) } },
  ];
}

/**
 * Date-range filter: a button that opens a two-month calendar with quick presets.
 * The picked range is only applied on "Terapkan" (or a preset), so half-picked
 * ranges don't trigger a reload.
 */
export default function DateRangePicker({
  value,
  onChange,
  placeholder = 'Semua tanggal',
  className,
}: {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(value);

  const apply = (range: DateRange | undefined) => {
    onChange(range?.from ? { from: range.from, to: range.to ?? range.from } : undefined);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(v) => {
        if (v) setDraft(value);
        setOpen(v);
      }}
    >
      <div className={cn('inline-flex items-center', className)}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn('h-9 justify-start gap-2 font-normal', value?.from && 'pr-9', !value?.from && 'text-muted-foreground')}
          >
            <CalendarIcon className="size-4" />
            {rangeLabel(value, placeholder)}
          </Button>
        </PopoverTrigger>
        {value?.from && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="-ml-8"
            onClick={() => onChange(undefined)}
            aria-label="Hapus filter tanggal"
          >
            <XIcon />
          </Button>
        )}
      </div>

      <PopoverContent align="start" className="w-auto p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="flex gap-1 overflow-x-auto border-b p-2 sm:flex-col sm:border-r sm:border-b-0">
            {presets().map((p) => (
              <Button
                key={p.label}
                variant="ghost"
                size="sm"
                className="justify-start whitespace-nowrap"
                onClick={() => apply(p.range)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="p-3">
            <DayPicker
              mode="range"
              locale={localeId}
              numberOfMonths={2}
              selected={draft}
              onSelect={setDraft}
              defaultMonth={draft?.from ?? addDays(new Date(), -30)}
              disabled={{ after: new Date() }}
              showOutsideDays
              className="medsend-calendar"
            />
            <div className="mt-2 flex items-center justify-between gap-2 border-t pt-3">
              <span className="text-sm text-muted-foreground">{rangeLabel(draft, 'Pilih tanggal awal & akhir')}</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => apply(undefined)}>
                  Reset
                </Button>
                <Button size="sm" onClick={() => apply(draft)} disabled={!draft?.from}>
                  Terapkan
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
