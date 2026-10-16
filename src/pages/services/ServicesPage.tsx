import { zodResolver } from '@hookform/resolvers/zod';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router';
import { z } from 'zod';

import Loader from '@/components/Loader';
import TableSearch from '@/components/TableSearch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useCreateService, useDeleteService, useServices, useUpdateService } from '@/features/services/queries';
import { apiErrorMessage } from '@/lib/api';
import { formatRupiah } from '@/lib/format';
import type { TierDraft } from '@/pages/services/TierEditor';
import TierEditor from '@/pages/services/TierEditor';
import type { Service } from '@/types/models';

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  description: z.string().optional(),
  price_base: z
    .string()
    .min(1, 'Harga wajib diisi')
    .refine((v) => Number(v) >= 0, 'Harga tidak boleh negatif'),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;
const columnHelper = createColumnHelper<Service>();

function ServiceDialog({
  service,
  open,
  onOpenChange,
}: {
  service: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!service;
  const create = useCreateService();
  const update = useUpdateService(service?.id ?? 0);
  const [serverError, setServerError] = useState<string | null>(null);
  const toDrafts = (s: Service | null): TierDraft[] =>
    (s?.tiers ?? []).map((t) => ({ up_to_km: String(t.up_to_km), price: String(t.price) }));
  const [tiers, setTiers] = useState<TierDraft[]>(() => toDrafts(service));
  const [perKm, setPerKm] = useState(service?.price_per_km != null ? String(service.price_per_km) : '');
  const [tiersFor, setTiersFor] = useState(service);
  if (tiersFor !== service) {
    setTiersFor(service);
    setTiers(toDrafts(service));
    setPerKm(service?.price_per_km != null ? String(service.price_per_km) : '');
  }

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: service?.name ?? '',
      description: service?.description ?? '',
      price_base: service ? String(service.price_base) : '',
      is_active: service?.is_active ?? true,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const filled = tiers.filter((t) => t.up_to_km !== '' || t.price !== '');
    if (filled.some((t) => !(Number(t.up_to_km) > 0) || t.price === '' || Number(t.price) < 0)) {
      setServerError('Lengkapi tiap tier: batas km (> 0) dan harga.');
      return;
    }
    const payload = {
      ...values,
      price_base: Number(values.price_base),
      tiers: filled.map((t) => ({ up_to_km: Number(t.up_to_km), price: Number(t.price) })),
      price_per_km: filled.length > 0 && perKm !== '' ? Number(perKm) : null,
    };
    try {
      if (isEdit) await update.mutateAsync(payload);
      else await create.mutateAsync(payload);
      reset();
      onOpenChange(false);
    } catch (err) {
      setServerError(apiErrorMessage(err, 'Gagal menyimpan'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Layanan' : 'Tambah Layanan'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nama layanan</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="price_base">
              Harga dasar <span className="font-normal text-muted-foreground">(flat, atau jika titik tujuan belum ada)</span>
            </Label>
            <Input id="price_base" type="number" step="1" {...register('price_base')} />
            {errors.price_base && (
              <p className="text-xs text-destructive">{errors.price_base.message}</p>
            )}
          </div>
          <TierEditor tiers={tiers} onChange={setTiers} perKm={perKm} onPerKmChange={setPerKm} />
          <div className="space-y-1.5">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea id="description" rows={2} {...register('description')} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="is_active">Aktif</Label>
            <Switch
              id="is_active"
              checked={watch('is_active')}
              onCheckedChange={(v) => setValue('is_active', v)}
            />
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

export default function ServicesPage() {
  const { data: services, isLoading } = useServices();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const openFromLink = searchParams.has('tambah');

  // "?tambah=1" (from the setup checklist) opens "Tambah Layanan" right away.
  useEffect(() => {
    if (!openFromLink) return;
    setEditing(null);
    setDialogOpen(true);
    setSearchParams({}, { replace: true });
  }, [openFromLink, setSearchParams]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (svc: Service) => {
    setEditing(svc);
    setDialogOpen(true);
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', { header: 'Nama' }),
      columnHelper.accessor('price_base', {
        header: 'Harga dasar',
        cell: (info) => formatRupiah(info.getValue()),
      }),
      columnHelper.accessor((s) => s.tiers?.length ?? 0, {
        id: 'tiers',
        header: 'Tarif',
        cell: (info) => {
          const s = info.row.original;
          const tiers = [...(s.tiers ?? [])].sort((a, b) => a.up_to_km - b.up_to_km);
          if (tiers.length === 0) return <span className="text-muted-foreground">Flat</span>;
          return (
            <div className="text-xs leading-5">
              {tiers.map((t) => (
                <div key={t.up_to_km}>
                  s/d {t.up_to_km} km: <span className="font-medium">{formatRupiah(t.price)}</span>
                </div>
              ))}
              {s.price_per_km != null && (
                <div className="text-muted-foreground">
                  &gt; {tiers.at(-1)?.up_to_km} km: +{formatRupiah(s.price_per_km)}/km
                </div>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('description', {
        header: 'Deskripsi',
        cell: (info) => info.getValue() ?? '—',
      }),
      columnHelper.accessor('is_active', {
        header: 'Status',
        cell: (info) => (
          <Badge variant={info.getValue() ? 'default' : 'outline'}>
            {info.getValue() ? 'Aktif' : 'Nonaktif'}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => openEdit(info.row.original)}>
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleting(info.row.original)}
            >
              Hapus
            </Button>
          </div>
        ),
      }),
    ],
    [],
  );

  const [deleting, setDeleting] = useState<Service | null>(null);
  const remove = useDeleteService();

  const [globalFilter, setGlobalFilter] = useState('');
  const table = useReactTable({
    data: services ?? [],
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TableSearch value={globalFilter} onChange={setGlobalFilter} placeholder="Cari layanan…" />
        <Button onClick={openCreate}>Tambah Layanan</Button>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead key={header.id}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                      <Loader label="Memuat layanan…" />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && table.getRowModel().rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                      Nggak ada yang cocok dengan pencarian.
                    </TableCell>
                  </TableRow>
                )}
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ServiceDialog service={editing} open={dialogOpen} onOpenChange={setDialogOpen} />

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`Hapus layanan "${deleting?.name ?? ''}"?`}
        description="Data yang dihapus tidak bisa dikembalikan. Kalau masih dipakai order, hapus akan ditolak — nonaktifkan saja lewat Edit."
        onConfirm={() => remove.mutateAsync(deleting!)}
      />
    </div>
  );
}
