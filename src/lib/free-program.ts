import type { Order } from '@/types/models';

/**
 * The patient asked for free delivery (lansia/disabilitas) on the public form or
 * kiosk and CCO hasn't decided yet (approve/reject: FreeClaimDialog).
 */
export function isFreeClaim(order: Pick<Order, 'patient_category' | 'domicile_checked' | 'is_free'>): boolean {
  return !!order.patient_category && order.patient_category !== 'umum' && !order.domicile_checked && !order.is_free;
}
