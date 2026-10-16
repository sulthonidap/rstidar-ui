import {
  CheckIcon,
  PackageCheckIcon,
  PillIcon,
  PrinterIcon,
  UserRoundPlusIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react';
import type { ComponentProps, ComponentType } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCouriers } from '@/features/couriers/queries';
import type { BulkTransitionResult, CancelPayment } from '@/features/orders/queries';
import { useBulkAssignCourier, useBulkTransition } from '@/features/orders/queries';
import { apiErrorMessage } from '@/lib/api';
import { formatRupiah } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import { awaitingPayment, PAYMENT_GATED_STEPS } from '@/lib/payment';
import { ASSIGNABLE_STATUSES, canMoveOrder, hasRole } from '@/lib/roles';
import LabelPrintDialog from '@/pages/orders/LabelPrintDialog';
import { CancelPaymentChoice } from '@/pages/orders/OrderActionDialogs';
import type { Order, OrderStatus, User } from '@/types/models';
import { ORDER_STATUS_LABELS } from '@/types/models';

const BULK_MOVES: { to: OrderStatus; label: string; icon: ComponentType }[] = [
  { to: 'confirmed', label: 'Konfirmasi', icon: CheckIcon },
  { to: 'ready_for_pickup', label: 'Siap diambil', icon: PillIcon },
  { to: 'packed', label: 'Diambil & dikemas', icon: PackageCheckIcon },
];

/** Button colours per kind of action: status moves are the main step, cancel stays red. */
const TONES = {
  move: 'bg-linear-to-r from-primary to-brand-blue text-white shadow-sm shadow-primary/25 hover:brightness-110',
  assign: 'bg-sky-600 text-white shadow-sm shadow-sky-600/25 hover:bg-sky-700',
  print: 'bg-amber-500 text-amber-950 shadow-sm shadow-amber-500/25 hover:bg-amber-600',
  cancel: 'bg-rose-600 text-white shadow-sm shadow-rose-600/25 hover:bg-rose-700',
};

/** Selected orders this user may move to `to` (the step must be theirs). */
const movableFor = (user: User | null, orders: Order[], to: OrderStatus) =>
  orders.filter((o) => canMoveOrder(user, o.status, to));

/** …minus the unpaid ones where the step waits for the payment (confirm, pack). */
const eligibleFor = (user: User | null, orders: Order[], to: OrderStatus) =>
  movableFor(user, orders, to).filter((o) => !(PAYMENT_GATED_STEPS.includes(to) && awaitingPayment(o)));

/** Orders that can still get a (new) courier. */
const assignable = (orders: Order[]) => orders.filter((o) => ASSIGNABLE_STATUSES.includes(o.status));

