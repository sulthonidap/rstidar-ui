import { BadgeCheckIcon, TriangleAlertIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
 * (lansia/disabilitas + domicile from the KTP) and pick the category, which marks
 * the domicile as checked. Hidden while the Admin hasn't turned the program on
 * for the staff form; `verify` (Edit order) also shows it while it's on for the
 * public form only, so CCO can confirm a patient's claim. `price` is the tariff,
 * shown as the normal price.
 */
export default function FreeProgramFields({
  value,
  onChange,
  price,
  verify,
}: {
  value: FreeProgramValue;
  onChange: (value: FreeProgramValue) => void;
  price?: number;
  verify?: boolean;
}) {
  const { data: program } = useFreeProgram();
  if (!program?.enabled && !(verify && program?.public)) return null;

  const special = value.category !== 'umum';
  const free = special && value.domicileChecked;
  // From the public form: the patient picked the category, nobody checked yet.
  const claim = special && !value.domicileChecked;

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
            // Picking Lansia/Disabilitas is the staff's statement that they checked
            // the patient's documents (see the notice below).
            onChange({ category, domicileChecked: category !== 'umum' });
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

      {claim && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-300 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/10 dark:text-sky-200">
          <span>
            Pasien mengajukan ongkir gratis sebagai <b>{PATIENT_CATEGORY_LABELS[value.category]}</b> — belum dicek.
          </span>
          <Button type="button" size="sm" onClick={() => onChange({ ...value, domicileChecked: true })}>
            Sudah dicek, gratiskan
          </Button>
        </div>
      )}

      {special && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Pastikan sudah dicek sebelum memilih {PATIENT_CATEGORY_LABELS[value.category]}:</p>
            <ul className="mt-1 list-disc space-y-0.5 ps-4">
              <li>
                KTP pasien berdomisili <b>{program.domicile}</b>
              </li>
              {value.category === 'lansia' ? (
                <li>Umur pasien 60 tahun ke atas (lihat tanggal lahir di KTP)</li>
              ) : (
                <li>Kartu / surat keterangan disabilitas</li>
              )}
            </ul>
            <p className="mt-1 text-xs">Nama petugas yang memilih tercatat di riwayat order.</p>
          </div>
        </div>
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
