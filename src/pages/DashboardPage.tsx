import { useState } from 'react';

import Loader from '@/components/Loader';
import { DashboardCharts } from '@/components/dashboard-charts';
import { SetupChecklistBanner } from '@/components/setup/SetupChecklistNav';
import { SectionCards } from '@/components/section-cards';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useOrderStats } from '@/features/orders/queries';
import { cn } from '@/lib/utils';
import type { StatsRange } from '@/types/models';

const RANGES: { value: StatsRange; label: string }[] = [
  { value: 7, label: '7 hari' },
  { value: 30, label: '30 hari' },
  { value: 90, label: '90 hari' },
];

export default function DashboardPage() {
  const [days, setDays] = useState<StatsRange>(30);
  const { data: stats, isLoading, isError, isPlaceholderData } = useOrderStats(days);

  return (
    <div className="space-y-6">
      <SetupChecklistBanner />
      <SectionCards stats={stats} isLoading={isLoading} />

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Tren order</h3>
            <p className="text-sm text-muted-foreground">Grafik berdasarkan tanggal order masuk.</p>
          </div>
          <ToggleGroup
            type="single"
            variant="outline"
            value={String(days)}
            onValueChange={(v) => v && setDays(Number(v) as StatsRange)}
            aria-label="Rentang waktu"
          >
            {RANGES.map((r) => (
              <ToggleGroupItem key={r.value} value={String(r.value)} className="px-3">
                {r.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {isError && <p className="text-sm text-destructive">Gagal memuat grafik. Coba refresh halaman.</p>}
        {isLoading && <Loader label="Memuat grafik…" />}
        {stats && (
          <div className={cn('transition-opacity', isPlaceholderData && 'opacity-60')}>
            <DashboardCharts stats={stats} />
          </div>
        )}
      </section>
    </div>
  );
}
