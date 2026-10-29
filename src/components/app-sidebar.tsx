import {
  BanknoteIcon,
  BedIcon,
  BoxIcon,
  BuildingIcon,
  ChartColumnIcon,
  ContactIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  MapIcon,
  SquarePlusIcon,
  TagIcon,
  TruckIcon,
  UsersIcon,
} from 'lucide-react';
import type { ComponentProps } from 'react';
import { NavLink, useLocation } from 'react-router';

import { NavUser } from '@/components/nav-user';
import { SetupChecklistSidebarItem } from '@/components/setup/SetupChecklistNav';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuth } from '@/lib/auth';
import { hasRole } from '@/lib/roles';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  visible: boolean;
  items: NavItem[];
}

export function AppSidebar({ ...props }: ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const location = useLocation();

  // "/orders/baru" also starts with "/orders": only the longest matching item is active.
  const isActive = (to: string, items: NavItem[]) =>
    location.pathname.startsWith(to) &&
    !items.some((o) => o.to.length > to.length && location.pathname.startsWith(o.to));

  const groups: NavGroup[] = [
    {
      label: 'Operasional',
      visible: hasRole(user, 'admin', 'cco', 'farmasi', 'ops', 'finance'),
      items: [
        { to: '/orders', label: 'Order', icon: BoxIcon },
        ...(hasRole(user, 'admin', 'cco', 'farmasi')
          ? [
              { to: '/orders/baru', label: 'Buat order', icon: SquarePlusIcon },
              { to: '/customers', label: 'Customer', icon: ContactIcon },
            ]
          : []),
        { to: '/rekap', label: 'Rekap', icon: ChartColumnIcon },
        ...(hasRole(user, 'admin', 'ops')
          ? [{ to: '/couriers', label: 'Rekap Kurir', icon: TruckIcon }]
          : []),
      ],
    },
    {
      label: 'Master Data',
      visible: hasRole(user, 'admin'),
      items: [
        { to: '/pengaturan/rs', label: 'Profil RS', icon: BuildingIcon },
        { to: '/services', label: 'Tipe Layanan', icon: TagIcon },
        { to: '/pengaturan/bangsal', label: 'Bangsal', icon: BedIcon },
        { to: '/pengaturan/wilayah', label: 'Wilayah Layanan', icon: MapIcon },
        { to: '/pengaturan/pembayaran', label: 'Pembayaran', icon: CreditCardIcon },
        { to: '/users', label: 'Kelola User', icon: UsersIcon },
      ],
    },
    {
      label: 'Keuangan',
      visible: hasRole(user, 'admin', 'finance'),
      items: [{ to: '/transactions', label: 'Laporan Transaksi', icon: BanknoteIcon }],
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              tooltip="MedSend"
              className="h-auto gap-3 data-[slot=sidebar-menu-button]:p-2! group-data-[collapsible=icon]:data-[slot=sidebar-menu-button]:p-0.5!"
            >
              <NavLink to="/">
                <img
                  src="/logo.png"
                  alt=""
                  className="size-10! object-contain group-data-[collapsible=icon]:size-8!"
                />
                <span className="text-2xl font-bold tracking-tight group-data-[collapsible=icon]:hidden">
                  <span className="text-primary">Med</span>
                  <span className="text-brand-orange">Send</span>
                </span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Dashboard" isActive={location.pathname === '/'}>
                  <NavLink to="/" end>
                    <LayoutDashboardIcon />
                    <span>Dashboard</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {groups
          .filter((g) => g.visible)
          .map((group) => (
            <SidebarGroup key={group.label}>
              {/* Collapsed labels are invisible but still overlap the item above; let clicks through. */}
              <SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.label}
                        isActive={isActive(item.to, group.items)}
                      >
                        <NavLink to={item.to}>
                          <item.icon />
                          <span>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
      </SidebarContent>

      <SidebarFooter>
        <SetupChecklistSidebarItem />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
