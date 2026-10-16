import { PlusIcon, Trash2Icon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatRupiah } from '@/lib/format';

/** Editable tier row; numbers kept as strings while typing. */
export interface TierDraft {
  up_to_km: string;
  price: string;
}

/**
 * Distance tiers of a service: "up to X km → price" rows plus the charge per
 * km beyond the last row. Empty = the flat base price is used.
 */
export default function TierEditor({
  tiers,
  onChange,
  perKm,
  onPerKmChange,
}: {
  tiers: TierDraft[];
  onChange: (tiers: TierDraft[]) => void;
  perKm: string;
  onPerKmChange: (value: string) => void;
}) {
  const update = (i: number, patch: Partial<TierDraft>) =>
    onChange(tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const lastKm = [...tiers].map((t) => Number(t.up_to_km)).filter((n) => n > 0).sort((a, b) => a - b).at(-1);

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div>
        <Label>Tarif per jarak</Label>
        <p className="text-xs text-muted-foreground">
          Jarak dihitung lewat jalan dari titik RS ke titik tujuan. Kosongkan kalau tarifnya flat (pakai harga dasar).
          Order tanpa titik tujuan tetap pakai harga dasar.
        </p>
      </div>

      {tiers.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground">
            <span>Sampai jarak (km)</span>
            <span>Harga</span>
            <span className="w-8" />
          </div>
          {tiers.map((t, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                placeholder="3"
                value={t.up_to_km}
                onChange={(e) => update(i, { up_to_km: e.target.value })}
                aria-label={`Batas km tier ${i + 1}`}
              />
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                step="500"
                placeholder="15000"
                value={t.price}
                onChange={(e) => update(i, { price: e.target.value })}
                aria-label={`Harga tier ${i + 1}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onChange(tiers.filter((_, j) => j !== i))}
                aria-label={`Hapus tier ${i + 1}`}
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...tiers, { up_to_km: '', price: '' }])}
        disabled={tiers.length >= 10}
      >
        <PlusIcon />
        Tambah tier
      </Button>

      {tiers.length > 0 && (
        <div className="grid grid-cols-[1fr_1fr] items-center gap-2 border-t pt-2">
          <Label htmlFor="price_per_km" className="text-sm font-normal">
            Lebih dari {lastKm ?? '…'} km, tambah per km
          </Label>
          <Input
            id="price_per_km"
            type="number"
            inputMode="numeric"
            min="0"
            step="500"
            placeholder="kosong = tetap harga tier terakhir"
            value={perKm}
            onChange={(e) => onPerKmChange(e.target.value)}
          />
          {perKm && Number(perKm) > 0 && (
            <p className="col-span-2 text-xs text-muted-foreground">
              Contoh: {lastKm ? `${lastKm + 2} km` : '…'} = harga tier terakhir + 2 × {formatRupiah(Number(perKm))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
