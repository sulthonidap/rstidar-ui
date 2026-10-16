import type { OrderEvent } from '@/types/models';

/** Title + one-line body for a live order event, phrased as what to do next. */
export function describeOrderEvent(e: OrderEvent): { title: string; body: string } {
  const who = e.customer_name;
  switch (e.status) {
    case 'pending':
      return { title: `Order baru ${e.code}`, body: `${who} (form publik) — perlu dikonfirmasi` };
    case 'confirmed':
      return { title: `${e.code} dikonfirmasi`, body: `${who} — siapkan obat & tugaskan kurir` };
    case 'ready_for_pickup':
      if (e.type === 'order.created' && e.source === 'farmasi') {
        return { title: `Order farmasi ${e.code}`, body: `${who} — obat siap diambil, tugaskan kurir` };
      }
      return { title: `Obat ${e.code} siap diambil`, body: `${who} — ambil di farmasi lalu kemas` };
    case 'packed':
      return { title: `${e.code} siap kirim`, body: `${who} — pastikan kurir sudah ditugaskan` };
    default:
      return { title: e.code, body: who };
  }
}

/** Same order can notify several times (one per step). */
export const eventKey = (e: OrderEvent) => `${e.order_id}:${e.status}`;
