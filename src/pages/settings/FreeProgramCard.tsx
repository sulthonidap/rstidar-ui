import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useFreeProgram, useUpdateFreeProgram } from '@/features/free-program/queries';
import { apiErrorMessage } from '@/lib/api';
import type { FreeProgram } from '@/types/models';

/** Admin: turn the program ongkir gratis (lansia/disabilitas) on or off and set its domicile requirement. */
export default function FreeProgramCard() {
  const { data } = useFreeProgram();
  const update = useUpdateFreeProgram();
  const [edits, setEdits] = useState<Partial<FreeProgram>>({});
  const value: FreeProgram = { enabled: false, domicile: 'Kota Magelang', ...data, ...edits };
  const dirty = Object.keys(edits).length > 0;

  const save = () =>
    update.mutate(value, {
      onSuccess: () => setEdits({}),
    });

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Program ongkir gratis</CardTitle>
        <CardDescription>
          Pasien lansia/disabilitas yang domisilinya sudah dicek petugas (KTP) tidak membayar ongkir. Petugas memilih
          kategori pasien di form order; pasien tidak bisa memilih sendiri.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {update.isError && (
          <Alert variant="destructive">
            <AlertDescription>{apiErrorMessage(update.error, 'Gagal menyimpan')}</AlertDescription>
          </Alert>
        )}
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={value.enabled} onCheckedChange={(v) => setEdits((e) => ({ ...e, enabled: v }))} />
          {value.enabled ? 'Aktif — muncul di form order petugas' : 'Nonaktif'}
        </label>
        <div className="max-w-sm space-y-1.5">
          <Label htmlFor="free_domicile">Syarat domisili</Label>
          <Input
            id="free_domicile"
            value={value.domicile}
            placeholder="Kota Magelang"
            onChange={(e) => setEdits((prev) => ({ ...prev, domicile: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">Ditampilkan ke petugas: "Domisili … — sudah dicek dari KTP".</p>
        </div>
        <Button onClick={save} disabled={!dirty || update.isPending}>
          Simpan
        </Button>
      </CardContent>
    </Card>
  );
}
