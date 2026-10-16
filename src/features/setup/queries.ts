import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/lib/api';
import type { UserRole } from '@/types/models';

export interface LicenseInfo {
  no: string;
  /** The RS the license is issued to; the RS profile carries this name. */
  rs: string;
  issued: string;
  /** YYYY-MM-DD; '' = no end date. */
  expires: string;
  expired: boolean;
}

/** First-run state: activate the license, then create the first admin, then log in. */
export interface SetupStatus {
  licensed: boolean;
  license: LicenseInfo | null;
  has_admin: boolean;
  has_profile: boolean;
}

export function useSetupStatus() {
  return useQuery({
    queryKey: ['setup'],
    queryFn: async () => {
      const { data } = await api.get<{ data: SetupStatus }>('/public/setup');
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Step 1: store the license key (only while none is stored). */
export function useActivateLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => {
      const { data } = await api.post<{ data: LicenseInfo }>('/public/activate', { key });
      return data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['setup'] }),
  });
}

/** Step 2: the first admin account (only while there is none). */
export function useSetupAdmin() {
  return useMutation({
    mutationFn: async (payload: { name: string; email: string; password: string }) => {
      await api.post('/public/setup-admin', payload);
    },
  });
}

/** Admin: a new license (renewal or a renamed RS); the RS profile takes its name. */
export function useReplaceLicense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (key: string) => {
      const { data } = await api.put<{ data: LicenseInfo }>('/license', { key });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['setup'] });
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Lisensi diperbarui');
    },
  });
}

/** Admin: what the first-run checklist counts (services, active accounts per role, non-cash payment). */
export interface SetupChecklistData {
  services: number;
  users: Partial<Record<UserRole, number>>;
  payment_configured: boolean;
}

export function useSetupChecklist(enabled: boolean) {
  return useQuery({
    queryKey: ['setup-checklist'],
    queryFn: async () => (await api.get<{ data: SetupChecklistData }>('/settings/setup-checklist')).data.data,
    enabled,
  });
}
