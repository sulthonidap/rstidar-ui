import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PageMeta } from '@/types/models';

const PER_PAGE_OPTIONS = [10, 20, 50, 100];

/** Footer for server-paginated tables: range summary, rows-per-page, and page navigation. */
export default function DataTablePagination({
  meta,
  onPageChange,
  onPerPageChange,
}: {
  meta: PageMeta | undefined;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}) {
  if (!meta) return null;

  const { page, per_page, total, last_page } = meta;
  const from = total === 0 ? 0 : (page - 1) * per_page + 1;
  const to = Math.min(page * per_page, total);

  return (
    <div className="flex flex-col-reverse items-center justify-between gap-3 border-t px-5 py-3 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Menampilkan <span className="font-medium text-foreground">{from}–{to}</span> dari{' '}
        <span className="font-medium text-foreground">{total}</span>
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Baris per halaman</span>
          <Select value={String(per_page)} onValueChange={(v) => onPerPageChange(Number(v))}>
            <SelectTrigger size="sm" className="w-18">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PER_PAGE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <span className="mr-2 text-sm text-muted-foreground">
            Hal. {page} / {last_page}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(1)}
            disabled={page <= 1}
            aria-label="Halaman pertama"
          >
            <ChevronsLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Halaman sebelumnya"
          >
            <ChevronLeftIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= last_page}
            aria-label="Halaman berikutnya"
          >
            <ChevronRightIcon />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(last_page)}
            disabled={page >= last_page}
            aria-label="Halaman terakhir"
          >
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
