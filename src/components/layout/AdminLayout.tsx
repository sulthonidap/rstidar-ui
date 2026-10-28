import type { CSSProperties } from 'react';
import { Outlet, useLocation } from 'react-router';

import { AppSidebar } from '@/components/app-sidebar';
import { PageHeading } from '@/components/layout/PageHeading';
import { SiteHeader } from '@/components/site-header';
import OrderNotificationsProvider from '@/components/notifications/OrderNotificationsProvider';
import SetupChecklistProvider from '@/components/setup/SetupChecklistProvider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth';
import { hasRole } from '@/lib/roles';
import { LicenseExpiredBanner } from '@/pages/settings/LicenseCard';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/orders': 'Order',
  '/orders/baru': 'Buat Order',
  '/customers': 'Customer',
  '/rekap': 'Rekap',
  '/pengaturan/pembayaran': 'Pengaturan Pembayaran',
  '/couriers': 'Rekap Kurir',
  '/pengaturan/rs': 'Profil RS',
  '/services': 'Tipe Layanan',
  '/pengaturan/bangsal': 'Bangsal',
  '/users': 'Kelola User',
  '/transactions': 'Laporan Transaksi',
};

function titleFor(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith('/orders/')) return 'Detail Order';
  return 'MedSend';
}

export default function AdminLayout() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <OrderNotificationsProvider>
      <SetupChecklistProvider>
      <TooltipProvider delayDuration={0}>
        <SidebarProvider
          style={
            {
              '--sidebar-width': 'calc(var(--spacing) * 64)',
              '--header-height': 'calc(var(--spacing) * 14)',
            } as CSSProperties
          }
        >
          <AppSidebar variant="inset" />
          <SidebarInset>
            <SiteHeader title={titleFor(location.pathname)} />
            <div className="flex flex-1 flex-col">
              <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:p-6">
                {hasRole(user, 'admin') && <LicenseExpiredBanner />}
                <PageHeading pathname={location.pathname} />
                <Outlet />
              </div>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
      </SetupChecklistProvider>
    </OrderNotificationsProvider>
  );
}
