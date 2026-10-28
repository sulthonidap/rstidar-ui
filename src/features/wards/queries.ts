import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api';
import type { Ward } from '@/types/models';

/** Bangsal rawat inap; `activeOnly` for the order form dropdown. */
export function useWards(activeOnly = false, enabled = true) {
  return useQuery({
    queryKey: ['wards', { activeOnly }],
    enabled,
    queryFn: async () => {
      const { data } = await api.get<{ data: Ward[] }>('/wards', { params: activeOnly ? { active: 1 } : undefined });
      return data.data;
    },
  });
}

export type WardPayload = { name: string; is_active: boolean };

export function useSaveWard(id?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: WardPayload) => {
      const { data } = id
        ? await api.put<{ data: Ward }>(`/wards/${id}`, payload)
        : await api.post<{ data: Ward }>('/wards', payload);
      return data.data;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['wards'] });
      toast.success(`Bangsal ${item.name} disimpan`);
    },
  });
}

/** Deleting is refused by the API (409) while any order uses the ward. */
export function useDeleteWard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: { id: number; name: string }) => api.delete(`/wards/${item.id}`),
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: ['wards'] });
      toast.success(`Bangsal ${item.name} dihapus`);
    },
  });
}

/** Farmasi on the public form & kiosk (Admin toggle on Pengaturan → Bangsal). */
export function usePharmacySettings() {
  return useQuery({
    queryKey: ['pharmacy-settings'],
    queryFn: async () => (await api.get<{ data: { public: boolean } }>('/settings/pharmacy')).data.data,
  });
}

export function useUpdatePharmacySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { public: boolean }) =>
      (await api.put<{ data: { public: boolean } }>('/settings/pharmacy', payload)).data.data,
    onSuccess: (data) => {
      queryClient.setQueryData(['pharmacy-settings'], data);
      toast.success(data.public ? 'Form pasien sekarang menanyakan farmasi' : 'Form pasien tidak lagi menanyakan farmasi');
    },
  });
}

/** For the public form & kiosk: whether to ask farmasi, and the active wards. */
export function usePublicPharmacy() {
  return useQuery({
    queryKey: ['public-pharmacy'],
    queryFn: async () => (await api.get<{ data: { enabled: boolean; wards: Ward[] } }>('/public/pharmacy')).data.data,
  });
}
