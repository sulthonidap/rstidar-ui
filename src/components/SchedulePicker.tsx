import 'react-day-picker/style.css';

import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { id as localeId } from 'react-day-picker/locale';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toDateParam } from '@/lib/format';
import { formatSchedule, parseDay, SCHEDULE_SLOTS } from '@/lib/schedule';
import { cn } from '@/lib/utils';
import type { ScheduleSlot } from '@/types/models';

export interface ScheduleValue {
  /** "YYYY-MM-DD", or '' for secepatnya. */
  date: string;
  slot: ScheduleSlot | '';
}

const MAX_DAYS = 60; // same limit as the API

const ON = 'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground';

/**
 * Delivery schedule: "Secepatnya", or a date (today … 60 days ahead) plus a
 * time slot (Pagi / Siang / Sore). Picking "Jadwalkan" opens the calendar.
 */
export default function SchedulePicker({
  value,
  onChange,
  error,
}: {
  value: ScheduleValue;
  onChange: (value: ScheduleValue) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const scheduled = value.date !== '' || open;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const last = new Date(today);
  last.setDate(last.getDate() + MAX_DAYS);

  return (
    <div className="space-y-2">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={scheduled ? 'later' : 'asap'}
        onValueChange={(v) => {
          if (v === 'asap') {
            setOpen(false);
            onChange({ date: '', slot: '' });
          } else if (v === 'later') {
            setOpen(true);
          }
        }}
      >
        <ToggleGroupItem value="asap" className={cn('px-3', ON)}>
          Secepatnya
        </ToggleGroupItem>
        <ToggleGroupItem value="later" className={cn('px-3', ON)}>
          Jadwalkan
        </ToggleGroupItem>
      </ToggleGroup>

      {scheduled && (
        <div className="flex flex-wrap items-center gap-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn('h-9 gap-2 font-normal', !value.date && 'text-muted-foreground')}
                aria-invalid={!!error && !value.date}
              >
                <CalendarIcon className="size-4" />
                {value.date ? formatSchedule(value.date, null) : 'Pilih tanggal'}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-3">
              <DayPicker
                mode="single"
                locale={localeId}
                selected={value.date ? parseDay(value.date) : undefined}
                onSelect={(d) => {
                  if (!d) return;
                  onChange({ date: toDateParam(d) ?? '', slot: value.slot || 'pagi' });
                  setOpen(false);
                }}
                defaultMonth={value.date ? parseDay(value.date) : today}
                disabled={[{ before: today }, { after: last }]}
                className="medsend-calendar"
              />
            </PopoverContent>
          </Popover>

          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={value.slot}
            onValueChange={(v) => v && onChange({ ...value, slot: v as ScheduleSlot })}
            aria-label="Slot waktu kirim"
          >
            {SCHEDULE_SLOTS.map((s) => (
              <ToggleGroupItem key={s.value} value={s.value} className={cn('px-3', ON)}>
                {s.label} <span className="text-xs opacity-70">{s.hours}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
