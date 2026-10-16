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
 */
export default function OrderNotificationsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const enabled = hasRole(user, 'cco', 'farmasi', 'ops', 'finance');
  const [items, setItems] = useState<OrderEvent[]>([]);
  const [unread, setUnread] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    return listenToOrderEvents(
      (event) => {
        setItems((prev) => [event, ...prev.filter((e) => eventKey(e) !== eventKey(event))].slice(0, MAX_ITEMS));
        setUnread((n) => n + 1);
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });

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
      (status) => setConnected(status === 'open'),
    );
  }, [enabled, queryClient, navigate]);

  const markAllRead = useCallback(() => setUnread(0), []);
  const value = useMemo(
    () => ({ enabled, items, unread, connected, markAllRead }),
    [enabled, items, unread, connected, markAllRead],
  );

  return <OrderNotificationsContext.Provider value={value}>{children}</OrderNotificationsContext.Provider>;
}
