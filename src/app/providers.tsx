'use client';

import { AppStateProvider } from '@/contexts/app-state-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return <AppStateProvider>{children}</AppStateProvider>;
}
