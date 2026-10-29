import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api';
import type { FreeProgram, Order } from '@/types/models';

/** Program ongkir gratis (lansia/disabilitas): whether it's on and its domicile requirement. */
export function useFreeProgram() {
  return useQuery({
    queryKey: ['free-program'],
    queryFn: async () => (await api.get<{ data: FreeProgram }>('/free-program')).data.data,
    staleTime: 5 * 60_000,
  });
}

/** Whether the public form & kiosk ask for the patient category (a claim), and the domicile requirement. */
export function usePublicFreeProgram() {
  return useQuery({
    queryKey: ['public-free-program'],
    queryFn: async () =>
      (await api.get<{ data: Pick<FreeProgram, 'enabled' | 'domicile'> }>('/public/free-program')).data.data,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateFreeProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FreeProgram) =>
      (await api.put<{ data: FreeProgram }>('/settings/free-program', payload)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['free-program'] });
      toast.success('Program ongkir gratis disimpan');
    },
  });
}

export type FreeClaimAction = 'approve' | 'reject';

/** CCO decides a patient's free-delivery claim: approve (free, paid Rp0) or reject (regular order). */
export function useFreeClaim(orderId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { action: FreeClaimAction; note?: string }) =>
      (await api.post<{ data: Order }>(`/orders/${orderId}/free-claim`, payload)).data.data,
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(action === 'approve' ? 'Disetujui: ongkir gratis' : 'Pengajuan gratis ditolak');
    },
  });
}
