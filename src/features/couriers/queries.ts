import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { RecapFilters } from '@/features/reports/queries';
import { api } from '@/lib/api';
import type { Courier, OrderStatus } from '@/types/models';

export function useCouriers({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['couriers'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Courier[] }>('/couriers');
      return data.data;
    },
    enabled,
  });
}

export interface CourierRecapRow {
  courier_id: number;
  name: string;
  phone: string | null;
  vehicle_type: string | null;
  is_active: boolean;
  total: number;
  done: number;
  cancelled: number;
  in_progress: number;
  /** Total jarak order selesai. */
  distance_km: number;
  /** Nilai order selesai. */
  revenue: number;
  /** Rata-rata terima paket → sampai. */
  avg_trip_minutes: number | null;
}

export interface CourierRecap {
  period: RecapFilters['period'];
  from: string;
  to: string;
  rows: CourierRecapRow[];
}

/** daily = satu bulan ("YYYY-MM"), monthly = satu tahun ("YYYY"). */
export function useCourierRecap(filters: RecapFilters) {
  return useQuery({
    queryKey: ['couriers', 'recap', filters],
    queryFn: async () => {
      const params = filters.period === 'daily' ? { period: 'daily', month: filters.value } : { period: 'monthly', year: filters.value };
      const { data } = await api.get<{ data: CourierRecap }>('/couriers/recap', { params });
      return data.data;
    },
    placeholderData: keepPreviousData,
  });
}

export type CourierPayload = {
  vehicle_type?: string | null;
  phone?: string | null;
  is_active: boolean;
};

export function useUpdateCourier(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CourierPayload) => {
      const { data } = await api.put<{ data: Courier }>(`/couriers/${id}`, payload);
      return data.data;
    },
    onSuccess: (courier) => {
      queryClient.invalidateQueries({ queryKey: ['couriers'] });
      toast.success(`Data kurir ${courier.user?.name ?? ''} disimpan`);
    },
  });
}

export interface CourierRouteStop {
  seq: number;
  order_id: number;
  code: string;
  customer_name: string;
  dropoff_address: string;
  /** Destination on the map (null = not placed). */
  lat: number | null;
  lng: number | null;
  status: OrderStatus;
  /** Realisation: where/when the courier handed it over (proof-of-delivery GPS). */
  delivered_at: string | null;
  delivered_lat: number | null;
  delivered_lng: number | null;
  /** Handover point ↔ destination, metres. */
  off_by_m: number | null;
}

/** A courier's planned delivery order (saved from "Urutan antar" in the courier app). */
export interface CourierRoute {
  id: number;
  courier_id: number;
  courier: string;
  vehicle: string | null;
  started_at: string;
  finished_at: string | null;
  start: [number, number] | null;
  /** "gps": where the courier was when they set off; "rs": no GPS, drawn from the RS. */
  start_from: 'gps' | 'rs';
  stops: CourierRouteStop[];
  done: number;
  km: number;
  /** Planned line through the stops, in order. */
  path: [number, number][];
  /** "road" follows the streets; "estimate" = straight segments (no routing server). */
  path_source: 'road' | 'estimate';
}

/** Routes running on `date` (YYYY-MM-DD) — Admin & Ops. */
export function useCourierRoutes(date: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['courier-routes', date],
    queryFn: async () =>
      (await api.get<{ data: { date: string; routes: CourierRoute[] } }>('/couriers/routes', { params: { date } })).data
        .data,
    enabled: options.enabled ?? true,
    // Today's routes move as couriers deliver: refresh every minute.
    refetchInterval: 60_000,
  });
}
