import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api';
import type { Service } from '@/types/models';

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Service[] }>('/services');
      return data.data;
    },
  });
}

export type ServicePayload = {
  name: string;
  description?: string | null;
  price_base: number;
  is_active: boolean;
  tiers: { up_to_km: number; price: number }[];
  price_per_km: number | null;
};

export function useCreateService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ServicePayload) => {
      const { data } = await api.post<{ data: Service }>('/services', payload);
      return data.data;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['setup-checklist'] });
      toast.success(`Layanan ${item.name} ditambahkan`);
    },
  });
}

export function useUpdateService(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ServicePayload) => {
      const { data } = await api.put<{ data: Service }>(`/services/${id}`, payload);
      return data.data;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['setup-checklist'] });
      toast.success(`Layanan ${item.name} disimpan`);
    },
  });
}

/** Deleting is refused by the API (409) while any order uses the service. */
export function useDeleteService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: { id: number; name: string }) => api.delete(`/services/${item.id}`),
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      queryClient.invalidateQueries({ queryKey: ['setup-checklist'] });
      toast.success(`Layanan ${item.name} dihapus`);
    },
  });
}
