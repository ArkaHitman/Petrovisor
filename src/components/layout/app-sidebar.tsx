'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroupLabel,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Fuel,
  FileText,
  Landmark,
  Database,
  Settings,
  CircleHelp,
  Droplets,
  Briefcase,
  HandCoins,
  ReceiptText,
  Banknote,
  Download,
  Ruler,
  FileScan,
  Spline,
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-provider';

const overviewMenuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
];

const operationsMenuItems = [
  { href: '/reports', label: 'Monthly Reports', icon: FileText },
  { href: '/purchases', label: 'Fuel Purchases', icon: Fuel },
  { href: '/tanks', label: 'Live Tank Status', icon: Database },
  { href: '/dip-entry', label: 'DIP Entry', icon: Ruler },
  { href: '/dsr', label: 'DSR Analysis', icon: FileScan },
];

const financialsMenuItems = [
  { href: '/bank', label: 'Bank Ledger', icon: Landmark },
  { href: '/manager-ledger', label: 'Manager Ledger', icon: Briefcase },
  { href: '/credit', label: 'Overall Credit', icon: ReceiptText },
  { href: '/misc-collection', label: 'Misc Collection', icon: HandCoins },
  { href: '/misc-payments', label: 'Misc Payments', icon: Banknote },
  { href: '/fund-analysis', label: 'Fund Analysis', icon: Spline },
];

const dataMenuItems = [
  { href: '/download-report', label: 'Download Report', icon: Download },
];


const NavMenu = ({ items }: { items: { href: string; label: string; icon: React.ElementType }[] }) => {
  const pathname = usePathname();
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.label}>
          <SidebarMenuButton
            asChild
            isActive={pathname === item.href}
            tooltip={{ children: item.label }}
          >
            <Link href={item.href}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
};

const AppSidebar = () => {
  const pathname = usePathname();
  const { settings } = useAppState();

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarHeader className="items-center justify-center p-4">
        <Link href="/" className="flex items-center gap-2">
          <Droplets className="w-8 h-8 text-primary" />
          <span className="font-headline text-lg font-semibold group-data-[collapsible=icon]:hidden">
            {settings?.pumpName || 'PetroVisor'}
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <NavMenu items={overviewMenuItems} />
        <SidebarSeparator />
        <div>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <NavMenu items={operationsMenuItems} />
        </div>
        <SidebarSeparator />
        <div>
          <SidebarGroupLabel>Financials</SidebarGroupLabel>
          <NavMenu items={financialsMenuItems} />
        </div>
        <SidebarSeparator />
        <div>
          <SidebarGroupLabel>Data & Reports</SidebarGroupLabel>
          <NavMenu items={dataMenuItems} />
        </div>
      </SidebarContent>
      <SidebarFooter className="flex-col gap-2 p-2">
         <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                asChild
                isActive={pathname === '/settings'}
                tooltip={{ children: 'Settings' }}
                >
                <Link href="/settings">
                    <Settings />
                    <span>Settings</span>
                </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <SidebarMenuButton
                asChild
                variant="outline"
                tooltip={{ children: 'Help & Support' }}
                >
                <Link href="#">
                    <CircleHelp />
                    <span>Help & Support</span>
                </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
         </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
