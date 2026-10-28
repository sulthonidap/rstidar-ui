import type { RowSelectionState } from '@tanstack/react-table';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { PlusIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import OrderPrice from '@/components/OrderPrice';
import Loader from '@/components/Loader';
import DataTablePagination from '@/components/DataTablePagination';
import type { DateRange } from '@/components/DateRangePicker';
import DateRangePicker from '@/components/DateRangePicker';
import StatusBadge from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import TableSearch from '@/components/TableSearch';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ScheduleFilter } from '@/features/orders/queries';
import { useOrders } from '@/features/orders/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useAuth } from '@/lib/auth';
import { formatDateTime, toDateParam } from '@/lib/format';
import { awaitingPayment, PAYMENT_STATUS_COLOR } from '@/lib/payment';
import { hasRole } from '@/lib/roles';
import { isToday, parseDay, SCHEDULE_SLOTS } from '@/lib/schedule';
import { orderDistanceKm } from '@/lib/geo';
import { cn } from '@/lib/utils';
import OrderBulkActions from '@/pages/orders/OrderBulkActions';
import CourierRoutesMap from '@/pages/orders/CourierRoutesMap';
import type { MapView } from '@/pages/orders/MapViewTabs';
import MapViewTabs from '@/pages/orders/MapViewTabs';
import OrdersMap from '@/pages/orders/OrdersMap';
import OrderStatusCards from '@/pages/orders/OrderStatusCards';
import OrderRowActions from '@/pages/orders/OrderRowActions';
import type { Order, OrderStatus } from '@/types/models';
import { ORDER_STATUS_LABELS, ORDER_STATUSES as STATUS_OPTIONS } from '@/types/models';

const columnHelper = createColumnHelper<Order>();
const STICKY_RIGHT = 'sticky right-0 z-10 shadow-[-8px_0_8px_-8px_rgb(0_0_0/0.18)]';
const shortDay = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });

/** "Secepatnya", "Hari ini · Pagi" (highlighted) or "1 Okt · Siang". */
function ScheduleCell({ date, slot }: { date?: string | null; slot?: Order['scheduled_slot'] }) {
  if (!date) return <span className="text-muted-foreground">Secepatnya</span>;
  const slotLabel = SCHEDULE_SLOTS.find((s) => s.value === slot)?.label;
  const today = isToday(date);
  return (
    <span className={cn('whitespace-nowrap', today && 'font-semibold text-brand-orange')}>
      {today ? 'Hari ini' : shortDay.format(parseDay(date))}
      {slotLabel && <span className="font-normal text-muted-foreground"> · {slotLabel}</span>}
    </span>
  );
}

