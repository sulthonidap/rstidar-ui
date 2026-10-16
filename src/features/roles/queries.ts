import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type { Role } from '@/types/models';

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Role[] }>('/roles');
      return data.data;
    },
  });
}
