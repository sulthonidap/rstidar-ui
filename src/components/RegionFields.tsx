import { useState } from 'react';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRegions } from '@/features/regions/queries';
import type { Region } from '@/types/models';

// Kemendagri codes are fixed-width per level: "33" → "33.71" → "33.71.01" → "33.71.01.1001".
const provinceOf = (code: string) => code.slice(0, 2);
const cityOf = (code: string) => code.slice(0, 5);
const districtOf = (code: string) => code.slice(0, 8);

/** "Kel." for a kelurahan (village number starting with 1), "Desa" otherwise. */
const villageName = (r: Region) => `${r.code.split('.')[3]?.startsWith('1') ? 'Kel.' : 'Desa'} ${r.name}`;

function RegionSelect({
  id,
  label,
  placeholder,
  value,
  options,
  onChange,
  invalid,
  name = (r) => r.name,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  options: Region[] | undefined;
  onChange: (code: string) => void;
  invalid?: boolean;
  name?: (r: Region) => string;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={!options?.length}>
        <SelectTrigger id={id} className="w-full" aria-invalid={invalid && !value}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        {/* Below the field, short with a scrollbar: a kecamatan can have 20+ desa. */}
        <SelectContent position="popper" className="max-h-72">
          {options?.map((r) => (
            <SelectItem key={r.code} value={r.code}>
              {name(r)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Destination kab/kota → kecamatan → kelurahan/desa, listing only the service
 * area (Pengaturan → Wilayah Layanan). `value` is the kelurahan/desa code ('' =
 * not picked yet). `currentLabel`: an edited order's saved region, shown when the
 * area no longer lists it.
 */
export default function RegionFields({
  value,
  onChange,
  error,
  currentLabel,
}: {
  value: string;
  onChange: (code: string) => void;
  error?: string | null;
  currentLabel?: string | null;
}) {
  // Partial picks (kab/kota, kecamatan) until a kelurahan/desa is chosen.
  const [draft, setDraft] = useState({ province: '', city: '', district: '' });

  const provinces = useRegions('');
  const onlyProvince = provinces.data?.length === 1 ? provinces.data[0].code : '';
  const province = value ? provinceOf(value) : draft.province || onlyProvince;
  const city = value ? cityOf(value) : draft.city;
  const district = value ? districtOf(value) : draft.district;

  const cities = useRegions(province, { enabled: !!province });
  const districts = useRegions(city, { enabled: !!city });
  const villages = useRegions(district, { enabled: !!district });

  const pick = (next: { province: string; city: string; district: string }) => {
    setDraft(next);
    onChange('');
  };
  const savedElsewhere =
    !!value && !!currentLabel && villages.isSuccess && !villages.data.some((r) => r.code === value);

  return (
    <div className="space-y-2">
      <div className={`grid gap-3 ${(provinces.data?.length ?? 0) > 1 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
        {(provinces.data?.length ?? 0) > 1 && (
          <RegionSelect
            id="region_province"
            label="Provinsi"
            placeholder="— pilih provinsi —"
            value={province}
            options={provinces.data}
            onChange={(code) => pick({ province: code, city: '', district: '' })}
            invalid={!!error}
          />
        )}
        <RegionSelect
          id="region_city"
          label="Kabupaten/Kota"
          placeholder="— pilih kab/kota —"
          value={city}
          options={cities.data}
          onChange={(code) => pick({ province, city: code, district: '' })}
          invalid={!!error}
        />
        <RegionSelect
          id="region_district"
          label="Kecamatan"
          placeholder="— pilih kecamatan —"
          value={district}
          options={districts.data}
          onChange={(code) => pick({ province, city, district: code })}
          invalid={!!error}
        />
        <RegionSelect
          id="region_village"
          label="Kelurahan/Desa"
          placeholder="— pilih kelurahan/desa —"
          value={savedElsewhere ? '' : value}
          options={villages.data}
          onChange={(code) => {
            setDraft({ province, city, district });
            onChange(code);
          }}
          invalid={!!error}
          name={villageName}
        />
      </div>
      {savedElsewhere && (
        <p className="text-xs text-muted-foreground">
          Tersimpan: {currentLabel} (sudah di luar wilayah layanan, tetap dipakai kalau tidak diganti).
        </p>
      )}
      {provinces.isSuccess && provinces.data.length === 0 && (
        <p className="text-xs text-destructive">Wilayah layanan belum diatur. Minta Admin mengaturnya.</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">Hanya wilayah yang dilayani yang bisa dipilih.</p>
    </div>
  );
}
