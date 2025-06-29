'use client';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from './app-sidebar';
import Header from './header';
import { useAppState } from '@/contexts/app-state-provider';
import { useEffect } from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { settings } = useAppState();

  useEffect(() => {
    if (typeof window === 'undefined' || !settings) return;

    // Theme
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(settings.theme);

    // UI Scale
    // Adjust the root font-size based on the scale setting.
    // All rem-based units in Tailwind will scale accordingly.
    const baseFontSize = 16;
    document.documentElement.style.fontSize = `${baseFontSize * ((settings.screenScale || 100) / 100)}px`;

  }, [settings?.theme, settings?.screenScale, settings]);


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
