import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { downloadFromApi } from '@/lib/download';
import type { Paginated, Transaction } from '@/types/models';

/** Over every matching transaction: money received (paid), refunded, and still owed (cancelled orders excluded). */
export interface TransactionSummary {
  total_amount: number;
  refunded_amount: number;
  unpaid_amount: number;
}

export interface TransactionFilters {
  search?: string;
  /** YYYY-MM-DD, inclusive, on the transaction's created date. */
  from?: string;
  to?: string;
  page: number;
  perPage: number;
}

function filterParams(filters: Omit<TransactionFilters, 'page' | 'perPage'>) {
  const params: Record<string, string> = {};
  if (filters.search) params.search = filters.search;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  return params;
}

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const params = { ...filterParams(filters), page: filters.page, per_page: filters.perPage };
      const { data } = await api.get<Paginated<Transaction> & { summary: TransactionSummary }>(
        '/transactions',
        { params },
      );
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

/** Downloads the .xlsx of every transaction matching the filters (all pages). */
export function downloadTransactionsExcel(filters: Omit<TransactionFilters, 'page' | 'perPage'>) {
  return downloadFromApi('/transactions/export', filterParams(filters), 'transaksi.xlsx');
}
