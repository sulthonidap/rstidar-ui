import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '../../lib/api';
import type { Courier, Order, OrderStats, OrderStatus, Paginated, StatsRange, ScheduleSlot, PaymentMethod } from '../../types/models';

export interface OrderFilters {
  status?: OrderStatus | '';
  search?: string;
  /** YYYY-MM-DD, inclusive, on the order's created ("Masuk") date. */
  from?: string;
  to?: string;
  schedule?: ScheduleFilter;
  page: number;
  perPage: number;
}

/** Delivery schedule filter: '' = all. */
export type ScheduleFilter = '' | 'asap' | 'today' | 'later';

export function useOrders(filters: OrderFilters) {
  return useQuery({
    queryKey: ['orders', 'list', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: filters.page, per_page: filters.perPage };
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.schedule) params.schedule = filters.schedule;
      const { data } = await api.get<
        Paginated<Order> & { summary?: { by_status: Partial<Record<OrderStatus, number>> } }
      >('/orders', { params });
      return data;
    },
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
}

/** Counts per status + revenue, computed server-side over all orders (for the dashboard). */
export function useOrderStats(days: StatsRange = 30) {
  return useQuery({
    queryKey: ['orders', 'stats', days],
    queryFn: async () => {
      const { data } = await api.get<{ data: OrderStats }>('/orders/stats', { params: { days } });
      return data.data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useOrder(id: number | string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Order }>(`/orders/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useAssignableCouriers(orderId: number | string) {
  return useQuery({
    queryKey: ['orders', orderId, 'assignable-couriers'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Courier[] }>(
        `/orders/${orderId}/assignable-couriers`,
      );
      return data.data;
    },
    enabled: !!orderId,
  });
}

/** Cancelling a paid order: give the money back, or keep it (a reason is then required). */
export type CancelPayment = 'refund' | 'keep';

export function useTransitionOrder(orderId: number | string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { status: OrderStatus; note?: string; payment?: CancelPayment }) => {
      const { data } = await api.post<{ data: Order }>(
        `/orders/${orderId}/transition`,
        payload,
      );
      return data.data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (status === 'cancelled') queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useAssignCourier(orderId: number | string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (courierId: number) => {
      const { data } = await api.post<{ data: Order }>(
        `/orders/${orderId}/assign-courier`,
        { courier_id: courierId },
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export interface BulkTransitionResult {
  updated: number[];
  failed: { id: number; code?: string; error: string }[];
}

/** Moves many orders at once; the API reports per-order success/failure. */
export function useBulkTransition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { ids: number[]; status: OrderStatus; note?: string; payment?: CancelPayment }) => {
      const { data } = await api.post<{ data: BulkTransitionResult }>('/orders/bulk-transition', payload);
      return data.data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      // Done creates transactions server-side; cancelling may refund one.
      if (status === 'done' || status === 'cancelled') queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

/** Assigns one courier to many orders; Confirmed orders move to Assigned server-side. */
export function useBulkAssignCourier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { ids: number[]; courier_id: number }) => {
      const { data } = await api.post<{ data: BulkTransitionResult }>('/orders/bulk-assign-courier', payload);
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export interface CreateOrderPayload {
  service_id: number;
  customer_name: string;
  customer_phone: string;
  /** Optional: the API uses "Farmasi" when empty. */
  pickup_address?: string;
  dropoff_address: string;
  notes?: string;
  /** Pick a saved customer of that RS… */
  customer_id?: number;
  /** …or save the typed details as a customer (updates the one with the same phone). */
  save_customer?: boolean;
  patient_name?: string;
  medical_record_no?: string;
  /** "YYYY-MM-DD" + slot; leave out for secepatnya. */
  scheduled_date?: string;
  scheduled_slot?: ScheduleSlot;
  /** Destination map point (optional). */
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  payment_method: PaymentMethod;
}

/** Internal order by staff: goes straight to "Confirmed" (no validation step). */
export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateOrderPayload) => {
      const { data } = await api.post<{ data: Order }>('/orders', payload);
      return data.data;
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success(`Order ${order.code} dibuat`);
    },
  });
}

export interface UpdateOrderPayload {
  service_id: number;
  customer_name: string;
  customer_phone: string;
  /** Optional: the API uses "Farmasi" when empty. */
  pickup_address?: string;
  dropoff_address: string;
  notes?: string;
  patient_name?: string;
  medical_record_no?: string;
  /** Empty/absent = secepatnya. */
  scheduled_date?: string;
  scheduled_slot?: ScheduleSlot;
  /** The destination point shown in the form (null = none). */
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
}

/** Correct an order's details (until the courier has the package). */
export function useUpdateOrder(orderId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateOrderPayload) => {
      const { data } = await api.put<{ data: Order; changed: string[] | null }>(`/orders/${orderId}`, payload);
      return data;
    },
    onSuccess: ({ data: order, changed }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (changed?.length) toast.success(`${order.code} diperbarui`, { description: `Diubah: ${changed.join(', ')}` });
      else toast.info('Tidak ada yang berubah');
    },
  });
}

export interface OrderCoordinates {
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
}

/** Save map points placed by hand (the courier app navigates to them). */
export function useSaveCoordinates(orderId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: OrderCoordinates) => {
      const { data } = await api.put<{ data: Order }>(`/orders/${orderId}/coordinates`, payload);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Titik peta disimpan');
    },
  });
}
