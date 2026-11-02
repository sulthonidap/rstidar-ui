import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { OrderNotificationsContext } from '@/components/notifications/context';
import { describeOrderEvent, eventKey } from '@/components/notifications/describe';
import { useAuth } from '@/lib/auth';
import { listenToOrderEvents, playNotificationSound } from '@/lib/realtime';
import { hasRole } from '@/lib/roles';
import type { OrderEvent } from '@/types/models';

const MAX_ITEMS = 20;

/**
 * For the RS staff who move orders along (CCO, Farmasi, Ops), connects the panel
 * to the live order stream; the API only sends each role the steps it must act
 * on (new order → CCO, confirmed → Farmasi + Ops, siap diambil → CCO, siap kirim
 * → Ops). Each event refreshes order lists/stats, pops a toast with a "Lihat"
 * button, plays a sound, shows a desktop notification when the tab is in the
 * background, and lands in the bell.
 *
 * Every panel (Admin too) also gets the silent "orders.changed" whenever any
 * order data is written — courier app, payment, edit, cancel… — and just
 * refetches, so lists stay current without toasts for steps that aren't theirs.
 */
export default function OrderNotificationsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const enabled = hasRole(user, 'cco', 'farmasi', 'ops', 'finance');
  const live = enabled || hasRole(user, 'admin');
  const [items, setItems] = useState<OrderEvent[]>([]);
  const [unread, setUnread] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!live) return;
    // Only active queries refetch; the rest are just marked stale.
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    };
    let wasOpen = false;
    return listenToOrderEvents(
      (event) => {
        setItems((prev) => [event, ...prev.filter((e) => eventKey(e) !== eventKey(event))].slice(0, MAX_ITEMS));
        setUnread((n) => n + 1);
        refresh();

        const { title, body } = describeOrderEvent(event);
        toast.info(title, {
          description: body,
          duration: 10_000,
          action: { label: 'Lihat', onClick: () => navigate(`/orders/${event.order_id}`) },
        });
        playNotificationSound();

        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
          const n = new Notification(title, { body, icon: '/logo.png', tag: `order-${eventKey(event)}` });
          n.onclick = () => {
            window.focus();
            navigate(`/orders/${event.order_id}`);
            n.close();
          };
        }
      },
      (status) => {
        setConnected(status === 'open');
        // Back after a dropped connection: catch up on what changed meanwhile.
        if (status === 'open' && wasOpen) refresh();
        if (status === 'open') wasOpen = true;
      },
      refresh,
    );
  }, [live, queryClient, navigate]);

  const markAllRead = useCallback(() => setUnread(0), []);
  const value = useMemo(
    () => ({ enabled, items, unread, connected, markAllRead }),
    [enabled, items, unread, connected, markAllRead],
  );

  return <OrderNotificationsContext.Provider value={value}>{children}</OrderNotificationsContext.Provider>;
}
