import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api';
import type { User } from '@/types/models';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<{ data: User[] }>('/users');
      return data.data;
    },
  });
}

export type UserPayload = {
  name: string;
  email: string;
  phone?: string | null;
  password?: string;
  role_id: number;
  is_active: boolean;
};

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UserPayload) => {
      const { data } = await api.post<{ data: User }>('/users', payload);
      return data.data;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['setup-checklist'] });
      toast.success(`User ${item.name} ditambahkan`);
    },
  });
}

export function useUpdateUser(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<UserPayload>) => {
      const { data } = await api.put<{ data: User }>(`/users/${id}`, payload);
      return data.data;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['setup-checklist'] });
      toast.success(`User ${item.name} disimpan`);
    },
  });
}
