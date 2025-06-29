'use client';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from './app-sidebar';
import Header from './header';
import { useAppState } from '@/contexts/app-state-provider';
import { useEffect } from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { settings } = useAppState();

  useEffect(() => {
    if (settings?.theme) {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(settings.theme);
    }
  }, [settings?.theme]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col bg-background">
          <Header />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
