'use client';

import AppLayout from '@/components/layout/app-layout';
import { useAppState } from '@/contexts/app-state-provider';
import SetupWizard from '@/components/setup-wizard';
import Dashboard from '@/components/dashboard';
import { useEffect, useState } from 'react';

export default function Home() {
  const { isSetupComplete } = useAppState();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Or a loading spinner
  }

  if (!isSetupComplete) {
    return <SetupWizard />;
  }

  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
}
