import { Badge } from '@/components/ui/badge';
import { formatRupiah } from '@/lib/format';
import { PATIENT_CATEGORY_LABELS, type Order } from '@/types/models';

/**
 * An order's price; a free order (program ongkir gratis) shows a "Gratis · Lansia"
 * badge with its normal tariff instead of Rp0.
 */
export default function OrderPrice({
  order,
}: {
  order: Pick<Order, 'price' | 'is_free' | 'normal_price' | 'patient_category'>;
}) {
  if (!order.is_free) return <>{formatRupiah(order.price)}</>;
  const category = order.patient_category ? PATIENT_CATEGORY_LABELS[order.patient_category] : null;
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
