import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, LoaderCircleIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import Loader from '@/components/Loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { RecapPeriod, RecapRow } from '@/features/reports/queries';
import { downloadRecapExcel, useRecap } from '@/features/reports/queries';
import { formatRupiah } from '@/lib/format';
import { cn } from '@/lib/utils';

const monthLong = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' });
const monthShort = new Intl.DateTimeFormat('id-ID', { month: 'long' });
const dayLabel = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });

const pad = (n: number) => String(n).padStart(2, '0');
const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

/** "45 mnt", "1 j 20 mnt", "2 hr 3 j" or "—". */
function duration(minutes: number | null) {
  if (minutes == null) return '—';
  const m = Math.round(minutes);
  if (m < 60) return `${m} mnt`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} j${m % 60 ? ` ${m % 60} mnt` : ''}`;
  return `${Math.floor(h / 24)} hr${h % 24 ? ` ${h % 24} j` : ''}`;
}

function rowLabel(period: RecapPeriod, key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return period === 'daily' ? dayLabel.format(new Date(y, m - 1, d)) : monthShort.format(new Date(y, m - 1, 1));
}

function isCurrent(period: RecapPeriod, key: string) {
  const now = new Date();
  return period === 'daily' ? key === `${monthKey(now)}-${pad(now.getDate())}` : key === monthKey(now);
}

/**
 * Rekap harian (per tanggal dalam sebulan) / bulanan (per bulan dalam setahun),
 * counted by the date orders came in: status outcome, average durations,
 * orders per service and revenue (Admin & Finance only), with totals and an Excel export.
 */
export default function RecapPage() {
  const now = new Date();
  const [period, setPeriod] = useState<RecapPeriod>('daily');
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [year, setYear] = useState(now.getFullYear());
  const [exporting, setExporting] = useState(false);

  const filters = {
    period,
    value: period === 'daily' ? monthKey(month) : String(year),
  };
  const { data, isLoading, isError, isPlaceholderData } = useRecap(filters);

  const label = period === 'daily' ? monthLong.format(month) : `Tahun ${year}`;
  const atLatest = period === 'daily' ? monthKey(month) >= monthKey(now) : year >= now.getFullYear();
  const shift = (n: number) =>
    period === 'daily'
      ? setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1))
      : setYear((y) => y + n);

  const exportExcel = async () => {
    setExporting(true);
    try {
      const name = await downloadRecapExcel(filters);
      toast.success(`${name} diunduh`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengekspor rekap');
    } finally {
      setExporting(false);
    }
  };

  const services = data?.services ?? [];
  const cells = (r: RecapRow) => [
    r.total,
    r.done,
    r.cancelled,
    r.in_progress,
    ...services.map((s) => r.by_service[s.id] ?? 0),
  ];
  const total = data?.total;
  const doneRate = total && total.total > 0 ? Math.round((total.done / total.total) * 100) : null;
  // Admin & Finance only: the API leaves the revenue out for the other roles.
  const showRevenue = total?.revenue !== undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <ToggleGroup
            type="single"
            variant="outline"
            value={period}
            onValueChange={(v) => v && setPeriod(v as RecapPeriod)}
            aria-label="Jenis rekap"
          >
            <ToggleGroupItem value="daily" className="px-3">
              Harian
            </ToggleGroupItem>
            <ToggleGroupItem value="monthly" className="px-3">
              Bulanan
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Periode sebelumnya">
              <ChevronLeftIcon />
            </Button>
            <span className="min-w-40 text-center font-medium capitalize">{label}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => shift(1)}
              disabled={atLatest}
              aria-label="Periode berikutnya"
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>

        <Button variant="outline" onClick={exportExcel} disabled={exporting || !data}>
          {exporting ? <LoaderCircleIcon className="animate-spin" /> : <DownloadIcon />}
          Ekspor Excel
        </Button>
      </div>

      {total && (
        <div className={cn('grid grid-cols-2 gap-3', showRevenue ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
          {[
            { label: 'Order masuk', value: String(total.total) },
            { label: 'Selesai', value: `${total.done}${doneRate !== null ? ` (${doneRate}%)` : ''}` },
            { label: 'Rata-rata masuk → selesai', value: duration(total.avg_done_minutes) },
            ...(showRevenue ? [{ label: 'Pendapatan', value: formatRupiah(total.revenue ?? 0) }] : []),
            ...(total.free > 0
              ? [
                  {
                    label: 'Ongkir gratis (lansia/disabilitas)',
                    value: `${total.free} order${total.free_value !== undefined ? ` · ${formatRupiah(total.free_value)}` : ''}`,
                  },
                ]
              : []),
          ].map((s) => (
            <Card key={s.label} className="gap-1 px-4 py-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-semibold">{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="px-0">
          {isLoading && <Loader label="Memuat rekap…" />}
          {isError && <p className="p-6 text-sm text-destructive">Gagal memuat rekap. Coba refresh halaman.</p>}
          {data && (
            <div className={cn('overflow-x-auto transition-opacity', isPlaceholderData && 'opacity-60')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{period === 'daily' ? 'Tanggal' : 'Bulan'}</TableHead>
                    <TableHead className="text-right">Masuk</TableHead>
                    <TableHead className="text-right">Selesai</TableHead>
                    <TableHead className="text-right">Dibatalkan</TableHead>
                    <TableHead className="text-right">Diproses</TableHead>
                    {services.map((s) => (
                      <TableHead key={s.id} className="text-right">
                        {s.name}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Rata² siap diambil</TableHead>
                    <TableHead className="text-right">Rata² selesai</TableHead>
                    {showRevenue && <TableHead className="text-right">Pendapatan</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((r) => {
                    const empty = r.total === 0;
                    return (
                      <TableRow
                        key={r.period}
                        className={cn(empty && 'text-muted-foreground', isCurrent(period, r.period) && 'font-medium')}
                      >
                        <TableCell className="whitespace-nowrap capitalize">
                          {rowLabel(period, r.period)}
                          {isCurrent(period, r.period) && (
                            <span className="ms-2 rounded bg-brand-orange/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-orange uppercase">
                              {period === 'daily' ? 'Hari ini' : 'Bulan ini'}
                            </span>
                          )}
                        </TableCell>
                        {cells(r).map((v, i) => (
                          <TableCell key={i} className="text-right tabular-nums">
                            {empty ? '·' : v}
                          </TableCell>
                        ))}
                        <TableCell className="text-right whitespace-nowrap">{empty ? '·' : duration(r.avg_ready_minutes)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">{empty ? '·' : duration(r.avg_done_minutes)}</TableCell>
                        {showRevenue && (
                          <TableCell className="text-right whitespace-nowrap tabular-nums">
                            {empty ? '·' : formatRupiah(r.revenue ?? 0)}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-semibold">
                    <TableCell>Total</TableCell>
                    {cells(data.total).map((v, i) => (
                      <TableCell key={i} className="text-right tabular-nums">
                        {v}
                      </TableCell>
                    ))}
                    <TableCell className="text-right whitespace-nowrap">{duration(data.total.avg_ready_minutes)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">{duration(data.total.avg_done_minutes)}</TableCell>
                    {showRevenue && (
                      <TableCell className="text-right whitespace-nowrap tabular-nums">
                        {formatRupiah(data.total.revenue ?? 0)}
                      </TableCell>
                    )}
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Dihitung berdasarkan tanggal order masuk. &ldquo;Rata² siap diambil&rdquo; = waktu dari order masuk sampai obat siap
        di farmasi (order yang dibuat farmasi tidak dihitung). &ldquo;Diproses&rdquo; = belum selesai dan belum dibatalkan.
      </p>
    </div>
  );
}
