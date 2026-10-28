import { useState } from 'react';

import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import Loader from '@/components/Loader';
import TableSearch from '@/components/TableSearch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useDeleteWard,
  usePharmacySettings,
  useSaveWard,
  useUpdatePharmacySettings,
  useWards,
} from '@/features/wards/queries';
import { apiErrorMessage } from '@/lib/api';
import type { Ward } from '@/types/models';

function WardDialog({ ward, onClose }: { ward: Ward | null; onClose: () => void }) {
  const save = useSaveWard(ward?.id);
  const [name, setName] = useState(ward?.name ?? '');
  const [active, setActive] = useState(ward?.is_active ?? true);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    save.mutate({ name: name.trim(), is_active: active }, { onSuccess: onClose });
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{ward ? 'Edit Bangsal' : 'Tambah Bangsal'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {save.isError && (
            <Alert variant="destructive">
              <AlertDescription>{apiErrorMessage(save.error, 'Gagal menyimpan')}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="ward_name">Nama bangsal</Label>
            <Input id="ward_name" value={name} maxLength={100} autoFocus onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="ward_active">Aktif</Label>
              <p className="text-xs text-muted-foreground">Bangsal nonaktif tidak muncul di form order.</p>
            </div>
            <Switch id="ward_active" checked={active} onCheckedChange={setActive} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || save.isPending}>
              {save.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Admin toggle: whether patients pick farmasi themselves on the public form & kiosk. */
function PublicPharmacyCard() {
  const { data } = usePharmacySettings();
  const update = useUpdatePharmacySettings();
  const on = !!data?.public;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Farmasi di form pasien</CardTitle>
        <CardDescription>
          Form order petugas selalu menanyakan farmasi (rawat jalan + no. antrian, atau rawat inap + bangsal). Nyalakan
          supaya pasien yang order lewat link form dan kiosk juga wajib memilihnya sendiri.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <label className="flex items-center gap-3 text-sm">
          <Switch
            checked={on}
            disabled={!data || update.isPending}
            onCheckedChange={(v) => update.mutate({ public: v })}
          />
          {on ? 'Aktif — pasien memilih farmasi di form & kiosk' : 'Nonaktif — farmasi diisi petugas lewat Edit order'}
        </label>
      </CardContent>
    </Card>
  );
}

/** Admin: master bangsal rawat inap, dipilih di order farmasi rawat inap. */
export default function WardsPage() {
  const { data: wards, isLoading } = useWards();
  const [search, setSearch] = useState('');
  // undefined = closed, null = new ward.
  const [editing, setEditing] = useState<Ward | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Ward | null>(null);
  const remove = useDeleteWard();

  const rows = (wards ?? []).filter((w) => w.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="space-y-4">
      <PublicPharmacyCard />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TableSearch value={search} onChange={setSearch} placeholder="Cari bangsal…" />
        <Button onClick={() => setEditing(null)}>Tambah Bangsal</Button>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Aksi</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    <Loader label="Memuat bangsal…" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    {search ? 'Nggak ada yang cocok dengan pencarian.' : 'Belum ada bangsal.'}
                  </TableCell>
                </TableRow>
              )}
              {rows.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell>
                    <Badge variant={w.is_active ? 'default' : 'outline'}>{w.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditing(w)}>
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleting(w)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing !== undefined && <WardDialog key={editing?.id ?? 'new'} ward={editing} onClose={() => setEditing(undefined)} />}

      <ConfirmDeleteDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={`Hapus bangsal "${deleting?.name ?? ''}"?`}
        description="Kalau sudah dipakai order, hapus akan ditolak — nonaktifkan saja lewat Edit."
        onConfirm={() => remove.mutateAsync(deleting!)}
      />
    </div>
  );
}
