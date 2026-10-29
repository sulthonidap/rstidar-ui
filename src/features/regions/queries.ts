import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api';
import type { Region } from '@/types/models';

/**
 * Sub-regions of `parent` ('' = the provinces). The order forms get only the
 * served ones; `all` (Admin, to set the service area) gets every one.
 */
export function useRegions(parent: string, { enabled = true, all = false } = {}) {
  return useQuery({
    queryKey: ['regions', { parent, all }],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () =>
      (await api.get<{ data: Region[] }>(all ? '/regions' : '/public/regions', { params: { parent } })).data.data,
  });
}

/** A served region, as listed on Pengaturan → Wilayah Layanan. */
export interface ServiceAreaRegion {
  code: string;
  level: number;
  label: string;
}

export function useServiceArea() {
  return useQuery({
    queryKey: ['service-area'],
    queryFn: async () => (await api.get<{ data: ServiceAreaRegion[] }>('/settings/service-area')).data.data,
  });
}

export function useUpdateServiceArea() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (codes: string[]) =>
      (await api.put<{ data: ServiceAreaRegion[] }>('/settings/service-area', { codes })).data.data,
    onSuccess: (data) => {
      queryClient.setQueryData(['service-area'], data);
      queryClient.invalidateQueries({ queryKey: ['regions'] });
      toast.success('Wilayah layanan disimpan');
    },
  });
}
