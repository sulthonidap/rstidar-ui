import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useWards } from '@/features/wards/queries';
import { CARE_TYPE_LABELS, type CareType, type Order, type Ward } from '@/types/models';

export interface PharmacyValue {
  careType: CareType | null;
  /** Rawat jalan: pharmacy queue number. */
  queueNo: string;
  /** Rawat inap: ward id (as a string, for the Select). */
  wardId: string;
}

export const NO_PHARMACY: PharmacyValue = { careType: null, queueNo: '', wardId: '' };

export const pharmacyOf = (order: Order): PharmacyValue => ({
  careType: order.care_type ?? null,
  queueNo: order.pharmacy_queue_no ?? '',
  wardId: order.ward_id ? String(order.ward_id) : '',
});

/** What's missing before the order can be sent, or null when complete. */
export function pharmacyError(v: PharmacyValue): string | null {
  if (!v.careType) return 'Pilih farmasi: rawat jalan atau rawat inap';
  if (v.careType === 'rawat_jalan' && !v.queueNo.trim()) return 'No. antrian farmasi wajib diisi';
  if (v.careType === 'rawat_inap' && !v.wardId) return 'Pilih bangsal';
  return null;
}

/** API payload: only the field that belongs to the care type. */
export function pharmacyPayload(v: PharmacyValue) {
  if (!v.careType) return {};
  return {
    care_type: v.careType,
    pharmacy_queue_no: v.careType === 'rawat_jalan' ? v.queueNo.trim() : null,
    ward_id: v.careType === 'rawat_inap' ? Number(v.wardId) : null,
  };
}

const CARE_TYPES: CareType[] = ['rawat_jalan', 'rawat_inap'];

/**
 * Farmasi on the staff order forms: rawat jalan with the pharmacy queue number,
 * or rawat inap with the ward. `currentWard` keeps an order's ward selectable
 * after the Admin deactivated it.
 */
export default function PharmacyFields({
  value,
  onChange,
  error,
  currentWard,
  wards: givenWards,
}: {
  value: PharmacyValue;
  onChange: (value: PharmacyValue) => void;
  error?: string | null;
  currentWard?: Ward | null;
  /** Public form & kiosk: the wards from /public/pharmacy (no login there). */
  wards?: Ward[];
}) {
  const { data: staffWards } = useWards(true, !givenWards);
  const activeWards = givenWards ?? staffWards;
  const wards =
    currentWard && !activeWards?.some((w) => w.id === currentWard.id)
      ? [...(activeWards ?? []), currentWard]
      : (activeWards ?? []);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Farmasi</Label>
        <ToggleGroup
          type="single"
          variant="outline"
          value={value.careType ?? ''}
          onValueChange={(v) => v && onChange({ ...value, careType: v as CareType })}
          className="w-full sm:w-auto"
        >
          {CARE_TYPES.map((c) => (
            <ToggleGroupItem
              key={c}
              value={c}
              className="flex-1 px-4 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground sm:flex-none"
            >
              {CARE_TYPE_LABELS[c]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {value.careType === 'rawat_jalan' && (
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="pharmacy_queue_no">No. antrian farmasi</Label>
          <Input
            id="pharmacy_queue_no"
            value={value.queueNo}
            maxLength={20}
            placeholder="mis. A-012"
            onChange={(e) => onChange({ ...value, queueNo: e.target.value })}
            aria-invalid={!!error && !value.queueNo.trim()}
          />
        </div>
      )}

      {value.careType === 'rawat_inap' && (
        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="ward_id">Bangsal</Label>
          <Select value={value.wardId} onValueChange={(wardId) => onChange({ ...value, wardId })}>
            <SelectTrigger id="ward_id" className="w-full" aria-invalid={!!error && !value.wardId}>
              <SelectValue placeholder="— pilih bangsal —" />
            </SelectTrigger>
            {/* Below the field, short with a scrollbar: the ward list is long. */}
            <SelectContent position="popper" className="max-h-72">
              {wards.map((w) => (
                <SelectItem key={w.id} value={String(w.id)}>
                  {w.name}
                  {!w.is_active && ' (nonaktif)'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
