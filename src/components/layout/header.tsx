'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '../ui/button';
import { Settings, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { useAppState } from '@/contexts/app-state-provider';

export default function Header() {
  const { settings, setSettings } = useAppState();

  const toggleTheme = () => {
    if (settings) {
      setSettings({
        ...settings,
        theme: settings.theme === 'dark' ? 'light' : 'dark',
      });
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {settings?.theme === 'light' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <Settings className="h-5 w-5" />
            <span className="sr-only">Settings</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}
