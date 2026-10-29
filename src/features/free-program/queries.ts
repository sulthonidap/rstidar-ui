import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api';
import type { FreeProgram } from '@/types/models';

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
