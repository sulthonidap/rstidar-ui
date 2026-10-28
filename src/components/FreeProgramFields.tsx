import { BadgeCheckIcon } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useFreeProgram } from '@/features/free-program/queries';
import { formatRupiah } from '@/lib/format';
import { PATIENT_CATEGORY_LABELS, type PatientCategory } from '@/types/models';

export interface FreeProgramValue {
  category: PatientCategory;
  /** Staff checked the patient's domicile (KTP). */
  domicileChecked: boolean;
}

export const NO_FREE_PROGRAM: FreeProgramValue = { category: 'umum', domicileChecked: false };

const CATEGORIES: PatientCategory[] = ['umum', 'lansia', 'disabilitas'];

/**
 * "Program ongkir gratis" on the staff order forms: the staff verify the patient
 * (lansia/disabilitas + domicile from the KTP). Hidden while the Admin hasn't
 * turned the program on. `price` is the tariff, shown as the normal price.
 */
export default function FreeProgramFields({
  value,
  onChange,
  price,
}: {
  value: FreeProgramValue;
  onChange: (value: FreeProgramValue) => void;
  price?: number;
}) {
  const { data: program } = useFreeProgram();
  if (!program?.enabled) return null;

  const special = value.category !== 'umum';
  const free = special && value.domicileChecked;

  return (
    <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label>Kategori pasien</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={value.category}
          onValueChange={(v) => {
            if (!v) return; // re-clicking the active item sends ''
            const category = v as PatientCategory;
            onChange({ category, domicileChecked: category === 'umum' ? false : value.domicileChecked });
          }}
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

      {special && (
        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            className="mt-0.5"
            checked={value.domicileChecked}
            onCheckedChange={(v) => onChange({ ...value, domicileChecked: v === true })}
          />
          <span>
            Domisili <b>{program.domicile}</b> — sudah dicek dari KTP
            {value.category === 'disabilitas' && ' dan kartu/surat keterangan disabilitas'}
          </span>
        </label>
      )}

      {free ? (
        <p className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
          <BadgeCheckIcon className="size-4 shrink-0" />
          Ongkir GRATIS{price != null && price > 0 && ` (normal ${formatRupiah(price)})`}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Ongkir gratis untuk pasien lansia/disabilitas berdomisili {program.domicile}, setelah petugas mengecek
          identitasnya.
        </p>
      )}
    </div>
  );
}
