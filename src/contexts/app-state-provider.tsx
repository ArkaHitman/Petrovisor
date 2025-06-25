
'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import type { AppState, AppStateContextType, Settings, ManagerTransaction, BankTransaction, CreditHistoryEntry, MiscCollection, MonthlyReport, FuelPurchase } from '@/lib/types';
import { format, parseISO } from 'date-fns';

const AppStateContext = createContext<AppStateContextType | null>(null);

const defaultState: AppState = {
  settings: null,
  isSetupComplete: false,
};

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [appState, setAppState] = useLocalStorage<AppState>('petrovisor-data', defaultState);

  const setSettings = useCallback((newSettings: Settings) => {
    setAppState((prevState) => ({ ...prevState, settings: newSettings }));
  }, [setAppState]);
  
  const finishSetup = useCallback((settings: Settings) => {
    const fullSettings = {
      ...settings,
      managerLedger: [],
      bankLedger: [],
      creditHistory: [],
      miscCollections: [],
      monthlyReports: [],
      purchases: [],
    };
    setAppState(prevState => ({
      ...prevState,
      settings: fullSettings,
      isSetupComplete: true,
    }));
  }, [setAppState]);

  const resetApp = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('petrovisor-data');
      setAppState(defaultState);
    }
  }, [setAppState]);

  const addManagerTransaction = useCallback((transaction: Omit<ManagerTransaction, 'id' | 'createdAt'>) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newTransaction: ManagerTransaction = { 
        ...transaction, 
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      const newSettings = {
        ...prev.settings,
        managerLedger: [...(prev.settings.managerLedger || []), newTransaction].sort((a,b) => b.date.localeCompare(a.date)),
      };
      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);

  const deleteManagerTransaction = useCallback((transactionId: string) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newSettings = {
        ...prev.settings,
        managerLedger: (prev.settings.managerLedger || []).filter(t => t.id !== transactionId),
      };
      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);
  
  const addBankTransaction = useCallback((transaction: Omit<BankTransaction, 'id' | 'createdAt'>) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newTransaction: BankTransaction = { 
        ...transaction,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      const newSettings = {
        ...prev.settings,
        bankLedger: [...(prev.settings.bankLedger || []), newTransaction].sort((a,b) => b.date.localeCompare(a.date)),
      };
      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);
  
  const deleteBankTransaction = useCallback((transactionId: string) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newSettings = {
        ...prev.settings,
        bankLedger: (prev.settings.bankLedger || []).filter(t => t.id !== transactionId),
      };
      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);

  const addCreditGiven = useCallback((amount: number) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newEntry: CreditHistoryEntry = {
        id: crypto.randomUUID(),
        date: format(new Date(), 'yyyy-MM-dd'),
        type: 'given',
        amount,
        createdAt: new Date().toISOString(),
      };
      const newSettings: Settings = {
        ...prev.settings,
        creditHistory: [...(prev.settings.creditHistory || []), newEntry].sort((a,b) => b.date.localeCompare(a.date)),
      };
      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);

  const addCreditRepayment = useCallback((amount: number, destination: 'cash' | 'bank') => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      
      const date = format(new Date(), 'yyyy-MM-dd');
      const now = new Date().toISOString();

      const newCreditEntry: CreditHistoryEntry = {
        id: crypto.randomUUID(),
        date,
        type: 'repaid',
        amount,
        repaymentDestination: destination,
        createdAt: now,
      };
      
      const newSettings = {...prev.settings};
      newSettings.creditHistory = [...(newSettings.creditHistory || []), newCreditEntry].sort((a,b) => b.date.localeCompare(a.date));

      if (destination === 'bank') {
        const newBankTx: BankTransaction = {
          id: crypto.randomUUID(),
          createdAt: now,
          date,
          description: 'Credit Repayment',
          type: 'credit',
          amount,
          source: 'credit_repayment',
        };
        newSettings.bankLedger = [...(newSettings.bankLedger || []), newBankTx].sort((a, b) => b.date.localeCompare(a.date));
      } else { // destination === 'cash'
         const newMiscCollection: MiscCollection = {
           id: crypto.randomUUID(),
           createdAt: now,
           date,
           description: 'Credit Repayment Received in Cash',
           amount,
         }
         newSettings.miscCollections = [...(newSettings.miscCollections || []), newMiscCollection].sort((a, b) => b.date.localeCompare(a.date));
      }
      
      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);
  
  const addMiscCollection = useCallback((collection: Omit<MiscCollection, 'id' | 'createdAt'>) => {
    setAppState(prev => {
        if (!prev.settings) return prev;
        const newCollection: MiscCollection = { 
          ...collection,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        const newSettings = {
            ...prev.settings,
            miscCollections: [...(prev.settings.miscCollections || []), newCollection].sort((a, b) => b.date.localeCompare(a.date)),
        };
        return { ...prev, settings: newSettings };
    });
  }, [setAppState]);
  
  const deleteMiscCollection = useCallback((collectionId: string) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newSettings = {
        ...prev.settings,
        miscCollections: (prev.settings.miscCollections || []).filter(c => c.id !== collectionId),
      };
      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);

  const addOrUpdateMonthlyReport = useCallback((report: Omit<MonthlyReport, 'createdAt' | 'updatedAt'>) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      
      const newReports = [...(prev.settings.monthlyReports || [])];
      const existingReportIndex = newReports.findIndex(r => r.id === report.id);

      let finalReport: MonthlyReport;

      if (existingReportIndex > -1) {
        finalReport = {
            ...newReports[existingReportIndex],
            ...report,
            updatedAt: new Date().toISOString(),
        };
        newReports[existingReportIndex] = finalReport;
      } else {
        finalReport = {
            ...report,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        newReports.push(finalReport);
      }
      newReports.sort((a, b) => b.endDate.localeCompare(a.endDate));

      // Atomically update the bank ledger for the report's deposit
      let newBankLedger = (prev.settings.bankLedger || []).filter(tx => tx.sourceId !== report.id);
      
      if (report.bankDeposits > 0) {
        const depositTx: BankTransaction = {
          id: crypto.randomUUID(),
          date: report.endDate,
          description: `Monthly deposit for month ending ${format(parseISO(report.endDate), 'dd MMM yyyy')}`,
          type: 'credit',
          amount: report.bankDeposits,
          source: 'monthly_report_deposit',
          sourceId: report.id,
          createdAt: new Date().toISOString(),
        };
        newBankLedger.push(depositTx);
        newBankLedger.sort((a, b) => b.date.localeCompare(a.date));
      }

      const newSettings = {
        ...prev.settings,
        monthlyReports: newReports,
        bankLedger: newBankLedger,
      };
      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);

  const deleteMonthlyReport = useCallback((reportId: string) => {
    setAppState(prev => {
      if (!prev.settings) return prev;

      const newSettings = {
        ...prev.settings,
        monthlyReports: (prev.settings.monthlyReports || []).filter(r => r.id !== reportId),
        bankLedger: (prev.settings.bankLedger || []).filter(tx => tx.sourceId !== reportId),
      };
      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);

  const addFuelPurchase = useCallback((purchase: Omit<FuelPurchase, 'id' | 'createdAt'>) => {
    setAppState(prev => {
      if (!prev.settings) return prev;

      const newPurchase: FuelPurchase = { 
        ...purchase,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      
      const newPurchases = [...(prev.settings.purchases || []), newPurchase].sort((a,b) => b.date.localeCompare(a.date));

      const newTanks = prev.settings.tanks.map(tank => {
        if (tank.id === purchase.tankId) {
          // Use initialStock as the live stock for now
          return { ...tank, initialStock: tank.initialStock + purchase.quantity };
        }
        return tank;
      });
      
      const fuel = prev.settings.fuels.find(f => f.id === purchase.fuelId);
      const newBankTx: BankTransaction = {
        id: crypto.randomUUID(),
        date: purchase.date,
        description: `Fuel Purchase: ${purchase.quantity}L of ${fuel?.name || 'Unknown'}`,
        type: 'debit',
        amount: purchase.amount,
        source: 'fuel_purchase',
        sourceId: newPurchase.id,
        createdAt: new Date().toISOString(),
      };

      const newBankLedger = [...(prev.settings.bankLedger || []), newBankTx].sort((a,b) => b.date.localeCompare(a.date));

      const newSettings = {
        ...prev.settings,
        purchases: newPurchases,
        tanks: newTanks,
        bankLedger: newBankLedger,
      };

      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);

  const deleteFuelPurchase = useCallback((purchaseId: string) => {
    setAppState(prev => {
        if (!prev.settings || !prev.settings.purchases) return prev;
        
        const purchaseToDelete = prev.settings.purchases.find(p => p.id === purchaseId);
        if (!purchaseToDelete) return prev;

        const newPurchases = (prev.settings.purchases || []).filter(p => p.id !== purchaseId);

        const newTanks = prev.settings.tanks.map(tank => {
            if (tank.id === purchaseToDelete.tankId) {
                return { ...tank, initialStock: tank.initialStock - purchaseToDelete.quantity };
            }
            return tank;
        });

        const newBankLedger = (prev.settings.bankLedger || []).filter(tx => tx.sourceId !== purchaseId);
        
        const newSettings = {
            ...prev.settings,
            purchases: newPurchases,
            tanks: newTanks,
            bankLedger: newBankLedger,
        };

        return { ...prev, settings: newSettings };
    });
  }, [setAppState]);


  const value = useMemo(() => ({
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
    addOrUpdateMonthlyReport,
    deleteMonthlyReport,
    addFuelPurchase,
    deleteFuelPurchase,
  }), [
    appState,
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
    addOrUpdateMonthlyReport,
    deleteMonthlyReport,
    addFuelPurchase,
    deleteFuelPurchase,
  ]);

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
