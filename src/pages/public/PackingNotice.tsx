import { PackageIcon } from 'lucide-react';

import { formatDateTime } from '@/lib/format';
import { DETAIL } from '@/pages/public/PatientProgress';
import type { TrackedOrder } from '@/types/models';

/**
 * Shown on the tracking page until the courier takes the package: a plain
 * "being prepared" notice instead of the steps and delivery details, which only
 * mean something once the package is on its way.
 */
export default function PackingNotice({ order }: { order: TrackedOrder }) {
  const title = order.status === 'pending' ? 'Pesanan sedang diproses' : 'Dalam pengemasan';
  return (
    <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      <PackageIcon className="mt-0.5 size-5 shrink-0" />
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        {DETAIL[order.status] && <p>{DETAIL[order.status]}</p>}
        <p className="text-amber-800/80 dark:text-amber-300/80">
          Detail pengiriman muncul di sini setelah kurir berangkat. Muat ulang halaman untuk melihat status terbaru.
        </p>
        <p className="text-xs text-amber-800/70 tabular-nums dark:text-amber-300/70">
          {order.organization?.name ? `${order.organization.name} · ` : ''}
          Dipesan {formatDateTime(order.created_at)}
        </p>
      </div>
    </div>
  );
}
