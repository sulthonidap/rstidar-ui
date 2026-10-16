import { ListChecksIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';

import { useSetupChecklistUI } from './context';

/** Sidebar entry back to the checklist, with progress; gone once the required steps are done. */
export function SetupChecklistSidebarItem() {
  const { enabled, complete, requiredDone, requiredTotal, openChecklist } = useSetupChecklistUI();
  if (!enabled || complete) return null;
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={`Setup awal ${requiredDone}/${requiredTotal}`}
          onClick={openChecklist}
          className="h-auto flex-col items-stretch gap-1.5 border border-brand-orange/40 bg-brand-orange/5 py-2 group-data-[collapsible=icon]:border-0"
        >
          <span className="flex items-center gap-2">
            <ListChecksIcon className="size-4 shrink-0 text-brand-orange" />
            <span className="flex-1 font-medium">Setup awal</span>
            <span className="text-xs text-muted-foreground">
              {requiredDone}/{requiredTotal}
            </span>
          </span>
          <span className="h-1.5 overflow-hidden rounded-full bg-muted group-data-[collapsible=icon]:hidden">
            <span
              className="block h-full rounded-full bg-brand-orange"
              style={{ width: `${(requiredDone / requiredTotal) * 100}%` }}
            />
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/** Dashboard reminder while the required steps aren't done. */
export function SetupChecklistBanner() {
  const { enabled, complete, requiredDone, requiredTotal, openChecklist } = useSetupChecklistUI();
  if (!enabled || complete) return null;
  return (
    <Alert className="border-brand-orange/40 bg-brand-orange/5">
      <ListChecksIcon className="text-brand-orange" />
      <AlertTitle>Setup awal belum selesai</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>
          {requiredDone} dari {requiredTotal} langkah wajib selesai. Lengkapi dulu supaya order bisa diproses sampai
          ke kurir.
        </span>
        <Button size="sm" onClick={openChecklist}>
          Lanjutkan setup
        </Button>
      </AlertDescription>
    </Alert>
  );
}
