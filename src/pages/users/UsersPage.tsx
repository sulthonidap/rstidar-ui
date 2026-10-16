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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRoles } from '@/features/roles/queries';
import { useCreateUser, useUpdateUser, useUsers } from '@/features/users/queries';
import { apiErrorMessage } from '@/lib/api';
import type { User } from '@/types/models';

const schema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  phone: z.string().optional(),
  password: z.string().optional(),
  role_id: z.string().min(1, 'Role wajib dipilih'),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;
const columnHelper = createColumnHelper<User>();

function UserDialog({
  user,
  defaultRoleId,
  open,
  onOpenChange,
}: {
  user: User | null;
  /** Role picked in advance for a new user ("?tambah=kurir" from the setup checklist). */
  defaultRoleId?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!user;
  const create = useCreateUser();
  const update = useUpdateUser(user?.id ?? 0);
  const { data: roles } = useRoles();
  const [serverError, setServerError] = useState<string | null>(null);

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
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: user?.phone ?? '',
      password: '',
      role_id: user?.role_id ? String(user.role_id) : defaultRoleId ? String(defaultRoleId) : '',
      is_active: user?.is_active ?? true,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    if (!isEdit && !values.password) {
      setServerError('Password wajib diisi buat user baru');
      return;
    }
    const payload = {
      name: values.name,
      email: values.email,
      phone: values.phone,
      ...(values.password ? { password: values.password } : {}),
      role_id: Number(values.role_id),
      is_active: values.is_active,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User' : 'Tambah User'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nama</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telepon</Label>
              <Input id="phone" {...register('phone')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register('password')} />
            <p className="text-xs text-muted-foreground">
              {isEdit ? 'Kosongkan kalau tidak ingin mengubah password.' : 'Wajib diisi.'}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={watch('role_id')} onValueChange={(v) => setValue('role_id', v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="— pilih role —" />
              </SelectTrigger>
              <SelectContent>
                {roles?.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.label ?? r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role_id && <p className="text-xs text-destructive">{errors.role_id.message}</p>}
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

export default function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [presetRoleId, setPresetRoleId] = useState<number>();
  const { data: roles } = useRoles();
  const [searchParams, setSearchParams] = useSearchParams();
  const presetRole = searchParams.get('tambah');

  // "?tambah=<role>" (from the setup checklist) opens "Tambah User" with that role picked.
  useEffect(() => {
    if (!presetRole || !roles) return;
    setEditing(null);
    setPresetRoleId(roles.find((r) => r.name === presetRole)?.id);
    setDialogOpen(true);
    setSearchParams({}, { replace: true });
  }, [presetRole, roles, setSearchParams]);

  const openCreate = () => {
    setEditing(null);
    setPresetRoleId(undefined);
    setDialogOpen(true);
  };
  const openEdit = (u: User) => {
    setEditing(u);
    setDialogOpen(true);
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', { header: 'Nama' }),
      columnHelper.accessor('email', { header: 'Email' }),
      columnHelper.accessor((row) => row.role?.label ?? row.role?.name, {
        id: 'role',
        header: 'Role',
        cell: (info) => <Badge variant="secondary">{info.getValue() ?? '—'}</Badge>,
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
          <Button variant="outline" size="sm" onClick={() => openEdit(info.row.original)}>
            Edit
          </Button>
        ),
      }),
    ],
    [],
  );

  const [globalFilter, setGlobalFilter] = useState('');
  const table = useReactTable({
    data: users ?? [],
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TableSearch value={globalFilter} onChange={setGlobalFilter} placeholder="Cari nama/email…" />
        <Button onClick={openCreate}>Tambah User</Button>
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
                      <Loader label="Memuat user…" />
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

      <UserDialog user={editing} defaultRoleId={presetRoleId} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
