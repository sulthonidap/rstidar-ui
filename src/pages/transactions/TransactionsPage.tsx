import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import Loader from '@/components/Loader';
import { FileSpreadsheetIcon, LoaderCircleIcon } from 'lucide-react';
import { toast } from 'sonner';

import DataTablePagination from '@/components/DataTablePagination';
import type { DateRange } from '@/components/DateRangePicker';
import DateRangePicker from '@/components/DateRangePicker';
import TableSearch from '@/components/TableSearch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { downloadTransactionsExcel, useTransactions } from '@/features/transactions/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { fileUrl } from '@/lib/api';
import { formatDateTime, formatRupiah, toDateParam } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_COLOR, PAYMENT_STATUS_LABELS } from '@/lib/payment';
import type { Transaction } from '@/types/models';

const PAYMENT_LABELS = PAYMENT_STATUS_LABELS;
const PAYMENT_COLOR = PAYMENT_STATUS_COLOR;

const columnHelper = createColumnHelper<Transaction>();

export default function TransactionsPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const [range, setRange] = useState<DateRange | undefined>();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [exporting, setExporting] = useState(false);

  const filters = { search: debouncedSearch, from: toDateParam(range?.from), to: toDateParam(range?.to) };

  // New filters start again from page 1.
  const filterKey = `${filters.search}|${filters.from}|${filters.to}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const { data, isLoading, isPlaceholderData } = useTransactions({ ...filters, page, perPage });

  const exportExcel = async () => {
    setExporting(true);
    try {
      const filename = await downloadTransactionsExcel(filters);
      toast.success(`${filename} diunduh`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal export Excel');
    } finally {
      setExporting(false);
    }
  };
  const transactions = data?.data;
  const meta = data?.meta;
  if (meta && page > meta.last_page) setPage(meta.last_page);


  // Summed server-side over every matching transaction, not just this page.
  const summary = data?.summary;

  const columns = useMemo(
    () => [
      columnHelper.accessor((row) => row.order?.code, { id: 'code', header: 'No. Order' }),
      columnHelper.accessor((row) => row.order?.customer_name, {
        id: 'customer',
        header: 'Customer',
      }),
      columnHelper.accessor('amount', {
        header: 'Nominal',
        cell: (info) => formatRupiah(info.getValue()),
      }),
      columnHelper.accessor('payment_status', {
        header: 'Pembayaran',
        cell: (info) => {
          const t = info.row.original;
          return (
            <div className="space-y-1">
              {/* Never paid and the order was cancelled: nothing is owed any more. */}
              {info.getValue() === 'unpaid' && t.order?.status === 'cancelled' ? (
                <Badge variant="outline" className={`border-transparent ${PAYMENT_COLOR.refunded}`}>
                  Batal
                </Badge>
              ) : (
                <Badge variant="outline" className={`border-transparent ${PAYMENT_COLOR[info.getValue()]}`}>
                  {PAYMENT_LABELS[info.getValue()]}
                </Badge>
              )}
              {t.payment_method && (
                <div className="text-xs text-muted-foreground">
                  {PAYMENT_METHOD_LABELS[t.payment_method]}
                  {t.proof_url && (
                    <>
                      {' · '}
                      <a href={fileUrl(t.proof_url)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        Lihat bukti
                      </a>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('paid_at', {
        header: 'Tgl bayar',
        cell: (info) => (info.getValue() ? formatDateTime(info.getValue()) : '—'),
      }),
      columnHelper.accessor('created_at', {
        header: 'Dibuat',
        cell: (info) => formatDateTime(info.getValue()),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: transactions ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 py-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Uang masuk (lunas){range?.from ? ' · sesuai filter tanggal' : ''}
            </p>
            <p className="text-2xl font-bold">{isLoading || !summary ? '—' : formatRupiah(summary.total_amount)}</p>
          </div>
          <div className="flex gap-8 text-sm">
            <div>
              <p className="text-muted-foreground">Refund</p>
              <p className="font-semibold">{summary ? formatRupiah(summary.refunded_amount) : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Belum bayar</p>
              <p className="font-semibold text-amber-700 dark:text-amber-300">
                {summary ? formatRupiah(summary.unpaid_amount) : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <TableSearch value={search} onChange={setSearch} placeholder="Cari no. order, customer, RS…" />
        <DateRangePicker value={range} onChange={setRange} />
        <Button variant="outline" className="h-9 sm:ml-auto" onClick={exportExcel} disabled={exporting}>
          {exporting ? <LoaderCircleIcon className="animate-spin" /> : <FileSpreadsheetIcon className="text-emerald-600" />}
          Export Excel
        </Button>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="px-0">
          <div className={cn('overflow-x-auto transition-opacity', isPlaceholderData && 'opacity-60')}>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead key={header.id}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                      <Loader label="Memuat transaksi…" />
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && transactions?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                      {debouncedSearch ? 'Nggak ada transaksi yang cocok dengan pencarian.' : 'Belum ada transaksi.'}
                    </TableCell>
                  </TableRow>
                )}
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination
            meta={meta}
            onPageChange={setPage}
            onPerPageChange={(n) => {
              setPerPage(n);
              setPage(1);
            }}
          />
        </CardContent>
      </Card>

    </div>
  );
}
