'use client';

import React, { createContext, useContext } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import type { AppState, AppStateContextType, Settings } from '@/lib/types';

const AppStateContext = createContext<AppStateContextType | null>(null);

const defaultState: AppState = {
  settings: null,
  isSetupComplete: false,
};

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [appState, setAppState] = useLocalStorage<AppState>('petrovisor-data', defaultState);

  const setSettings = (newSettings: Settings) => {
    setAppState({ ...appState, settings: newSettings });
  };
  
  const finishSetup = (settings: Settings) => {
    setAppState({
      ...appState,
      settings,
      isSetupComplete: true,
    });
  };

  const value = {
    ...appState,
    setSettings,
    finishSetup,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};
