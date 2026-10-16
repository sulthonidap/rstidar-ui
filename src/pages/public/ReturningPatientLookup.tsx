import { CheckCircle2Icon, LightbulbIcon, LoaderCircleIcon, SearchIcon } from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ReturningPatient } from '@/features/public/queries';
import { useReturningPatient } from '@/features/public/queries';
import { apiErrorMessage } from '@/lib/api';

const STEPS = [
  'Ketik nomor HP atau No. Rekam Medis yang kamu pakai waktu pesan sebelumnya.',
  <>
    Tekan <b>Cari data saya</b>.
  </>,
  'Data penerima, pasien, dan alamat terisi otomatis di bawah — periksa lagi, ubah kalau ada yang berbeda.',
];

/**
 * "Pasien lama": one search box for the phone number or medical record number
 * of an earlier order; `onFound` gets that order's details to prefill the form.
 */
export default function ReturningPatientLookup({ onFound }: { onFound: (p: ReturningPatient) => void }) {
  const lookup = useReturningPatient();
  const [query, setQuery] = useState('');
  const ready = query.trim() !== '';

  const search = async () => {
    if (!ready) return;
    try {
      onFound(await lookup.mutateAsync({ query: query.trim() }));
    } catch {
      // Shown below.
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <LightbulbIcon className="size-4 shrink-0" />
          Cara isi data otomatis
        </p>
        <ol className="mt-2 space-y-1.5 text-sm">
          {STEPS.map((step, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-amber-500 text-xs font-bold text-white">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lookup_query">No. HP atau No. Rekam Medis</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="lookup_query"
              autoComplete="off"
              placeholder="mis. 0812xxxx atau nomor di kartu berobat"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault(); // don't submit the order form
                  void search();
                }
              }}
            />
          </div>
          <Button type="button" onClick={search} disabled={!ready || lookup.isPending}>
            {lookup.isPending ? <LoaderCircleIcon className="animate-spin" /> : <SearchIcon />}
            Cari data saya
          </Button>
        </div>
      </div>

      {lookup.isSuccess && (
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2Icon className="size-4 shrink-0" />
          Data ditemukan dan sudah diisi di bawah. Periksa lagi, ubah kalau ada yang berbeda.
        </p>
      )}
      {lookup.isError && (
        <Alert variant="destructive">
          <AlertDescription>{apiErrorMessage(lookup.error, 'Gagal mencari data. Coba lagi.')}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
