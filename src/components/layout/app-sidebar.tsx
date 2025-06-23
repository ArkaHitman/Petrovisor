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
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-provider';

const menuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/reports', label: 'Monthly Reports', icon: FileText },
  { href: '/purchases', label: 'Fuel Purchases', icon: Fuel },
  { href: '/tanks', label: 'Live Tank Status', icon: Database },
  { href: '/dip-entry', label: 'DIP Entry', icon: Ruler },
  { href: '/bank', label: 'Bank Ledger', icon: Landmark },
  { href: '/manager-ledger', label: 'Manager Ledger', icon: Briefcase },
  { href: '/misc-collection', label: 'Misc Collection', icon: HandCoins },
  { href: '/credit', label: 'Overall Credit', icon: ReceiptText },
  { href: '/misc-payments', label: 'Misc Payments', icon: Banknote },
  { href: '/download-report', label: 'Download Report', icon: Download },
];

const AppSidebar = () => {
  const pathname = usePathname();
  const { settings } = useAppState();

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarHeader className="items-center justify-center p-4">
        <Link href="/" className="flex items-center gap-2">
          <Droplets className="w-8 h-8 text-primary" />
          <span className="font-headline text-lg font-semibold group-data-[collapsible=icon]:hidden">
            {settings?.pumpName || 'PETRO MANAGE'}
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
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
