import NotificationBell from '@/components/notifications/NotificationBell';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function SiteHeader({ title }: { title: string }) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b-2 border-brand-orange bg-linear-to-r from-primary to-brand-blue text-primary-foreground transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) md:rounded-t-xl">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 hover:bg-white/15 hover:text-primary-foreground" />
        <Separator orientation="vertical" className="mx-2 bg-white/30 data-[orientation=vertical]:h-4" />
        <h1 className="text-base font-semibold">{title}</h1>
        <div className="ml-auto">
          <NotificationBell />
        </div>
      </div>
    </header>
  );
}
