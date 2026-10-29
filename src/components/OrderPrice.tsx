import { Badge } from '@/components/ui/badge';
import { formatRupiah } from '@/lib/format';
import { isFreeClaim } from '@/lib/free-program';
import { PATIENT_CATEGORY_LABELS, type Order } from '@/types/models';

/**
 * An order's price; a free order (program ongkir gratis) shows a "Gratis · Lansia"
 * badge with its normal tariff instead of Rp0.
 */
export default function OrderPrice({
  order,
}: {
  order: Pick<Order, 'price' | 'is_free' | 'normal_price' | 'patient_category' | 'domicile_checked'>;
}) {
  const category = order.patient_category ? PATIENT_CATEGORY_LABELS[order.patient_category] : null;
  if (!order.is_free) {
    // The patient claimed it on the public form; CCO hasn't decided yet (FreeClaimDialog).
    if (!isFreeClaim(order)) return <>{formatRupiah(order.price)}</>;
    return (
      <span className="inline-flex flex-col items-start gap-0.5">
        <span>{formatRupiah(order.price)}</span>
        <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100 dark:bg-sky-500/15 dark:text-sky-300">
          Ajukan gratis
        </Badge>
        <span className="text-xs text-muted-foreground">{category} · belum dicek</span>
      </span>
    );
  }
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300">
        Gratis{category && category !== 'Umum' ? ` · ${category}` : ''}
      </Badge>
      {order.normal_price != null && (
        <span className="text-xs text-muted-foreground line-through">{formatRupiah(order.normal_price)}</span>
      )}
    </span>
  );
}
