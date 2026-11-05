import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { apiErrorMessage } from '@/lib/api';

/**
 * The eye button on masked patient data: fetches a row's real values on click
 * and forgets them on the next click. Kept in this state only (not the query
 * cache), so they're gone once the page is left.
 */
export function useReveal<T>(fetchPrivate: (id: number) => Promise<T>) {
  const [rows, setRows] = useState<Record<number, T>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});

  const toggle = useCallback(
    async (id: number) => {
      if (id in rows) {
        setRows(({ [id]: _hidden, ...rest }) => rest);
        return;
      }
      setLoading((l) => ({ ...l, [id]: true }));
      try {
        const data = await fetchPrivate(id);
        setRows((r) => ({ ...r, [id]: data }));
      } catch (err) {
        toast.error(apiErrorMessage(err, 'Gagal membuka data'));
      } finally {
        setLoading((l) => ({ ...l, [id]: false }));
      }
    },
    [rows, fetchPrivate],
  );

  return useMemo(
    () => ({
      /** The real values, while shown. */
      get: (id: number): T | undefined => rows[id],
      isLoading: (id: number) => !!loading[id],
      toggle,
    }),
    [rows, loading, toggle],
  );
}
