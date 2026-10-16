import { BadgeCheckIcon, LoaderCircleIcon, TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useReplaceLicense, useSetupStatus } from '@/features/setup/queries';
import { apiErrorMessage } from '@/lib/api';

const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

/** 2026-10-03 → "3 Oktober 2026" (parsed as a local date, no timezone shift). */
function formatDate(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  return y ? dateFmt.format(new Date(y, m - 1, d)) : ymd;
}

/** The active license, and a field to paste a new one (renewal or a renamed RS). */
export default function LicenseCard() {
  const license = useSetupStatus().data?.license;
  const replace = useReplaceLicense();
  const [key, setKey] = useState('');
  const [editing, setEditing] = useState(false);

  if (!license) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Lisensi
          {license.expired ? (
            <Badge variant="destructive">Kedaluwarsa</Badge>
          ) : (
            <Badge variant="secondary">
              <BadgeCheckIcon /> Aktif
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Nama RS mengikuti lisensi. Hubungi penyedia aplikasi untuk perpanjangan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Pemegang lisensi</dt>
            <dd className="font-medium">{license.rs}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">No. lisensi</dt>
            <dd className="font-medium">{license.no}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Diterbitkan</dt>
            <dd className="font-medium">{formatDate(license.issued)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Berlaku sampai</dt>
            <dd className="font-medium">{license.expires ? formatDate(license.expires) : 'Seumur hidup'}</dd>
          </div>
        </dl>

        {editing ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              replace.mutate(key.trim(), {
                onSuccess: () => {
                  setKey('');
                  setEditing(false);
                },
              });
            }}
          >
            {replace.isError && (
              <Alert variant="destructive">
                <AlertDescription>{apiErrorMessage(replace.error, 'Gagal memperbarui lisensi')}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="new_license">Kode lisensi baru</Label>
              <Textarea
                id="new_license"
                rows={3}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="MSND-…"
                className="font-mono text-xs break-all"
                spellCheck={false}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={!key.trim() || replace.isPending}>
                {replace.isPending && <LoaderCircleIcon className="animate-spin" />}
                Simpan lisensi
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" onClick={() => setEditing(true)}>
            Ganti / perpanjang lisensi
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** Admin-only notice at the top of the panel once the license has run out. */
export function LicenseExpiredBanner() {
  const license = useSetupStatus().data?.license;
  if (!license?.expired) return null;
  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
      <TriangleAlertIcon />
      <AlertDescription className="text-inherit">
        Lisensi {license.no} berakhir {formatDate(license.expires)}. Aplikasi tetap bisa dipakai — hubungi penyedia
        aplikasi untuk perpanjangan, lalu masukkan kode baru di{' '}
        <Link to="/pengaturan/rs?tab=lisensi" className="font-semibold underline underline-offset-2">
          Profil RS → Lisensi
        </Link>
        .
      </AlertDescription>
    </Alert>
  );
}