export default function OrdersListPage() {
  const { user } = useAuth();
  const canSeeRoutes = hasRole(user, 'admin', 'ops');
  const [mapView, setMapView] = useState<MapView>('paket');
  const canBulk = hasRole(user, 'admin', 'cco', 'farmasi', 'ops');
  const canCreate = hasRole(user, 'admin', 'cco', 'farmasi');
  const [searchParams, setSearchParams] = useSearchParams();
  const status = (searchParams.get('status') as OrderStatus | null) ?? '';
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const [range, setRange] = useState<DateRange | undefined>();
  const from = toDateParam(range?.from);
  const to = toDateParam(range?.to);
  const [schedule, setSchedule] = useState<ScheduleFilter>('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // A new search starts again from page 1.
  const [prevSearch, setPrevSearch] = useState(debouncedSearch);
  if (debouncedSearch !== prevSearch) {
    setPrevSearch(debouncedSearch);
    setPage(1);
  }

  const { data, isLoading, isError, isPlaceholderData } = useOrders({
    status,
    search: debouncedSearch,
    from,
    to,
    schedule,
    page,
    perPage,
  });
  const orders = data?.data;
  const meta = data?.meta;

  // Data shrank under us (e.g. filter elsewhere) — don't strand the user past the last page.
  if (meta && page > meta.last_page) setPage(meta.last_page);

  const setStatus = (value: string) => {
    setSearchParams(value === 'all' ? {} : { status: value });
    setPage(1);
  };
  const changeRange = (next: DateRange | undefined) => {
    setRange(next);
    setPage(1);
  };
  const changeSchedule = (value: string) => {
    setSchedule(value === 'all' ? '' : (value as ScheduleFilter));
    setPage(1);
  };
  const isFiltered = !!status || !!debouncedSearch || !!from || !!schedule;

  // Selection only covers the rows on screen: clear it whenever the visible page changes.
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const selectionScope = `${status}|${debouncedSearch}|${from}|${to}|${schedule}|${page}|${perPage}`;
  const [prevScope, setPrevScope] = useState(selectionScope);
  if (selectionScope !== prevScope) {
    setPrevScope(selectionScope);
    setRowSelection({});
  }

  const columns = useMemo(
    () => [
      ...(canBulk
        ? [
            columnHelper.display({
              id: 'select',
              header: ({ table }) => (
                <Checkbox
                  checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && 'indeterminate')
                  }
                  onCheckedChange={(v) => table.toggleAllPageRowsSelected(v === true)}
                  aria-label="Pilih semua order di halaman ini"
                />
              ),
              cell: ({ row }) => (
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(v) => row.toggleSelected(v === true)}
                  aria-label={`Pilih ${row.original.code}`}
                />
              ),
            }),
          ]
        : []),
      columnHelper.accessor('code', {
        header: 'No. Order',
        cell: (info) => (
          <Link
            to={`/orders/${info.row.original.id}`}
            className="font-semibold text-primary hover:underline"
          >
            {info.getValue()}
          </Link>
        ),
      }),
      columnHelper.accessor('customer_name', {
        header: 'Customer',
        cell: (info) => (
          <div>
            <div className="font-medium">{info.getValue()}</div>
            <div className="text-xs text-muted-foreground">{info.row.original.customer_phone}</div>
          </div>
        ),
      }),
      columnHelper.accessor((row) => row.service?.name, {
        id: 'service',
        header: 'Layanan',
        cell: (info) => info.getValue() ?? '—',
      }),
      columnHelper.accessor('scheduled_date', {
        header: 'Jadwal',
        cell: (info) => <ScheduleCell date={info.getValue()} slot={info.row.original.scheduled_slot} />,
      }),
      columnHelper.accessor((row) => orderDistanceKm(row), {
        id: 'distance',
        header: 'Jarak',
        cell: (info) => {
          const km = info.getValue();
          if (km === null) return <span className="text-muted-foreground">—</span>;
          const estimate = info.row.original.distance_source === 'estimate';
          return (
            <span className="whitespace-nowrap" title={estimate ? 'Perkiraan (server rute tidak tersedia)' : 'Lewat jalan'}>
              {estimate && '± '}
              {km.toLocaleString('id-ID', { maximumFractionDigits: 1 })} km
            </span>
          );
        },
      }),
      columnHelper.accessor((row) => row.courier?.user?.name, {
        id: 'courier',
        header: 'Kurir',
        cell: (info) => info.getValue() ?? '—',
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => {
          const order = info.row.original;
          // Unpaid open orders: the CCO sees which ones are still waiting for the payment.
          const unpaid = awaitingPayment(order) && order.status !== 'done' && order.status !== 'cancelled';
          return (
            <div className="flex flex-col items-start gap-1">
              <StatusBadge status={info.getValue()} />
              {unpaid && (
                <Badge variant="outline" className={`border-transparent text-[11px] ${PAYMENT_STATUS_COLOR.unpaid}`}>
                  Belum bayar
                </Badge>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor('price', {
        header: 'Harga',
        cell: (info) => <OrderPrice order={info.row.original} />,
      }),
      columnHelper.accessor('created_at', {
        header: 'Masuk',
        cell: (info) => formatDateTime(info.getValue()),
      }),
      columnHelper.display({
        id: 'actions',
        // Pinned to the right edge so the ⋯ menu is reachable without scrolling sideways.
        meta: { headerClassName: STICKY_RIGHT, cellClassName: `${STICKY_RIGHT} bg-inherit` },
        header: () => <span className="sr-only">Aksi</span>,
        cell: (info) => (
          <div className="flex items-center justify-end gap-1.5">
            <OrderRowActions order={info.row.original} />
          </div>
        ),
      }),
    ],
    [canBulk],
  );

  const table = useReactTable({
    data: orders ?? [],
    columns,
    getRowId: (row) => String(row.id),
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: canBulk,
    getCoreRowModel: getCoreRowModel(),
  });
  const selectedOrders = table.getSelectedRowModel().rows.map((r) => r.original);

  return (
    <div className="space-y-4">
      <OrderStatusCards
        counts={data?.summary?.by_status}
        active={status}
        onSelect={(s) => setStatus(s || 'all')}
        loading={isLoading}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <TableSearch
            value={search}
            onChange={setSearch}
            placeholder="Cari no. order, customer, RS…"
          />
          <DateRangePicker value={range} onChange={changeRange} />
          <Select value={schedule || 'all'} onValueChange={changeSchedule}>
            <SelectTrigger className="w-44" aria-label="Filter jadwal kirim">
              <SelectValue placeholder="Semua jadwal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua jadwal</SelectItem>
              <SelectItem value="today">Jadwal hari ini</SelectItem>
              <SelectItem value="later">Terjadwal nanti</SelectItem>
              <SelectItem value="asap">Secepatnya</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={status || 'all'} onValueChange={setStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canCreate && (
            <Button asChild>
              <Link to="/orders/baru">
                <PlusIcon />
                Buat order
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="px-0">
          <div className={cn('overflow-x-auto transition-opacity', isPlaceholderData && 'opacity-60')}>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className={header.column.columnDef.meta?.headerClassName}>
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
                      <Loader label="Memuat order…" />
                    </TableCell>
                  </TableRow>
                )}
                {isError && (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="py-8 text-center text-destructive">
                      Gagal memuat order. Coba refresh halaman.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !isError && orders?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                      {isFiltered ? 'Nggak ada order yang cocok dengan pencarian.' : 'Belum ada order.'}
                    </TableCell>
                  </TableRow>
                )}
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className={cell.column.columnDef.meta?.cellClassName}>
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

      {/* Admin & Ops can switch the map to the couriers' routes. */}
      {canSeeRoutes && mapView === 'rute' ? (
        <CourierRoutesMap view={mapView} onViewChange={setMapView} />
      ) : (
        <OrdersMap
          filters={{ status, search: debouncedSearch, from, to, schedule }}
          tabs={canSeeRoutes ? <MapViewTabs value={mapView} onChange={setMapView} /> : undefined}
        />
      )}

      <OrderBulkActions selected={selectedOrders} onClear={() => setRowSelection({})} />
    </div>
  );
}
