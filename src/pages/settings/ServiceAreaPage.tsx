import { ChevronDownIcon, ChevronRightIcon, MapPinIcon, XIcon } from 'lucide-react';
import { useState } from 'react';

import Loader from '@/components/Loader';
import TableSearch from '@/components/TableSearch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useRegions, useServiceArea, useUpdateServiceArea } from '@/features/regions/queries';
import { apiErrorMessage } from '@/lib/api';
import type { Region } from '@/types/models';

const inside = (code: string, parent: string) => code.startsWith(parent + '.');

/** The kecamatan of one kab/kota, to serve only some of them. */
function DistrictList({
  city,
  codes,
  onChange,
  remember,
}: {
  city: Region;
  codes: string[];
  onChange: (codes: string[]) => void;
  remember: (regions: Region[], prefix: string) => void;
}) {
  const { data: districts, isLoading } = useRegions(city.code, { all: true });
  if (isLoading) return <Loader label="Memuat kecamatan…" />;
  if (!districts) return null;

  const whole = codes.includes(city.code);
  const toggle = (district: Region) => {
    remember(districts, `Kec. `);
    const picked = whole || codes.includes(district.code);
    let next: string[];
    if (whole) {
      // Was the whole kab/kota: keep every other kecamatan.
      next = [...codes.filter((c) => c !== city.code), ...districts.filter((d) => d.code !== district.code).map((d) => d.code)];
    } else if (picked) {
      next = codes.filter((c) => c !== district.code);
    } else {
      next = [...codes, district.code];
      // Every kecamatan picked = the whole kab/kota.
      if (districts.every((d) => next.includes(d.code))) {
        next = [...next.filter((c) => !inside(c, city.code)), city.code];
      }
    }
    onChange(next);
  };

  return (
    <div className="grid gap-x-4 gap-y-2 py-2 pl-9 sm:grid-cols-2 lg:grid-cols-3">
      {districts.map((d) => (
        <label key={d.code} className="flex items-center gap-2 text-sm">
          <Checkbox checked={whole || codes.includes(d.code)} onCheckedChange={() => toggle(d)} />
          {d.name}
        </label>
      ))}
    </div>
  );
}

/**
 * Admin: wilayah layanan. Alamat tujuan order (form petugas, form publik, kiosk)
 * hanya bisa memilih kelurahan/desa di wilayah yang dicentang di sini.
 */
export default function ServiceAreaPage() {
  const { data: saved, isLoading } = useServiceArea();
  const update = useUpdateServiceArea();
  const { data: provinces } = useRegions('', { all: true });
  const province = provinces?.[0];
  const { data: cities } = useRegions(province?.code ?? '', { all: true, enabled: !!province });

  // null = not edited yet (shows what's saved).
  const [edited, setEdited] = useState<string[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  // Names of the regions picked on this page, for the chips before saving.
  const [names, setNames] = useState<Record<string, string>>({});

  const codes = edited ?? saved?.map((r) => r.code) ?? [];
  const dirty = edited !== null;
  const labelOf = (code: string) =>
    saved?.find((r) => r.code === code)?.label ??
    names[code] ??
    cities?.find((c) => c.code === code)?.name ??
    code;
  const remember = (regions: Region[], prefix: string) =>
    setNames((n) => ({ ...n, ...Object.fromEntries(regions.map((r) => [r.code, prefix + r.name])) }));

  const toggleCity = (city: Region) => {
    if (codes.includes(city.code)) setEdited(codes.filter((c) => c !== city.code));
    else setEdited([...codes.filter((c) => !inside(c, city.code)), city.code]);
  };

  const rows = (cities ?? []).filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()));

  if (isLoading) return <Loader label="Memuat wilayah layanan…" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wilayah yang dilayani</CardTitle>
          <CardDescription>
            Pasien dan petugas hanya bisa memilih kelurahan/desa di wilayah ini saat membuat order. Alamat di luar
            wilayah ditolak. Ongkir tetap dihitung dari jarak.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {update.isError && (
            <Alert variant="destructive">
              <AlertDescription>{apiErrorMessage(update.error, 'Gagal menyimpan')}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-wrap gap-2">
            {codes.length === 0 && <p className="text-sm text-destructive">Belum ada wilayah dipilih.</p>}
            {codes.map((code) => (
              <Badge key={code} variant="secondary" className="gap-1 py-1 pr-1 pl-2">
                <MapPinIcon className="size-3" />
                {labelOf(code)}
                <button
                  type="button"
                  className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
                  aria-label={`Hapus ${labelOf(code)}`}
                  onClick={() => setEdited(codes.filter((c) => c !== code))}
                >
                  <XIcon className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => update.mutate(codes, { onSuccess: () => setEdited(null) })}
              disabled={!dirty || codes.length === 0 || update.isPending}
            >
              {update.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
            {dirty && (
              <Button variant="outline" onClick={() => setEdited(null)}>
                Batal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kabupaten/Kota di {province?.name ?? '…'}</CardTitle>
          <CardDescription>
            Centang kab/kota untuk melayani seluruhnya, atau buka untuk memilih kecamatan tertentu saja.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <TableSearch value={search} onChange={setSearch} placeholder="Cari kab/kota…" />
          <div className="divide-y rounded-lg border">
            {rows.map((city) => {
              const some = codes.some((c) => inside(c, city.code));
              const expanded = open === city.code;
              return (
                <div key={city.code} className="px-3">
                  <div className="flex items-center gap-3 py-2">
                    <Checkbox
                      checked={codes.includes(city.code) ? true : some ? 'indeterminate' : false}
                      onCheckedChange={() => toggleCity(city)}
                      aria-label={city.name}
                    />
                    <span className="flex-1 text-sm font-medium">{city.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => setOpen(expanded ? null : city.code)}>
                      {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                      Kecamatan
                    </Button>
                  </div>
                  {expanded && (
                    <DistrictList
                      city={city}
                      codes={codes}
                      onChange={setEdited}
                      remember={(regions, prefix) =>
                        remember(regions.map((r) => ({ ...r, name: `${r.name}, ${city.name}` })), prefix)
                      }
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
