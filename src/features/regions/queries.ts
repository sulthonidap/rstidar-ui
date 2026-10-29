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

/** A kelurahan/desa outline: rings of [lat, lng] (outer and holes). */
export interface RegionOutline {
  code: string;
  name: string;
  district: string;
  in_area: boolean;
  rings: [number, number][][];
}

/** Every known kelurahan/desa outline (Admin, for the service area map). */
export function useRegionMap() {
  return useQuery({
    queryKey: ['region-map'],
    staleTime: Infinity,
    queryFn: async () => (await api.get<{ data: RegionOutline[] }>('/regions/map')).data.data,
  });
}

/** The served area for the order forms' map: outlines (simplified) and their bounds. */
export interface ServiceAreaShape {
  bounds: [[number, number], [number, number]];
  rings: [number, number][][];
}

/** null = no outlines known for the area (the map isn't limited). */
export function usePublicServiceArea(enabled = true) {
  return useQuery({
    queryKey: ['public-service-area'],
    enabled,
    staleTime: 30 * 60_000,
    queryFn: async () => (await api.get<{ data: ServiceAreaShape | null }>('/public/regions/area')).data.data,
  });
}
