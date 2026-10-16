import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import Loader from '@/components/Loader';
import TableSearch from '@/components/TableSearch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { CourierRecapRow } from '@/features/couriers/queries';
import { useCourierRecap, useUpdateCourier } from '@/features/couriers/queries';
import type { RecapPeriod } from '@/features/reports/queries';
import { apiErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatRupiah } from '@/lib/format';
import { hasRole } from '@/lib/roles';
import { cn } from '@/lib/utils';

const monthLong = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' });
const km = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

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

type FormValues = { vehicle_type: string; phone: string; is_active: boolean };

/** Edit kendaraan, telepon, dan status aktif. Data kurir dibuat otomatis dari user ber-role Kurir. */
function CourierDialog({
  courier,
  onOpenChange,
}: {
  courier: CourierRecapRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateCourier(courier?.courier_id ?? 0);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    handleSubmit,
    register,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    values: {
      vehicle_type: courier?.vehicle_type ?? '',
      phone: courier?.phone ?? '',
      is_active: courier?.is_active ?? true,
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!courier) return;
    setServerError(null);
    try {
      await update.mutateAsync(values);
      onOpenChange(false);
    } catch (err) {
      setServerError(apiErrorMessage(err, 'Gagal menyimpan'));
    }
  };

  return (
    <Dialog open={!!courier} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Kurir — {courier?.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="vehicle_type">Kendaraan</Label>
              <Input id="vehicle_type" placeholder="Motor" {...register('vehicle_type')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telepon</Label>
              <Input id="phone" {...register('phone')} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="is_active">Aktif</Label>
              <p className="text-xs text-muted-foreground">Kurir nonaktif tidak bisa login di aplikasi kurir.</p>
            </div>
            <Switch id="is_active" checked={watch('is_active')} onCheckedChange={(v) => setValue('is_active', v)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Rekap per kurir dalam sebulan / setahun, menurut tanggal order ditugaskan:
 * jumlah order, hasilnya, jarak tempuh, waktu antar, dan nilai order selesai.
 */
export default function CouriersPage() {
  const { user } = useAuth();
  const isAdmin = hasRole(user, 'admin');
  const now = new Date();
  const [period, setPeriod] = useState<RecapPeriod>('daily');
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<CourierRecapRow | null>(null);

  const { data, isLoading, isError, isPlaceholderData } = useCourierRecap({
    period,
    value: period === 'daily' ? monthKey(month) : String(year),
  });

  const label = period === 'daily' ? monthLong.format(month) : `Tahun ${year}`;
  const atLatest = period === 'daily' ? monthKey(month) >= monthKey(now) : year >= now.getFullYear();
  const shift = (n: number) =>
    period === 'daily'
      ? setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1))
      : setYear((y) => y + n);

  const allRows = data?.rows ?? [];
  const q = search.trim().toLowerCase();
  const rows = q
    ? allRows.filter((r) => [r.name, r.phone, r.vehicle_type].some((v) => v?.toLowerCase().includes(q)))
    : allRows;

  const sum = (pick: (r: CourierRecapRow) => number) => rows.reduce((acc, r) => acc + pick(r), 0);
  const total = {
    total: sum((r) => r.total),
    done: sum((r) => r.done),
    cancelled: sum((r) => r.cancelled),
    in_progress: sum((r) => r.in_progress),
    distance_km: sum((r) => r.distance_km),
    revenue: sum((r) => r.revenue),
  };
  // Rata-rata tertimbang jumlah order selesai yang punya durasi.
  const trips = rows.filter((r) => r.avg_trip_minutes != null);
  const tripDone = trips.reduce((acc, r) => acc + r.done, 0);
  const avgTrip = tripDone > 0 ? trips.reduce((acc, r) => acc + r.avg_trip_minutes! * r.done, 0) / tripDone : null;
  const activeCount = allRows.filter((r) => r.is_active).length;

  const colCount = isAdmin ? 11 : 10;

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
              Bulanan
            </ToggleGroupItem>
            <ToggleGroupItem value="monthly" className="px-3">
              Tahunan
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Periode sebelumnya">
              <ChevronLeftIcon />
            </Button>
            <span className="min-w-40 text-center font-medium capitalize">{label}</span>
            <Button variant="outline" size="icon" onClick={() => shift(1)} disabled={atLatest} aria-label="Periode berikutnya">
              <ChevronRightIcon />
            </Button>
          </div>
        </div>

        <TableSearch value={search} onChange={setSearch} placeholder="Cari kurir…" />
      </div>

      {data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Kurir aktif', value: `${activeCount} / ${allRows.length}` },
            { label: 'Order selesai', value: `${total.done} dari ${total.total}` },
            { label: 'Total jarak', value: `${km.format(total.distance_km)} km` },
            { label: 'Rata-rata waktu antar', value: duration(avgTrip) },
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
          {isLoading && <Loader label="Memuat rekap kurir…" />}
          {isError && <p className="p-6 text-sm text-destructive">Gagal memuat rekap. Coba refresh halaman.</p>}
          {data && (
            <div className={cn('overflow-x-auto transition-opacity', isPlaceholderData && 'opacity-60')}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kurir</TableHead>
                    <TableHead>Kendaraan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ditugaskan</TableHead>
                    <TableHead className="text-right">Selesai</TableHead>
                    <TableHead className="text-right">Dibatalkan</TableHead>
                    <TableHead className="text-right">Berjalan</TableHead>
                    <TableHead className="text-right">Jarak</TableHead>
                    <TableHead className="text-right">Rata² antar</TableHead>
                    <TableHead className="text-right">Nilai order</TableHead>
                    {isAdmin && <TableHead />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={colCount} className="py-8 text-center text-muted-foreground">
                        {q ? 'Kurir tidak ditemukan.' : 'Belum ada kurir. Buat user dengan role Kurir di Kelola User.'}
                      </TableCell>
                    </TableRow>
                  )}
                  {rows.map((r) => {
                    const empty = r.total === 0;
                    return (
                      <TableRow key={r.courier_id} className={cn(empty && 'text-muted-foreground')}>
                        <TableCell>
                          <div className="font-medium text-foreground">{r.name}</div>
                          {r.phone && <div className="text-xs text-muted-foreground">{r.phone}</div>}
                        </TableCell>
                        <TableCell>{r.vehicle_type || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={r.is_active ? 'default' : 'outline'}>{r.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                        </TableCell>
                        {[r.total, r.done, r.cancelled, r.in_progress].map((v, i) => (
                          <TableCell key={i} className="text-right tabular-nums">
                            {empty ? '·' : v}
                          </TableCell>
                        ))}
                        <TableCell className="text-right whitespace-nowrap tabular-nums">
                          {empty ? '·' : `${km.format(r.distance_km)} km`}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">{empty ? '·' : duration(r.avg_trip_minutes)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap tabular-nums">
                          {empty ? '·' : formatRupiah(r.revenue)}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => setEditing(r)}>
                              Edit
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
                {rows.length > 0 && (
                  <TableFooter>
                    <TableRow className="font-semibold">
                      <TableCell colSpan={3}>Total</TableCell>
                      {[total.total, total.done, total.cancelled, total.in_progress].map((v, i) => (
                        <TableCell key={i} className="text-right tabular-nums">
                          {v}
                        </TableCell>
                      ))}
                      <TableCell className="text-right whitespace-nowrap tabular-nums">{km.format(total.distance_km)} km</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{duration(avgTrip)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">{formatRupiah(total.revenue)}</TableCell>
                      {isAdmin && <TableCell />}
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Dihitung berdasarkan tanggal order ditugaskan ke kurir. &ldquo;Jarak&rdquo; dan &ldquo;Nilai order&rdquo; hanya
        dari order selesai. &ldquo;Rata² antar&rdquo; = waktu dari kurir terima paket sampai diterima customer. Data kurir
        dibuat otomatis waktu bikin user dengan role Kurir.
      </p>

      {isAdmin && <CourierDialog courier={editing} onOpenChange={(open) => !open && setEditing(null)} />}
    </div>
  );
}
