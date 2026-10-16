import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api';
import type { Transaction } from '@/types/models';

export interface PaymentInfo {
  bank_name: string;
  account_no: string;
  account_name: string;
  instructions: string;
  qris_url: string | null;
}

/** Where to pay a non-cash order (set by the admin). */
export function usePaymentInfo(enabled = true) {
  return useQuery({
    queryKey: ['payment-info'],
    queryFn: async () => (await api.get<{ data: PaymentInfo }>('/public/payment-info')).data.data,
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export type PaymentAction = 'paid' | 'refund';

/** Mark paid / refund. */
export function usePaymentAction(orderId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { action: PaymentAction; note?: string }) =>
      (await api.post<{ data: Transaction }>(`/orders/${orderId}/payment`, payload)).data.data,
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success({ paid: 'Pembayaran ditandai lunas', refund: 'Pembayaran di-refund' }[action]);
    },
  });
}

export function usePaymentSettings() {
  return useQuery({
    queryKey: ['settings', 'payment'],
    queryFn: async () => (await api.get<{ data: PaymentInfo }>('/settings/payment')).data.data,
  });
}

export function useUpdatePaymentSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<PaymentInfo, 'qris_url'>) =>
      (await api.put<{ data: PaymentInfo }>('/settings/payment', payload)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'payment'] });
      queryClient.invalidateQueries({ queryKey: ['setup-checklist'] });
      queryClient.invalidateQueries({ queryKey: ['payment-info'] });
      toast.success('Pengaturan pembayaran disimpan');
    },
  });
}

export function useQrisUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File | null) => {
      if (!file) return (await api.delete<{ data: PaymentInfo }>('/settings/payment/qris')).data.data;
      const form = new FormData();
      form.append('qris', file);
      return (await api.post<{ data: PaymentInfo }>('/settings/payment/qris', form)).data.data;
    },
    onSuccess: (_, file) => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'payment'] });
      queryClient.invalidateQueries({ queryKey: ['setup-checklist'] });
      queryClient.invalidateQueries({ queryKey: ['payment-info'] });
      toast.success(file ? 'Gambar QRIS disimpan' : 'Gambar QRIS dihapus');
    },
  });
}
