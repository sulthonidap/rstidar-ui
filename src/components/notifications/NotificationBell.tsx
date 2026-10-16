import { BellIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { useOrderNotifications } from '@/components/notifications/context';
import { describeOrderEvent, eventKey } from '@/components/notifications/describe';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

/** Header bell: count of order events since last opened, and the recent list. */
export default function NotificationBell() {
  const { enabled, items, unread, connected, markAllRead } = useOrderNotifications();
  const [permission, setPermission] = useState(() =>
    'Notification' in window ? Notification.permission : 'denied',
  );

  if (!enabled) return null;

  const enableDesktop = async () => {
    setPermission(await Notification.requestPermission());
  };

  return (
    <Popover onOpenChange={(open) => open && markAllRead()}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
          aria-label={unread ? `${unread} notifikasi baru` : 'Notifikasi'}
        >
          <BellIcon />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-orange px-1 text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifikasi order</p>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn('size-2 rounded-full', connected ? 'bg-emerald-500' : 'bg-gray-400')} />
            {connected ? 'Live' : 'Menyambung…'}
          </span>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Belum ada notifikasi sejak halaman dibuka.
            </p>
          ) : (
            items.map((e) => {
              const { title, body } = describeOrderEvent(e);
              return (
                <Link
                  key={eventKey(e)}
                  to={`/orders/${e.order_id}`}
                  className="block border-b px-4 py-3 last:border-0 hover:bg-muted"
                >
                  <p className="text-sm font-semibold text-primary">{title}</p>
                  <p className="text-xs text-muted-foreground">{body}</p>
                </Link>
              );
            })
          )}
        </div>

        {permission === 'default' && (
          <div className="border-t p-3">
            <Button variant="outline" size="sm" className="w-full" onClick={enableDesktop}>
              Aktifkan notifikasi desktop
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
