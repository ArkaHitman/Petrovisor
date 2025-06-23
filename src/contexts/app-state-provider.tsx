'use client';

import React, { createContext, useContext } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import type { AppState, AppStateContextType, Settings, ManagerTransaction, BankTransaction, CreditHistoryEntry, MiscCollection } from '@/lib/types';
import { format } from 'date-fns';

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
    const fullSettings = {
      ...settings,
      managerLedger: [],
      bankLedger: [],
      creditHistory: [],
      miscCollections: [],
    };
    setAppState({
      ...appState,
      settings: fullSettings,
      isSetupComplete: true,
    });
  };

  const resetApp = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('petrovisor-data');
      setAppState(defaultState);
      window.location.href = '/';
    }
  };

  const addManagerTransaction = (transaction: Omit<ManagerTransaction, 'id'>) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newTransaction = { ...transaction, id: crypto.randomUUID() };
      const newSettings = {
        ...prev.settings,
        managerLedger: [...prev.settings.managerLedger, newTransaction].sort((a,b) => b.date.localeCompare(a.date)),
      };
      return { ...prev, settings: newSettings };
    });
  };

  const deleteManagerTransaction = (transactionId: string) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newSettings = {
        ...prev.settings,
        managerLedger: prev.settings.managerLedger.filter(t => t.id !== transactionId),
      };
      return { ...prev, settings: newSettings };
    });
  };
  
  const addBankTransaction = (transaction: Omit<BankTransaction, 'id'>) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newTransaction = { ...transaction, id: crypto.randomUUID() };
      const newSettings = {
        ...prev.settings,
        bankLedger: [...prev.settings.bankLedger, newTransaction].sort((a,b) => b.date.localeCompare(a.date)),
      };
      return { ...prev, settings: newSettings };
    });
  };
  
  const deleteBankTransaction = (transactionId: string) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newSettings = {
        ...prev.settings,
        bankLedger: prev.settings.bankLedger.filter(t => t.id !== transactionId),
      };
      return { ...prev, settings: newSettings };
    });
  };

  const addCreditGiven = (amount: number) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newEntry: CreditHistoryEntry = {
        id: crypto.randomUUID(),
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'given',
        amount,
      };
      const newSettings: Settings = {
        ...prev.settings,
        creditHistory: [...prev.settings.creditHistory, newEntry],
      };
      return { ...prev, settings: newSettings };
    });
  };

  const addCreditRepayment = (amount: number, destination: 'cash' | 'bank') => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const date = format(new Date(), 'yyyy-MM-dd');
      const newEntry: CreditHistoryEntry = {
        id: crypto.randomUUID(),
        date,
        type: 'repaid',
        amount,
        repaymentDestination: destination,
      };
      
      let newSettings = { ...prev.settings, creditHistory: [...prev.settings.creditHistory, newEntry] };

      if (destination === 'bank') {
        const newBankTx: BankTransaction = {
          id: crypto.randomUUID(),
          date,
          description: 'Credit Repayment',
          type: 'credit',
          amount,
          source: 'credit_repayment',
        };
        newSettings = {
          ...newSettings,
          bankLedger: [...newSettings.bankLedger, newBankTx].sort((a, b) => b.date.localeCompare(a.date)),
        };
      } else { // destination === 'cash'
         const newMiscCollection: MiscCollection = {
           id: crypto.randomUUID(),
           date,
           description: 'Credit Repayment (to Cash)',
           amount,
         }
         newSettings = {
           ...newSettings,
           miscCollections: [...newSettings.miscCollections, newMiscCollection].sort((a, b) => b.date.localeCompare(a.date)),
         }
      }
      return { ...prev, settings: newSettings };
    });
  };
  
  const addMiscCollection = (collection: Omit<MiscCollection, 'id'>) => {
    setAppState(prev => {
        if (!prev.settings) return prev;
        const newCollection = { ...collection, id: crypto.randomUUID() };
        const newSettings = {
            ...prev.settings,
            miscCollections: [...prev.settings.miscCollections, newCollection].sort((a, b) => b.date.localeCompare(a.date)),
        };
        return { ...prev, settings: newSettings };
    });
  };
  
  const deleteMiscCollection = (collectionId: string) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newSettings = {
        ...prev.settings,
        miscCollections: prev.settings.miscCollections.filter(c => c.id !== collectionId),
      };
      return { ...prev, settings: newSettings };
    });
  };

  const value = {
    ...appState,
    setSettings,
    finishSetup,
    resetApp,
    addManagerTransaction,
    deleteManagerTransaction,
    addCreditGiven,
    addCreditRepayment,
    addBankTransaction,
    deleteBankTransaction,
    addMiscCollection,
    deleteMiscCollection,
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
