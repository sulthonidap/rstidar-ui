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
  const value: FreeProgram = { enabled: false, public: false, domicile: 'Kota Magelang', ...data, ...edits };
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
          Pasien lansia/disabilitas yang domisilinya sudah dicek petugas (KTP) tidak membayar ongkir. Bisa dinyalakan
          terpisah untuk form petugas dan form pasien.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {update.isError && (
          <Alert variant="destructive">
            <AlertDescription>{apiErrorMessage(update.error, 'Gagal menyimpan')}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-3">
          <label className="flex items-start gap-3 text-sm">
            <Switch checked={value.enabled} onCheckedChange={(v) => setEdits((e) => ({ ...e, enabled: v }))} />
            <span>
              <span className="font-medium">Form petugas</span> (Buat order)
              <span className="block text-xs text-muted-foreground">
                Petugas mengecek KTP lalu memilih kategori pasien — ongkir langsung gratis.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <Switch checked={value.public} onCheckedChange={(v) => setEdits((e) => ({ ...e, public: v }))} />
            <span>
              <span className="font-medium">Form pasien &amp; kiosk</span>
              <span className="block text-xs text-muted-foreground">
                Pasien bisa mengajukan sebagai lansia/disabilitas. Gratis setelah CCO mengecek KTP dan menyetujuinya
                lewat tombol "Cek pengajuan gratis" di order.
              </span>
            </span>
          </label>
        </div>
        <div className="max-w-sm space-y-1.5">
          <Label htmlFor="free_domicile">Syarat domisili</Label>
          <Input
            id="free_domicile"
            value={value.domicile}
            placeholder="Kota Magelang"
            onChange={(e) => setEdits((prev) => ({ ...prev, domicile: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">Ditampilkan ke petugas: "KTP pasien berdomisili …".</p>
        </div>
        <Button onClick={save} disabled={!dirty || update.isPending}>
          Simpan
        </Button>
      </CardContent>
    </Card>
  );
}
