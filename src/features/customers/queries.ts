import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api';
import type { Customer, Paginated } from '@/types/models';

export interface CustomerFilters {
  search?: string;
  page: number;
  perPage: number;
}

export function useCustomers(filters: CustomerFilters, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['customers', filters],
    queryFn: async () => {
      const params: Record<string, string | number> = { page: filters.page, per_page: filters.perPage };
      if (filters.search) params.search = filters.search;
      const { data } = await api.get<Paginated<Customer>>('/customers', { params });
      return data;
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

export interface CustomerPayload {
  name: string;
  phone: string;
  address: string;
  notes?: string;
  lat?: number | null;
  lng?: number | null;
}

export function useSaveCustomer(id?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CustomerPayload) => {
      const { data } = id
        ? await api.put<{ data: Customer }>(`/customers/${id}`, payload)
        : await api.post<{ data: Customer }>('/customers', payload);
      return data.data;
    },
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`Customer ${item.name} ${id ? 'disimpan' : 'ditambahkan'}`);
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: { id: number; name: string }) => api.delete(`/customers/${item.id}`),
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`Customer ${item.name} dihapus`);
    },
  });
}
