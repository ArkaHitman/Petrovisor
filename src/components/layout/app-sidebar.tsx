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
  Users,
  User,
  Download,
  Ruler,
  FileScan,
  Spline,
  ClipboardPenLine,
  GitCommitHorizontal,
  UsersRound,
  ClipboardIcon,
  Layers,
  BookMarked,
  ClipboardList,
} from 'lucide-react';
import { useAppState } from '@/contexts/app-state-provider';

const overviewMenuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
];

const operationsMenuItems = [
  { href: '/shift-report', label: 'Shift Report', icon: ClipboardPenLine },
  { href: '/dsr-preview', label: 'DSR Preview', icon: ClipboardList },
  { href: '/purchases', label: 'Fuel Purchases', icon: Fuel },
  { href: '/tanks', label: 'Tank Status', icon: Database },
  { href: '/stock-variation', label: 'Stock Variation', icon: GitCommitHorizontal },
  { href: '/dip-entry', label: 'DIP Entry', icon: Ruler },
];

const financialsMenuItems = [
  { href: '/bank', label: 'Bank Ledger', icon: Landmark },
  { href: '/credit', label: 'Credit Customers', icon: Users },
  { href: '/manager-ledger', label: 'Manager Ledger', icon: Briefcase },
  { href: '/supplier-ledger', label: 'Supplier Ledger', icon: Layers },
  { href: '/journal', label: 'Journal Vouchers', icon: BookMarked },
  { href: '/misc-collection', label: 'Misc Collection', icon: UsersRound },
  { href: '/misc-payments', label: 'Misc Payments', icon: UsersRound },
];

const dataMenuItems = [
  { href: '/challan-analysis', label: 'AI Challan Analysis', icon: ClipboardIcon },
  { href: '/dsr', label: 'AI DSR Analysis', icon: FileScan },
  { href: '/fund-analysis', label: 'AI Fund Analysis', icon: Spline },
  { href: '/reports', label: 'Monthly Reports', icon: FileText },
  { href: '/download-report', label: 'Download Report', icon: Download },
];

const managementMenuItems = [
    { href: '/employees', label: 'Employees', icon: User },
    { href: '/customers', label: 'Customers', icon: Users },
]


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
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <NavMenu items={managementMenuItems} />
        </div>
        <SidebarSeparator />
        <div>
          <SidebarGroupLabel>Data & AI</SidebarGroupLabel>
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
                isActive={pathname === '/help'}
                tooltip={{ children: 'Help & Support' }}
                >
                <Link href="/help">
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
