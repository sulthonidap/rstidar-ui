import { createContext, useContext } from 'react';

import type { OrderEvent } from '@/types/models';

export interface OrderNotificationsValue {
  /** Only CCOs get "order baru" notifications (see the API's realtime hub). */
  enabled: boolean;
  /** Newest first, capped. */
  items: OrderEvent[];
  unread: number;
  connected: boolean;
  markAllRead: () => void;
}

export const OrderNotificationsContext = createContext<OrderNotificationsValue | undefined>(undefined);

export function useOrderNotifications() {
  const ctx = useContext(OrderNotificationsContext);
  if (!ctx) throw new Error('useOrderNotifications must be used inside <OrderNotificationsProvider>');
  return ctx;
}
