import { CircleCheckIcon, ClipboardCheckIcon, HandIcon, PackageIcon, PillIcon, TruckIcon, WalletIcon } from 'lucide-react';
import type { ComponentType } from 'react';
import { Link } from 'react-router';

import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { formatRupiah } from '@/lib/format';
import { hasRole } from '@/lib/roles';
import { cn } from '@/lib/utils';
import type { OrderStats, OrderStatus } from '@/types/models';

type Tile = { label: string; value: string; note: string; href: string; icon: ComponentType<{ className?: string }> };

/**
 * KPI row, each tile links to the matching order list. Farmasi sees its own
 * work queue (what to prepare, what waits for the CCO, what's on its way,
 * what arrived today); other roles see the all-time totals.
 */
export function SectionCards({ stats, isLoading }: { stats: OrderStats | undefined; isLoading: boolean }) {
  const { user } = useAuth();

  const count = (...statuses: OrderStatus[]) =>
    statuses.reduce((sum, s) => sum + (stats?.by_status[s] ?? 0), 0);
  const done = count('done');

  const farmasiTiles: Tile[] = [
    {
      label: 'Perlu disiapkan',
      value: String(count('confirmed')),
      href: '/orders?status=confirmed',
      note: 'Sudah dikonfirmasi CCO, siapkan obatnya',
      icon: PillIcon,
    },
    {
      label: 'Menunggu diambil CCO',
      value: String(count('ready_for_pickup')),
      href: '/orders?status=ready_for_pickup',
      note: 'Obat siap di farmasi',
      icon: HandIcon,
    },
    {
      label: 'Dalam proses kirim',
      value: String(count('packed', 'on_delivery')),
      href: '/orders?status=on_delivery',
      note: 'Sudah dikemas CCO atau sedang diantar kurir',
      icon: TruckIcon,
    },
    {
      label: 'Selesai hari ini',
      value: String(stats?.done_today ?? 0),
      href: '/orders?status=done',
      note: 'Sudah diterima pasien hari ini',
      icon: CircleCheckIcon,
    },
  ];

  const defaultTiles: Tile[] = [
    {
      label: 'Total order',
      value: String(stats?.total ?? 0),
      href: '/orders',
      note: 'Seluruh order',
      icon: PackageIcon,
    },
    {
      label: 'Perlu dikonfirmasi',
      value: String(count('pending')),
      href: '/orders?status=pending',
      note: 'Menunggu konfirmasi CCO',
      icon: ClipboardCheckIcon,
    },
    {
      label: 'Sedang disiapkan',
      value: String(count('confirmed', 'ready_for_pickup', 'packed')),
      href: '/orders',
      note: 'Farmasi → diambil & dikemas CCO',
      icon: PillIcon,
    },
    {
      label: 'Dalam pengiriman',
      value: String(count('on_delivery')),
      href: '/orders?status=on_delivery',
      note: 'Paket sudah di tangan kurir',
      icon: TruckIcon,
    },
    // Money is for Admin & Finance only.
    ...(hasRole(user, 'admin', 'finance')
      ? [
          {
            label: 'Estimasi pendapatan',
            value: formatRupiah(stats?.revenue ?? 0),
            href: '/orders?status=done',
            note: `Dari ${done} order selesai`,
            icon: WalletIcon,
          },
        ]
      : []),
  ];

  const isFarmasi = hasRole(user, 'farmasi');
  const tiles = isFarmasi ? farmasiTiles : defaultTiles;

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2',
        tiles.length === 4 ? 'xl:grid-cols-4' : 'lg:grid-cols-3 2xl:grid-cols-5',
      )}
    >
      {tiles.map(({ label, value, note, href, icon: Icon }) => (
        <Link key={label} to={href} className="group rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          <Card className="h-full gap-3 px-5 transition-all group-hover:-translate-y-0.5 group-hover:shadow-md group-hover:ring-primary/25">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-muted-foreground">{label}</p>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                <Icon className="size-4.5" />
              </span>
            </div>
            <p className="text-3xl font-semibold tracking-tight">{isLoading ? '—' : value}</p>
            <p className="truncate text-xs text-muted-foreground">{note}</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
