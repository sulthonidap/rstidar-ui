import { InfoIcon } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { PATIENT_CATEGORY_LABELS, type PatientCategory } from '@/types/models';

const CATEGORIES: PatientCategory[] = ['umum', 'lansia', 'disabilitas'];

/**
 * "Program ongkir gratis" on the public form & kiosk: the patient says they're
 * lansia/disabilitas. Only a claim — the ongkir turns free once the RS staff
 * checked the KTP (Edit order), so the price shown stays the normal one.
 */
export default function PublicFreeProgramFields({
  value,
  onChange,
  domicile,
  large,
}: {
  value: PatientCategory;
  onChange: (value: PatientCategory) => void;
  domicile: string;
  /** Kiosk: bigger touch targets. */
  large?: boolean;
}) {
  return (
    <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label className={large ? 'text-base' : undefined}>Kategori pasien</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          size={large ? 'lg' : 'sm'}
          value={value}
          onValueChange={(v) => v && onChange(v as PatientCategory)}
        >
          {CATEGORIES.map((c) => (
            <ToggleGroupItem
              key={c}
              value={c}
              className="px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {c === 'lansia' ? 'Lansia (60+)' : PATIENT_CATEGORY_LABELS[c]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <InfoIcon className="mt-0.5 size-4 shrink-0" />
        {value === 'umum' ? (
          <span>
            Ongkir gratis untuk pasien lansia (60+) atau disabilitas yang berdomisili {domicile}. Pilih kategorinya
            kalau sesuai.
          </span>
        ) : (
          <span>
            Ongkir <b>gratis setelah petugas RS mengecek</b> KTP (domisili {domicile}
            {value === 'disabilitas' ? ') dan kartu/surat keterangan disabilitas' : ', umur 60+)'}. Sebelum dicek,
            biaya yang tampil masih biaya normal.
          </span>
        )}
      </p>
    </div>
  );
}
