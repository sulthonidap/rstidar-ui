import { CARE_TYPE_LABELS, type Order } from '@/types/models';

type PharmacyOrder = Pick<Order, 'care_type' | 'pharmacy_queue_no' | 'ward'>;

/** "Antrian A-012" / "Bangsal Dahlia 1", or null when farmasi isn't filled. */
export function pharmacyDetail(order: PharmacyOrder): string | null {
  if (order.care_type === 'rawat_jalan') return order.pharmacy_queue_no ? `Antrian ${order.pharmacy_queue_no}` : null;
  if (order.care_type === 'rawat_inap') return order.ward ? `Bangsal ${order.ward.name}` : null;
  return null;
}

/** Farmasi of an order: care type on top, queue number / ward below. */
export default function OrderPharmacy({ order }: { order: PharmacyOrder }) {
  if (!order.care_type) return <span className="text-muted-foreground">—</span>;
  const detail = pharmacyDetail(order);
  return (
    <div>
      <div className="font-medium">{CARE_TYPE_LABELS[order.care_type]}</div>
      {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
    </div>
  );
}
