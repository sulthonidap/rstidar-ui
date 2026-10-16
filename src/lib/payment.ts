import type { Order, OrderStatus, PaymentMethod, PaymentStatus } from '@/types/models';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Belum bayar',
  paid: 'Lunas',
  refunded: 'Refund',
};

export const PAYMENT_STATUS_COLOR: Record<PaymentStatus, string> = {
  unpaid: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  refunded: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

/** Tinted card/banner for a payment that still needs something done. */
export const PAYMENT_OPEN_TINT: Partial<Record<PaymentStatus, string>> = {
  unpaid:
    'border-amber-300 bg-amber-50 ring-amber-300 dark:border-amber-800 dark:bg-amber-950/40 dark:ring-amber-800',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Tunai (kasir RS)',
  noncash: 'Non-tunai (transfer/QRIS)',
};

/** Steps the API only allows once the order is paid (requirePaid): confirming it and packing it. */
export const PAYMENT_GATED_STEPS: OrderStatus[] = ['confirmed', 'packed'];

/**
 * Not paid yet, so it can't be confirmed or packed. Orders from before payment
 * methods (no method recorded) aren't held back, same as the API.
 */
export function awaitingPayment(order: Order): boolean {
  const t = order.transaction;
  return !!t?.payment_method && t.payment_status !== 'paid';
}
