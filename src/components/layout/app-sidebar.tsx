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
} from 'lucide-react';
import { Button } from '../ui/button';

const menuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/reports', label: 'Weekly Reports', icon: FileText },
  { href: '/purchases', label: 'Fuel Purchases', icon: Fuel },
  { href: '/tanks', label: 'Live Tank Status', icon: Database },
  { href: '/bank', label: 'Bank Ledger', icon: Landmark },
];

const AppSidebar = () => {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarHeader className="items-center justify-center p-4">
        <Link href="/" className="flex items-center gap-2">
          <Droplets className="w-8 h-8 text-primary" />
          <span className="font-headline text-lg font-semibold group-data-[collapsible=icon]:hidden">
            PetroVisor
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
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
