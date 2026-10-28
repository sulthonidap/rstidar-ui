import { zodResolver } from '@hookform/resolvers/zod';
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import DataTablePagination from '@/components/DataTablePagination';
import Loader from '@/components/Loader';
import LocationPicker from '@/components/LocationPicker';
import TableSearch from '@/components/TableSearch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useCustomers, useDeleteCustomer, useSaveCustomer } from '@/features/customers/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { apiErrorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { LatLng } from '@/lib/geocode';
import { cn } from '@/lib/utils';
import type { Customer } from '@/types/models';

const schema = z.object({
  name: z.string().trim().min(1, 'Nama wajib diisi').max(255, 'Maksimal 255 karakter'),
  phone: z
    .string()
    .trim()
    .max(30, 'Maksimal 30 karakter')
    // "*" = the masked number the panel shows, sent back unchanged (the API restores it).
    .regex(/^[0-9+\-\s()*]{6,}$/, 'Nomor HP tidak valid, contoh 081234567890'),
  address: z.string().trim().min(1, 'Alamat wajib diisi').max(1000, 'Maksimal 1000 karakter'),
  notes: z.string().max(1000, 'Maksimal 1000 karakter').optional(),
});

type FormValues = z.infer<typeof schema>;
const columnHelper = createColumnHelper<Customer>();

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

function CustomerDialog({
  customer,
  open,
  onOpenChange,
}: {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!customer;
  const save = useSaveCustomer(customer?.id);
  const [serverError, setServerError] = useState<string | null>(null);
  const initialPoint: LatLng | null = customer?.lat != null && customer?.lng != null ? [customer.lat, customer.lng] : null;
  const [point, setPoint] = useState<LatLng | null>(initialPoint);
  const [pointFor, setPointFor] = useState(customer);
  if (pointFor !== customer) {
    setPointFor(customer);
    setPoint(initialPoint);
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: customer?.name ?? '',
      phone: customer?.phone ?? '',
      address: customer?.address ?? '',
      notes: customer?.notes ?? '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      await save.mutateAsync({
        name: values.name,
        phone: values.phone,
        address: values.address,
        notes: values.notes?.trim() || undefined,
        lat: point?.[0] ?? null,
        lng: point?.[1] ?? null,
      });
      onOpenChange(false);
    } catch (err) {
      setServerError(apiErrorMessage(err, 'Gagal menyimpan'));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setServerError(null);
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Customer' : 'Tambah Customer'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nama</Label>
              <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
              <FieldError message={errors.name?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Nomor HP / WhatsApp</Label>
              <Input id="phone" type="tel" inputMode="tel" placeholder="08xx" aria-invalid={!!errors.phone} {...register('phone')} />
              <FieldError message={errors.phone?.message} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Alamat lengkap</Label>
            <Textarea id="address" rows={3} aria-invalid={!!errors.address} {...register('address')} />
            <FieldError message={errors.address?.message} />
          </div>
          <div className="space-y-1.5">
            <Label>
              Titik lokasi <span className="font-normal text-muted-foreground">(opsional, dipakai lagi di order berikutnya)</span>
            </Label>
            {open && <LocationPicker value={point} onChange={setPoint} pinLabel="Alamat" pinColor="#F07A22" allowMyLocation />}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">
              Catatan <span className="font-normal text-muted-foreground">(opsional, mis. patokan rumah)</span>
            </Label>
            <Textarea id="notes" rows={2} {...register('notes')} />
            <FieldError message={errors.notes?.message} />
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

/** Saved recipients, reused by the internal order form ("customer lama"). */
export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const [prevSearch, setPrevSearch] = useState(debouncedSearch);
  if (debouncedSearch !== prevSearch) {
    setPrevSearch(debouncedSearch);
    setPage(1);
  }

  const { data, isLoading, isPlaceholderData } = useCustomers({ search: debouncedSearch, page, perPage });
  const meta = data?.meta;
  if (meta && page > meta.last_page) setPage(meta.last_page);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const remove = useDeleteCustomer();

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Nama',
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor('phone', { header: 'Nomor HP' }),
      columnHelper.accessor('address', {
        header: 'Alamat',
        cell: (info) => <span className="line-clamp-2 max-w-md whitespace-normal">{info.getValue()}</span>,
      }),
      columnHelper.accessor('order_count', {
        header: 'Order',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('last_order_at', {
        header: 'Order terakhir',
        cell: (info) => (info.getValue() ? formatDateTime(info.getValue()) : '—'),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(info.row.original);
                setDialogOpen(true);
              }}
            >
              <PencilIcon />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleting(info.row.original)}
            >
              <Trash2Icon />
              Hapus
            </Button>
          </div>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TableSearch value={search} onChange={setSearch} placeholder="Cari nama atau nomor HP…" />
        <Button onClick={openCreate}>
          <PlusIcon />
          Tambah Customer
        </Button>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="px-0">
          <div className={cn('overflow-x-auto transition-opacity', isPlaceholderData && 'opacity-60')}>
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
                      <Loader label="Memuat customer…" />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && table.getRowModel().rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                      {debouncedSearch
                        ? 'Nggak ada customer yang cocok dengan pencarian.'
                        : 'Belum ada customer. Customer juga otomatis tersimpan waktu bikin order internal.'}
                    </TableCell>
                  </TableRow>
                )}
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination
            meta={meta}
            onPageChange={setPage}
            onPerPageChange={(n) => {
              setPerPage(n);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

      <CustomerDialog customer={editing} open={dialogOpen} onOpenChange={setDialogOpen} />

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`Hapus customer "${deleting?.name ?? ''}"?`}
        description="Customer hilang dari daftar pilihan. Order yang sudah pernah dibuat tetap utuh."
        onConfirm={() => remove.mutateAsync(deleting!)}
      />
    </div>
  );
}
