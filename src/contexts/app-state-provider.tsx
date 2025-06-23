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
    setAppState((prevState) => ({ ...prevState, settings: newSettings }));
  };
  
  const finishSetup = (settings: Settings) => {
    setAppState({
      ...appState,
      settings,
      isSetupComplete: true,
    });
  };

  const resetApp = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('petrovisor-data');
      // Instead of reloading, just reset the state which will trigger UI update
      setAppState(defaultState);
      // Let the component redirect or handle the UI change.
      // A hard reload can be jarring.
      window.location.href = '/';
    }
  };

  const value = {
    ...appState,
    setSettings,
    finishSetup,
    resetApp,
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
