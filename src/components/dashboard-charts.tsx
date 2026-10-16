import type { ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChartConfig } from '@/components/ui/chart';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { formatRupiah } from '@/lib/format';
import type { OrderStats } from '@/types/models';
import { ORDER_STATUS_LABELS, ORDER_STATUSES as STATUS_ORDER } from '@/types/models';

// Mark colors come from validated CSS tokens (index.css) with separate dark-mode steps.
const ordersConfig = { orders: { label: 'Order masuk', color: 'var(--chart-orders)' } } satisfies ChartConfig;
const revenueConfig = { revenue: { label: 'Pendapatan', color: 'var(--chart-revenue)' } } satisfies ChartConfig;
const countConfig = { count: { label: 'Order', color: 'var(--chart-breakdown)' } } satisfies ChartConfig;

const dayShort = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });
const dayLong = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const parseDay = (iso: string) => new Date(`${iso}T00:00:00`);

/** Axis ticks: Rp 0 / Rp 500rb / Rp 1,2jt — the tooltip shows the exact amount. */
function rupiahCompact(value: number) {
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })}jt`;
  if (value >= 1_000) return `Rp ${Math.round(value / 1_000)}rb`;
  return `Rp ${value}`;
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium text-foreground tabular-nums">{value}</span>
    </div>
  );
}

function ChartCard({
  title,
  description,
  empty,
  className,
  children,
}: {
  title: string;
  description: string;
  empty: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            Belum ada data di rentang ini.
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

/** Horizontal bars, one hue (magnitude comparison), value at each bar's tip. */
function RankBars({ data, labelWidth }: { data: { label: string; count: number }[]; labelWidth: number }) {
  return (
    <ChartContainer config={countConfig} className="aspect-auto w-full" style={{ height: Math.max(160, data.length * 44) }}>
      <BarChart data={data} layout="vertical" margin={{ left: 4, right: 36, top: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" allowDecimals={false} hide />
        <YAxis type="category" dataKey="label" width={labelWidth} tickLine={false} axisLine={false} />
        <ChartTooltip
          cursor={{ fill: 'var(--muted)' }}
          content={<ChartTooltipContent hideIndicator formatter={(v) => <TooltipRow label="Order" value={String(v)} />} />}
        />
        <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} barSize={20}>
          <LabelList dataKey="count" position="right" className="fill-foreground" fontSize={12} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function DashboardCharts({ stats }: { stats: OrderStats }) {
  // Defensive: an older API sends null for empty lists (Go nil slices).
  const daily = stats.trend?.daily ?? [];
  const by_status = stats.trend?.by_status ?? {};
  const rangeText = `${stats.days} hari terakhir`;
  const ordersInRange = daily.reduce((sum, d) => sum + d.orders, 0);
  // Only Admin & Finance get the money figures (the API leaves them out for the rest).
  const showRevenue = stats.revenue !== undefined;
  const revenueInRange = daily.reduce((sum, d) => sum + (d.revenue ?? 0), 0);
  const statusData = STATUS_ORDER.filter((s) => by_status[s]).map((s) => ({
    label: ORDER_STATUS_LABELS[s],
    count: by_status[s] ?? 0,
  }));

  const dayTick = (iso: string) => dayShort.format(parseDay(iso));
  const dayLabel = (_: unknown, payload: readonly { payload?: { date?: string } }[]) =>
    payload?.[0]?.payload?.date ? dayLong.format(parseDay(payload[0].payload.date)) : '';

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Order masuk per hari"
        description={`${ordersInRange} order · ${rangeText}`}
        empty={ordersInRange === 0}
      >
        <ChartContainer config={ordersConfig} className="aspect-auto h-64 w-full">
          <BarChart data={daily} margin={{ left: 0, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} tickFormatter={dayTick} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
            <ChartTooltip
              cursor={{ fill: 'var(--muted)' }}
              content={
                <ChartTooltipContent
                  hideIndicator
                  labelFormatter={dayLabel}
                  formatter={(v) => <TooltipRow label="Order masuk" value={String(v)} />}
                />
              }
            />
            <Bar dataKey="orders" fill="var(--color-orders)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ChartContainer>
      </ChartCard>

      {showRevenue && (
        <ChartCard
          title="Pendapatan per hari"
          description={`${formatRupiah(revenueInRange)} dari order selesai · ${rangeText}`}
          empty={revenueInRange === 0}
        >
          <ChartContainer config={revenueConfig} className="aspect-auto h-64 w-full">
            <AreaChart data={daily} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} tickFormatter={dayTick} />
              <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={rupiahCompact} />
              <ChartTooltip
                cursor={{ stroke: 'var(--border)' }}
                content={
                  <ChartTooltipContent
                    hideIndicator
                    labelFormatter={dayLabel}
                    formatter={(v) => <TooltipRow label="Pendapatan" value={formatRupiah(Number(v))} />}
                  />
                }
              />
              <Area
                dataKey="revenue"
                type="monotone"
                stroke="var(--color-revenue)"
                strokeWidth={2}
                fill="var(--color-revenue)"
                fillOpacity={0.1}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
              />
            </AreaChart>
          </ChartContainer>
        </ChartCard>
      )}

      <ChartCard
        title="Order per status"
        description={`Order masuk ${rangeText}, status saat ini`}
        empty={statusData.length === 0}
        className="lg:col-span-2"
      >
        <RankBars data={statusData} labelWidth={84} />
      </ChartCard>
    </div>
  );
}
