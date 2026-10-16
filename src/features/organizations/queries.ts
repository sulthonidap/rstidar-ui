import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api';
import type { Organization } from '@/types/models';

/** The partner RS profile; null until the admin has filled in Setup Profil RS. */
export function useOrganization({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['organization'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Organization | null }>('/organization');
      return data.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export type OrganizationPayload = {
  address?: string | null;
  phone?: string | null;
  lat?: number | null;
  lng?: number | null;
  max_distance_km: number | null;
};

/** First setup (once) or later edits of the partner RS profile. */
export function useSaveOrganization({ setup }: { setup: boolean }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: OrganizationPayload) => {
      const { data } = setup
        ? await api.post<{ data: Organization }>('/organization', payload)
        : await api.put<{ data: Organization }>('/organization', payload);
      return data.data;
    },
    onSuccess: (item) => {
      queryClient.setQueryData(['organization'], item);
      toast.success(setup ? `Profil ${item.name} tersimpan` : 'Profil RS disimpan');
    },
  });
}