function reportResult(result: BulkTransitionResult, successMessage: string) {
  if (result.updated.length > 0) {
    toast.success(successMessage.replace('{n}', String(result.updated.length)));
  }
  if (result.failed.length > 0) {
    const shown = result.failed.slice(0, 3).map((f) => `${f.code ?? `#${f.id}`}: ${f.error}`);
    if (result.failed.length > 3) shown.push(`…dan ${result.failed.length - 3} lainnya`);
    toast.warning(`${result.failed.length} order gagal diproses`, { description: shown.join('\n') });
  }
}

/** Floating bar shown at the bottom of the screen while rows are selected. */
export default function OrderBulkActions({
  selected,
  onClear,
}: {
  selected: Order[];
  onClear: () => void;
}) {
  const { user } = useAuth();
  const canAssign = hasRole(user, 'admin', 'ops');
  const bulk = useBulkTransition();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  if (selected.length === 0) return null;

  const run = async (to: OrderStatus, note?: string, payment?: CancelPayment) => {
    const ids = eligibleFor(user, selected, to).map((o) => o.id);
    const unpaid = movableFor(user, selected, to).length - ids.length;
    try {
      const result = await bulk.mutateAsync({ ids, status: to, note, payment });
      reportResult(result, `{n} order → ${ORDER_STATUS_LABELS[to]}`);
      if (unpaid > 0) toast.info(`${unpaid} order dilewati karena belum lunas`);
      onClear();
      return true;
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Gagal memproses order'));
      return false;
    }
  };

  const cancellable = eligibleFor(user, selected, 'cancelled');
  const printable = selected.filter((o) => o.status !== 'cancelled');
  const toAssign = canAssign ? assignable(selected) : [];

  // Still shown when every pick is unpaid (disabled, with the reason) so the CCO isn't left guessing.
  const moves = BULK_MOVES.map((m) => {
    const movable = movableFor(user, selected, m.to).length;
    const count = eligibleFor(user, selected, m.to).length;
    return { ...m, count, unpaid: movable - count };
  }).filter((m) => m.count + m.unpaid > 0);
  const total = selected.length;

  return (
    <>
      <div
        role="toolbar"
        aria-label="Aksi untuk order terpilih"
        className="fixed bottom-6 left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 animate-in items-center gap-2 overflow-x-auto rounded-2xl border border-primary/15 bg-popover/95 p-2 text-popover-foreground shadow-[0_12px_40px_-12px] shadow-primary/40 backdrop-blur-md fade-in dark:border-white/10 slide-in-from-bottom-4"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label="Batal pilih">
              <XIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Batal pilih</TooltipContent>
        </Tooltip>
        <span className="flex items-center gap-1.5 pr-2 text-sm whitespace-nowrap">
          <span className="grid size-6 place-items-center rounded-full bg-linear-to-br from-primary to-brand-blue text-xs font-semibold text-white tabular-nums">
            {total}
          </span>
          <span className="text-muted-foreground">order dipilih</span>
        </span>
        <Separator orientation="vertical" className="h-6!" />

        {moves.map(({ to, label, icon: Icon, count, unpaid }) => (
          <BulkButton
            key={to}
            className={TONES.move}
            count={count}
            total={total}
            hint={unpaid > 0 ? `${unpaid} order belum lunas, tandai lunas dulu` : undefined}
            onClick={() => run(to)}
            disabled={bulk.isPending || count === 0}
          >
            <Icon />
            {label}
          </BulkButton>
        ))}
        {toAssign.length > 0 && (
          <BulkButton
            className={TONES.assign}
            count={toAssign.length}
            total={total}
            onClick={() => setAssignOpen(true)}
            disabled={bulk.isPending}
          >
            <UserRoundPlusIcon />
            Tugaskan kurir
          </BulkButton>
        )}
        {printable.length > 0 && (
          <BulkButton className={TONES.print} count={printable.length} total={total} onClick={() => setLabelOpen(true)}>
            <PrinterIcon />
            Cetak label
          </BulkButton>
        )}

        {cancellable.length > 0 && (
          <>
            <Separator orientation="vertical" className="h-6!" />
            <BulkButton
              className={TONES.cancel}
              count={cancellable.length}
              total={total}
              onClick={() => setCancelOpen(true)}
              disabled={bulk.isPending}
            >
              <XCircleIcon />
              Batalkan
            </BulkButton>
          </>
        )}
      </div>

      <LabelPrintDialog orders={printable} open={labelOpen} onOpenChange={setLabelOpen} />
      {toAssign.length > 0 && (
        <BulkAssignDialog orders={toAssign} open={assignOpen} onOpenChange={setAssignOpen} onDone={onClear} />
      )}

      <BulkCancelDialog
        count={cancellable.length}
        paid={cancellable.filter((o) => o.transaction?.payment_status === 'paid')}
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        pending={bulk.isPending}
        onConfirm={async (note, payment) => {
          if (await run('cancelled', note, payment)) setCancelOpen(false);
        }}
      />
    </>
  );
}

/**
 * Toolbar button. When an action only applies to part of the selection it shows
 * "n/total" with a tooltip, so the user knows the rest will be skipped.
 */
function BulkButton({
  count,
  total,
  hint,
  children,
  ...props
}: ComponentProps<typeof Button> & { count: number; total: number; hint?: string }) {
  const partial = count < total;
  const button = (
    <Button size="sm" className="shrink-0" {...props}>
      {children}
      {partial && (
        <span className="rounded-full bg-current/15 px-1.5 text-[11px] font-medium tabular-nums">
          {count}/{total}
        </span>
      )}
    </Button>
  );
  if (!partial) return button;
  return (
    <Tooltip>
      {/* A disabled button gets no hover, so the span carries the tooltip. */}
      <TooltipTrigger asChild>{props.disabled ? <span tabIndex={0}>{button}</span> : button}</TooltipTrigger>
      <TooltipContent>
        Berlaku untuk {count} dari {total} order terpilih — sisanya dilewati
        {hint && <> ({hint})</>}
      </TooltipContent>
    </Tooltip>
  );
}

function BulkCancelDialog({
  count,
  paid,
  open,
  onOpenChange,
  pending,
  onConfirm,
}: {
  count: number;
  /** Paid orders among them: one refund choice applies to all of these. */
  paid: Order[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onConfirm: (note?: string, payment?: CancelPayment) => void;
}) {
  const [note, setNote] = useState('');
  const [payment, setPayment] = useState<CancelPayment>('refund');
  const [error, setError] = useState<string | null>(null);
  const paidTotal = paid.reduce((sum, o) => sum + (o.transaction?.amount ?? 0), 0);
  const reasonRequired = paid.length > 0 && payment === 'keep';

  const confirm = () => {
    if (reasonRequired && !note.trim()) {
      setError('Isi alasan kenapa pembayarannya tidak di-refund');
      return;
    }
    onConfirm(note.trim() || undefined, paid.length > 0 ? payment : undefined);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setNote('');
          setPayment('refund');
          setError(null);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Batalkan {count} order?</DialogTitle>
          <DialogDescription>Order yang dibatalkan tidak bisa diaktifkan lagi.</DialogDescription>
        </DialogHeader>
        {paid.length > 0 && (
          <CancelPaymentChoice
            value={payment}
            onChange={setPayment}
            title={`${paid.length} order sudah lunas (total ${formatRupiah(paidTotal)})`}
            refundLabel={`Batal + refund ${paid.length} order itu`}
          />
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="space-y-1.5">
          <Label htmlFor="bulk-cancel-note">Alasan {reasonRequired ? '(wajib)' : '(opsional)'}</Label>
          <Textarea
            id="bulk-cancel-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Berlaku untuk semua order yang dibatalkan"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Kembali
          </Button>
          <Button variant="destructive" onClick={confirm} disabled={pending}>
            {pending ? 'Membatalkan…' : `Ya, batalkan ${count} order`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkAssignDialog({
  orders,
  open,
  onOpenChange,
  onDone,
}: {
  orders: Order[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const assign = useBulkAssignCourier();
  const { data: couriers, isLoading } = useCouriers({ enabled: open });
  const [courierId, setCourierId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const options = (couriers ?? []).filter((c) => c.is_active);

  const submit = async () => {
    setError(null);
    try {
      const result = await assign.mutateAsync({ ids: orders.map((o) => o.id), courier_id: Number(courierId) });
      const name = options.find((c) => String(c.id) === courierId)?.user?.name ?? 'kurir';
      reportResult(result, `{n} order ditugaskan ke ${name}`);
      onOpenChange(false);
      onDone();
    } catch (err) {
      setError(apiErrorMessage(err, 'Gagal menugaskan kurir'));
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) {
          setCourierId('');
          setError(null);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tugaskan kurir ke {orders.length} order</DialogTitle>
          <DialogDescription>Kurir yang sudah ditugaskan sebelumnya akan diganti.</DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-1.5">
          <Label>Kurir</Label>
          <Select value={courierId} onValueChange={setCourierId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={isLoading ? 'Memuat kurir…' : '— pilih kurir —'} />
            </SelectTrigger>
            <SelectContent>
              {options.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.user?.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={submit} disabled={!courierId || assign.isPending}>
            {assign.isPending ? 'Menyimpan…' : `Tugaskan ke ${orders.length} order`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
