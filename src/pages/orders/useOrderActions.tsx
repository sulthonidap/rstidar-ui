import { CheckIcon, PackageCheckIcon, PillIcon } from 'lucide-react';
import type { ComponentType } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useTransitionOrder } from '@/features/orders/queries';
import { apiErrorMessage } from '@/lib/api';
import { awaitingPayment, PAYMENT_GATED_STEPS } from '@/lib/payment';
import { useAuth } from '@/lib/auth';
import { ASSIGNABLE_STATUSES, canMoveOrder, hasRole } from '@/lib/roles';
import LabelPrintDialog from '@/pages/orders/LabelPrintDialog';
import { EditOrderDialog } from '@/pages/orders/EditOrderDialog';
import { AssignCourierDialog, CancelOrderDialog } from '@/pages/orders/OrderActionDialogs';
import type { Order, OrderStatus } from '@/types/models';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TRANSITIONS } from '@/types/models';

/**
 * One-click staff steps. "cancelled" has its own confirm dialog; the courier
 * steps (Dalam pengiriman, Selesai) happen in the courier app (scan label).
 */
const QUICK_TRANSITIONS: Partial<Record<OrderStatus, { label: string; icon: ComponentType }>> = {
  confirmed: { label: 'Konfirmasi order', icon: CheckIcon },
  ready_for_pickup: { label: 'Obat siap diambil', icon: PillIcon },
  packed: { label: 'Obat diambil & dikemas', icon: PackageCheckIcon },
};

/** Orders can be corrected until the courier has the package (API: editableStatuses). */
export const EDITABLE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'ready_for_pickup', 'packed'];

export type QuickMove = {
  to: OrderStatus;
  label: string;
  icon: ComponentType;
  /** Why the step can't be taken yet (shown on the disabled button). */
  blocked?: string;
};

export const UNPAID_HINT = 'Belum lunas: tandai lunas dulu di bagian Pembayaran';

/**
 * Everything an order's action UI needs (row menu, detail page header): which
 * actions the current user may take in the order's status, handlers, and the
 * dialogs (assign courier / cancel / print label) — render `dialogs` once.
 */
export function useOrderActions(order: Order) {
  const { user } = useAuth();
  const transition = useTransitionOrder(order.id);
  const [assignOpen, setAssignOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Only the steps this role takes (CCO confirms, then collects + packs, Farmasi marks ready).
  // Confirming and packing wait for the payment (the API refuses them too).
  const unpaid = awaitingPayment(order);
  const quickMoves = ORDER_STATUS_TRANSITIONS[order.status].flatMap<QuickMove>((to) => {
    const quick = QUICK_TRANSITIONS[to];
    if (!quick || !canMoveOrder(user, order.status, to)) return [];
    const blocked = unpaid && PAYMENT_GATED_STEPS.includes(to) ? UNPAID_HINT : undefined;
    return [{ to, ...quick, blocked }];
  });
  const showAssign = hasRole(user, 'admin', 'ops') && ASSIGNABLE_STATUSES.includes(order.status);
  const showCancel = canMoveOrder(user, order.status, 'cancelled');
  const showPrint = order.status !== 'cancelled';
  const showEdit = hasRole(user, 'admin', 'cco') && EDITABLE_STATUSES.includes(order.status);

  const moveTo = (to: OrderStatus) => {
    toast.promise(transition.mutateAsync({ status: to }), {
      loading: 'Mengubah status…',
      success: `${order.code} → ${ORDER_STATUS_LABELS[to]}`,
      error: (err) => apiErrorMessage(err, 'Gagal ubah status'),
    });
  };

  const dialogs = (
    <>
      {showPrint && <LabelPrintDialog orders={[order]} open={labelOpen} onOpenChange={setLabelOpen} />}
      {showAssign && <AssignCourierDialog order={order} open={assignOpen} onOpenChange={setAssignOpen} />}
      {showCancel && <CancelOrderDialog order={order} open={cancelOpen} onOpenChange={setCancelOpen} />}
      {showEdit && <EditOrderDialog order={order} open={editOpen} onOpenChange={setEditOpen} />}
    </>
  );

  return {
    quickMoves,
    showAssign,
    showCancel,
    showPrint,
    showEdit,
    isMoving: transition.isPending,
    moveTo,
    assignLabel: order.courier_id ? 'Ganti kurir' : 'Tugaskan kurir',
    openAssign: () => setAssignOpen(true),
    openCancel: () => setCancelOpen(true),
    openLabel: () => setLabelOpen(true),
    openEdit: () => setEditOpen(true),
    dialogs,
  };
}
