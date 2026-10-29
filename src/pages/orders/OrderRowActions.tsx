import {
  EllipsisIcon,
  EyeIcon,
  HandHeartIcon,
  PencilIcon,
  PrinterIcon,
  UserRoundPlusIcon,
  XCircleIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useOrderActions } from '@/pages/orders/useOrderActions';
import type { Order } from '@/types/models';

/** Row actions: the next status step as an icon button, plus everything in the "⋯" menu. */
export default function OrderRowActions({ order }: { order: Order }) {
  const navigate = useNavigate();
  const a = useOrderActions(order);

  return (
    <>
      {a.showFreeClaim && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon-sm"
              className="bg-sky-600 text-white hover:bg-sky-700"
              onClick={a.openFreeClaim}
              aria-label={`Cek pengajuan gratis (${order.code})`}
            >
              <HandHeartIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Cek pengajuan ongkir gratis</TooltipContent>
        </Tooltip>
      )}
      {/* The next status step sits next to the "⋯" menu, one click away. */}
      {a.quickMoves.map(({ to, label, icon: Icon, blocked }) => (
        <Tooltip key={to}>
          <TooltipTrigger asChild>
            {/* A disabled button gets no hover, so the span carries the tooltip. */}
            <span tabIndex={blocked ? 0 : -1}>
              <Button
                size="icon-sm"
                onClick={() => a.moveTo(to)}
                disabled={a.isMoving || !!blocked}
                aria-label={`${label} (${order.code})`}
              >
                <Icon />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>{blocked ?? label}</TooltipContent>
        </Tooltip>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Aksi untuk ${order.code}`}>
            <EllipsisIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-xs text-muted-foreground">{order.code}</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => navigate(`/orders/${order.id}`)}>
            <EyeIcon />
            Lihat detail
          </DropdownMenuItem>
          {a.showPrint && (
            <DropdownMenuItem onSelect={a.openLabel}>
              <PrinterIcon />
              Cetak label
            </DropdownMenuItem>
          )}
          {a.showFreeClaim && (
            <DropdownMenuItem onSelect={a.openFreeClaim}>
              <HandHeartIcon />
              Cek pengajuan gratis…
            </DropdownMenuItem>
          )}
          {a.showEdit && (
            <DropdownMenuItem onSelect={a.openEdit}>
              <PencilIcon />
              Edit order…
            </DropdownMenuItem>
          )}

          {(a.quickMoves.length > 0 || a.showAssign) && <DropdownMenuSeparator />}
          {a.quickMoves.map(({ to, label, icon: Icon, blocked }) => (
            <DropdownMenuItem key={to} onSelect={() => a.moveTo(to)} disabled={a.isMoving || !!blocked}>
              <Icon />
              {label}
              {blocked && <span className="ml-auto text-xs text-muted-foreground">belum lunas</span>}
            </DropdownMenuItem>
          ))}
          {a.showAssign && (
            <DropdownMenuItem onSelect={a.openAssign}>
              <UserRoundPlusIcon />
              {a.assignLabel}…
            </DropdownMenuItem>
          )}

          {a.showCancel && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={a.openCancel}>
                <XCircleIcon />
                Batalkan order…
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {a.dialogs}
    </>
  );
}
