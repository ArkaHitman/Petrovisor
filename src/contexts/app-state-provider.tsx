
'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import type { AppState, AppStateContextType, Settings, ManagerTransaction, BankTransaction, CreditHistoryEntry, MiscCollection, MonthlyReport, FuelPurchase, AnalyzeDsrOutput, FuelSale, MeterReading, DailyReport } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { getFuelPricesForDate } from '@/lib/utils';

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
      dailyReports: [],
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
  
  const clearManualBankTransactions = useCallback(() => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const deletableSources = ['manual', 'statement_import'];
      const newSettings = {
        ...prev.settings,
        bankLedger: (prev.settings.bankLedger || []).filter(tx => !deletableSources.includes(tx.source || '')),
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
        source: 'manual',
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

      const newSettings = {...prev.settings};
      
      const newCreditEntry: CreditHistoryEntry = {
        id: crypto.randomUUID(),
        date,
        type: 'repaid',
        amount,
        repaymentDestination: destination,
        createdAt: now,
      };
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
  
  const addMiscCollection = useCallback((collection: Omit<MiscCollection, 'id' | 'createdAt' | 'sourceId'>) => {
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
            lubricantSales: report.lubricantSales || 0,
            updatedAt: new Date().toISOString(),
        };
        newReports[existingReportIndex] = finalReport;
      } else {
        finalReport = {
            ...report,
            lubricantSales: report.lubricantSales || 0,
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
  
  const addDailyReport = useCallback((report: Omit<DailyReport, 'id' | 'createdAt' | 'updatedAt'>) => {
    setAppState(prev => {
        if (!prev.settings) return prev;

        const now = new Date().toISOString();
        const newSettings = JSON.parse(JSON.stringify(prev.settings));
        
        const newReport: DailyReport = { 
            ...report, 
            id: crypto.randomUUID(),
            createdAt: now, 
            updatedAt: now 
        };

        // 1. Add report to list
        newSettings.dailyReports = [...(newSettings.dailyReports || []), newReport].sort((a,b) => b.date.localeCompare(a.date));

        // 2. Update financials
        const sourceId = newReport.id;
        if (newReport.creditSales > 0) {
            newSettings.creditHistory.push({
            id: crypto.randomUUID(), date: newReport.date, type: 'given', amount: newReport.creditSales, createdAt: now, source: 'daily_report', sourceId
            });
        }
        if (newReport.onlinePayments > 0) {
            newSettings.bankLedger.push({
            id: crypto.randomUUID(), date: newReport.date, description: 'Online Payments from Daily Sales', type: 'credit', amount: newReport.onlinePayments, source: 'daily_report', sourceId, createdAt: now
            });
        }
        if (newReport.cashInHand > 0) {
            newSettings.miscCollections.push({
            id: crypto.randomUUID(), date: newReport.date, description: 'Cash from Daily Sales', amount: newReport.cashInHand, createdAt: now, sourceId
            });
        }
        
        // 3. Update Tank Stock
        const litresSoldByFuel: { [fuelId: string]: number } = {};
        newReport.meterReadings.forEach(reading => {
            litresSoldByFuel[reading.fuelId] = (litresSoldByFuel[reading.fuelId] || 0) + reading.saleLitres;
        });
        newSettings.tanks = newSettings.tanks.map((tank: any) => {
            const soldAmount = litresSoldByFuel[tank.fuelId];
            if (soldAmount) {
                const newStock = tank.initialStock - soldAmount;
                // Update the stock and remove the sold amount from our map
                // This correctly handles multiple tanks for the same fuel type by only deducting once.
                litresSoldByFuel[tank.fuelId] = 0; 
                return { ...tank, initialStock: newStock };
            }
            return tank;
        });

        // 4. Sort ledgers
        newSettings.creditHistory.sort((a: any, b: any) => b.date.localeCompare(a.date));
        newSettings.bankLedger.sort((a: any, b: any) => b.date.localeCompare(a.date));
        newSettings.miscCollections.sort((a: any, b: any) => b.date.localeCompare(a.date));

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

  const processDsrData = useCallback((data: AnalyzeDsrOutput) => {
    setAppState(prev => {
        if (!prev.settings) return prev;

        const now = new Date().toISOString();
        const newSettings = JSON.parse(JSON.stringify(prev.settings));

        // 1. Add credit sales to history
        if (data.creditSales > 0) {
            const newCreditEntry: CreditHistoryEntry = {
                id: crypto.randomUUID(),
                date: data.reportDate,
                type: 'given',
                amount: data.creditSales,
                createdAt: now,
            };
            newSettings.creditHistory.push(newCreditEntry);
        }

        // 2. Combine all deposits and add to bank ledger
        const allDeposits = [...data.bankDeposits];
        if (data.phonepeSales > 0) {
            allDeposits.push({ description: 'PhonePe Collection', amount: data.phonepeSales });
        }

        allDeposits.forEach(deposit => {
            if (deposit.amount > 0) {
                const newBankTx: BankTransaction = {
                    id: crypto.randomUUID(),
                    date: data.reportDate,
                    description: `${deposit.description}${deposit.destinationAccount ? ` to ${deposit.destinationAccount}` : ''}`,
                    type: 'credit',
                    amount: deposit.amount,
                    source: 'dsr_import',
                    createdAt: now,
                };
                newSettings.bankLedger.push(newBankTx);
            }
        });

        // 3. Construct a monthly report from the DSR data
        let totalProfit = 0;
        let totalLitres = 0;

        const fuelSalesForReport: FuelSale[] = newSettings.fuels.map((fuel: any) => {
            const aiReadingsForFuel = data.fuelSales.filter(fs => fs.fuelName.toLowerCase() === fuel.name.toLowerCase());
            
            const { costPrice } = getFuelPricesForDate(fuel.id, data.reportDate, newSettings.fuelPriceHistory, { sellingPrice: fuel.price, costPrice: fuel.cost });
            
            let fuelTotalLitres = 0;
            let fuelTotalSales = 0;
            let fuelTotalProfit = 0;

            const meterReadings: MeterReading[] = aiReadingsForFuel.map(r => {
                const saleLitres = Math.max(0, r.closingReading - r.openingReading - r.testing);
                const saleAmount = saleLitres * r.pricePerLitre;
                const estProfit = saleLitres * (r.pricePerLitre - costPrice);

                fuelTotalLitres += saleLitres;
                fuelTotalSales += saleAmount;
                fuelTotalProfit += estProfit;

                return {
                    nozzleId: r.nozzleId,
                    opening: r.openingReading,
                    closing: r.closingReading,
                    testing: r.testing,
                    saleLitres,
                    saleAmount,
                    estProfit,
                };
            });
            
            totalProfit += fuelTotalProfit;
            totalLitres += fuelTotalLitres;

            const pricePerLitre = aiReadingsForFuel.length > 0 ? aiReadingsForFuel[0].pricePerLitre : 0;

            return {
                fuelId: fuel.id,
                readings: meterReadings,
                totalLitres: fuelTotalLitres,
                totalSales: fuelTotalSales,
                estProfit: fuelTotalProfit,
                pricePerLitre,
                costPerLitre: costPrice,
            };
        });
        
        const finalFuelSales = fuelSalesForReport.filter(fs => fs.totalLitres > 0);
        const finalFuelTotalSales = finalFuelSales.reduce((sum, fs) => sum + fs.totalSales, 0);
        
        const totalSales = finalFuelTotalSales + (data.lubricantSales || 0);
        const totalBankDepositsFromDSR = allDeposits.reduce((sum, dep) => sum + dep.amount, 0);

        const newReport: MonthlyReport = {
            id: crypto.randomUUID(),
            endDate: data.reportDate,
            fuelSales: finalFuelSales,
            lubricantSales: data.lubricantSales || 0,
            totalSales,
            estProfit: totalProfit,
            litresSold: totalLitres,
            bankDeposits: totalBankDepositsFromDSR,
            creditSales: data.creditSales,
            netCash: data.cashInHand || (totalSales - totalBankDepositsFromDSR - data.creditSales),
            createdAt: now,
            updatedAt: now,
        };
        newSettings.monthlyReports.push(newReport);
        
        // Sort all modified arrays by date
        newSettings.creditHistory.sort((a: any, b: any) => b.date.localeCompare(a.date));
        newSettings.bankLedger.sort((a: any, b: any) => b.date.localeCompare(a.date));
        newSettings.monthlyReports.sort((a: any, b: any) => b.endDate.localeCompare(a.endDate));

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
    clearManualBankTransactions,
    addMiscCollection,
    deleteMiscCollection,
    addOrUpdateMonthlyReport,
    deleteMonthlyReport,
    addDailyReport,
    addFuelPurchase,
    deleteFuelPurchase,
    processDsrData,
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
    clearManualBankTransactions,
    addMiscCollection,
    deleteMiscCollection,
    addOrUpdateMonthlyReport,
    deleteMonthlyReport,
    addDailyReport,
    addFuelPurchase,
    deleteFuelPurchase,
    processDsrData,
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
