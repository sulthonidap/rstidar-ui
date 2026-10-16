import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { downloadFromApi } from '@/lib/download';

export type RecapPeriod = 'daily' | 'monthly';

export interface RecapFilters {
  period: RecapPeriod;
  /** "YYYY-MM" for daily, "YYYY" for monthly. */
  value: string;
}

export interface RecapRow {
  period: string;
  total: number;
  done: number;
  cancelled: number;
  in_progress: number;
  /** Admin & Finance only: the API leaves it out for the other roles. */
  revenue?: number;
  avg_ready_minutes: number | null;
  avg_done_minutes: number | null;
  by_service: Record<string, number>;
}

export interface Recap {
  period: RecapPeriod;
  from: string;
  to: string;
  rows: RecapRow[];
  total: RecapRow;
  services: { id: number; name: string }[];
}

function params(f: RecapFilters): Record<string, string> {
  const p: Record<string, string> = { period: f.period };
  if (f.period === 'daily') p.month = f.value;
  else p.year = f.value;
  return p;
}

export function useRecap(filters: RecapFilters) {
  return useQuery({
    queryKey: ['reports', 'recap', filters],
    queryFn: async () => {
      const { data } = await api.get<{ data: Recap }>('/reports/recap', { params: params(filters) });
      return data.data;
    },
    placeholderData: keepPreviousData,
  });
}

export function downloadRecapExcel(filters: RecapFilters) {
  return downloadFromApi('/reports/recap/export', params(filters), 'rekap.xlsx');
}
