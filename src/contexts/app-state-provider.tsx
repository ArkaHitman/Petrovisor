
'use client';

import React, { createContext, useContext, useCallback, useMemo } from 'react';
import useLocalStorage from '@/hooks/use-local-storage';
import type { AppState, AppStateContextType, Settings, ManagerTransaction, BankTransaction, CreditHistoryEntry, MiscCollection, MonthlyReport, FuelPurchase, AnalyzeDsrOutput, ShiftReport, BankAccount, Employee, Customer, SupplierDelivery, SupplierPayment, AddSupplierDeliveryData, ChartOfAccount, JournalEntry, ShiftReportCreditSale } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { getFuelPricesForDate } from '@/lib/utils';

const AppStateContext = createContext<AppStateContextType | null>(null);

const defaultState: AppState = {
  settings: null,
  isSetupComplete: false,
};

const initialChartOfAccounts: Omit<ChartOfAccount, 'id'>[] = [
    { name: 'Cash Sales', type: 'Revenue' },
    { name: 'Customer Advance', type: 'Asset' },
    { name: 'IOCL Vendor Account', type: 'Liability' },
    { name: 'Salary & Wages', type: 'Expense' },
    { name: 'Electricity Charges', type: 'Expense' },
    { name: 'Generator Fuel', type: 'Expense' },
    { name: 'Maintenance & Repairs', type: 'Expense' },
    { name: 'License Renewal / Admin', type: 'Expense' },
    { name: 'Security / Labour Contractor', type: 'Expense' },
    { name: 'GST Paid', type: 'Expense' },
    { name: 'Insurance', type: 'Expense' },
    { name: 'Interest', type: 'Expense' },
    { name: 'Commission Paid', type: 'Expense' },
];


const GST_RATE = 0.28;

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [appState, setAppState] = useLocalStorage<AppState>('petrovisor-data', defaultState);

  const setSettings = useCallback((newSettings: Settings) => {
    setAppState((prevState) => ({ ...prevState, settings: newSettings }));
  }, [setAppState]);
  
  const finishSetup = useCallback((settings: Settings) => {
    const fullSettings: Settings = {
      ...settings,
      theme: 'light',
      screenScale: 100,
      employees: settings.employees || [],
      customers: settings.customers || [],
      fuelPriceHistory: settings.fuelPriceHistory || [],
      nozzlesPerFuel: settings.nozzlesPerFuel || {},
      managerLedger: settings.managerLedger || [],
      bankLedger: settings.bankLedger || [],
      creditHistory: settings.creditHistory || [],
      miscCollections: settings.miscCollections || [],
      monthlyReports: settings.monthlyReports || [],
      shiftReports: settings.shiftReports || [],
      purchases: settings.purchases || [],
      supplierDeliveries: settings.supplierDeliveries || [],
      supplierPayments: settings.supplierPayments || [],
      chartOfAccounts: initialChartOfAccounts.map(acc => ({...acc, id: crypto.randomUUID()})),
      journalEntries: [],
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
  
  const getOverdraftAccount = useCallback((settings: Settings | null): BankAccount | undefined => {
      if (!settings) return undefined;
      return settings.bankAccounts.find(acc => acc.isOverdraft) || settings.bankAccounts[0];
  }, []);

  // Employee Management
  const addEmployee = useCallback((employee: Omit<Employee, 'id' | 'createdAt'>) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newEmployee: Employee = { ...employee, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      const newSettings = { ...prev.settings, employees: [...prev.settings.employees, newEmployee] };
      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);

  const updateEmployee = useCallback((employee: Employee) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newSettings = { ...prev.settings, employees: prev.settings.employees.map(e => e.id === employee.id ? employee : e) };
      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);

  const deleteEmployee = useCallback((employeeId: string) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newSettings = { ...prev.settings, employees: prev.settings.employees.filter(e => e.id !== employeeId) };
      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);

  // Customer Management
  const addCustomer = useCallback((customer: Omit<Customer, 'id' | 'createdAt'>) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newCustomer: Customer = { ...customer, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      const newSettings = { ...prev.settings, customers: [...prev.settings.customers, newCustomer] };
      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);

  const updateCustomer = useCallback((customer: Customer) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newSettings = { ...prev.settings, customers: prev.settings.customers.map(c => c.id === customer.id ? customer : c) };
      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);

  const deleteCustomer = useCallback((customerId: string) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newSettings = { ...prev.settings, customers: prev.settings.customers.filter(c => c.id !== customerId) };
      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);


  const addManagerTransaction = useCallback((transaction: Omit<ManagerTransaction, 'id' | 'createdAt'>) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newTransaction: ManagerTransaction = { 
        ...transaction, 
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      
      const bankTxType = transaction.type === 'payment_from_manager' ? 'credit' : 'debit';
      const bankTxDescription = transaction.type === 'payment_from_manager'
          ? `Payment from Manager: ${transaction.description}`
          : `Payment to Manager: ${transaction.description}`;

      const newBankTransaction: BankTransaction = {
          id: crypto.randomUUID(),
          accountId: transaction.accountId,
          date: transaction.date,
          description: bankTxDescription,
          type: bankTxType,
          amount: transaction.amount,
          source: 'manager_payment',
          sourceId: newTransaction.id,
          createdAt: newTransaction.createdAt,
      };

      const newSettings = {
        ...prev.settings,
        managerLedger: [...(prev.settings.managerLedger || []), newTransaction].sort((a,b) => b.date.localeCompare(a.date)),
        bankLedger: [...(prev.settings.bankLedger || []), newBankTransaction].sort((a,b) => b.date.localeCompare(a.date)),
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
        bankLedger: (prev.settings.bankLedger || []).filter(bt => bt.sourceId !== transactionId || bt.source !== 'manager_payment'),
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

  const addCreditGiven = useCallback((amount: number, date: string, customerId: string) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newEntry: CreditHistoryEntry = {
        id: crypto.randomUUID(),
        date: date,
        customerId,
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

  const addCreditRepayment = useCallback((amount: number, destination: 'cash' | string, date: string, customerId: string) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      
      const now = new Date().toISOString();

      const newSettings = {...prev.settings};
      
      const newCreditEntry: CreditHistoryEntry = {
        id: crypto.randomUUID(),
        date,
        customerId,
        type: 'repaid',
        amount,
        repaymentDestination: destination,
        createdAt: now,
        source: 'manual',
      };
      newSettings.creditHistory = [...(newSettings.creditHistory || []), newCreditEntry].sort((a,b) => b.date.localeCompare(a.date));

      if (destination !== 'cash') {
        const newBankTx: BankTransaction = {
          id: crypto.randomUUID(),
          accountId: destination,
          createdAt: now,
          date,
          description: `Credit Repayment from ${newSettings.customers.find(c => c.id === customerId)?.name || 'Customer'}`,
          type: 'credit',
          amount,
          source: 'credit_repayment',
          sourceId: newCreditEntry.id,
        };
        newSettings.bankLedger = [...(newSettings.bankLedger || []), newBankTx].sort((a, b) => b.date.localeCompare(a.date));
      } else {
         const newMiscCollection: MiscCollection = {
           id: crypto.randomUUID(),
           createdAt: now,
           date,
           description: `Credit Repayment (Cash) from ${newSettings.customers.find(c => c.id === customerId)?.name || 'Customer'}`,
           amount,
           type: 'inflow',
           source: 'credit_repayment',
           sourceId: newCreditEntry.id,
         }
         newSettings.miscCollections = [...(newSettings.miscCollections || []), newMiscCollection].sort((a, b) => b.date.localeCompare(a.date));
      }
      
      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);

  const deleteCreditEntry = useCallback((entryId: string) => {
    setAppState(prev => {
      if (!prev.settings?.creditHistory) return prev;

      const entryToDelete = prev.settings.creditHistory.find(e => e.id === entryId);
      if (!entryToDelete) return prev;

      const newSettings = { ...prev.settings };

      newSettings.creditHistory = newSettings.creditHistory.filter(e => e.id !== entryId);

      if (entryToDelete.type === 'repaid') {
        if (entryToDelete.repaymentDestination === 'cash') {
          newSettings.miscCollections = (newSettings.miscCollections || []).filter(c => c.sourceId !== entryId);
        } else {
          newSettings.bankLedger = (newSettings.bankLedger || []).filter(tx => tx.sourceId !== entryId);
        }
      }
      
      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);
  
  const addMiscCollection = useCallback((collection: Omit<MiscCollection, 'id' | 'createdAt' | 'sourceId' | 'type'>) => {
    setAppState(prev => {
        if (!prev.settings) return prev;
        const newCollection: MiscCollection = { 
          ...collection,
          source: 'manual',
          type: 'inflow',
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
        finalReport = { ...newReports[existingReportIndex], ...report, updatedAt: new Date().toISOString() };
        newReports[existingReportIndex] = finalReport;
      } else {
        finalReport = { ...report, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        newReports.push(finalReport);
      }
      newReports.sort((a, b) => b.endDate.localeCompare(a.endDate));

      let newBankLedger = (prev.settings.bankLedger || []).filter(tx => tx.sourceId !== report.id);
      
      if (report.bankDeposits > 0) {
        const depositTx: BankTransaction = {
          id: crypto.randomUUID(),
          accountId: report.accountId,
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

      const newSettings = { ...prev.settings, monthlyReports: newReports, bankLedger: newBankLedger };
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
  
  const addOrUpdateShiftReport = useCallback((reportData: Omit<ShiftReport, 'createdAt' | 'updatedAt'>) => {
    setAppState(prev => {
        if (!prev.settings) return prev;

        const now = new Date().toISOString();
        const newSettings = JSON.parse(JSON.stringify(prev.settings));

        const isEditing = !!reportData.id && newSettings.shiftReports.some((r: ShiftReport) => r.id === reportData.id);

        if (isEditing) {
            const oldReport = newSettings.shiftReports.find((r: ShiftReport) => r.id === reportData.id);
            if (oldReport) {
                const litresSoldByFuel: { [fuelId: string]: number } = {};
                oldReport.meterReadings.forEach((reading: any) => {
                    litresSoldByFuel[reading.fuelId] = (litresSoldByFuel[reading.fuelId] || 0) + reading.saleLitres;
                });
                newSettings.tanks = newSettings.tanks.map((tank: any) => {
                    const returnedAmount = litresSoldByFuel[tank.fuelId];
                    if (returnedAmount) {
                        return { ...tank, initialStock: tank.initialStock + returnedAmount };
                    }
                    return tank;
                });
                newSettings.creditHistory = (newSettings.creditHistory || []).filter((e: any) => e.sourceId !== oldReport.id || e.source !== 'shift_report');
                newSettings.bankLedger = (newSettings.bankLedger || []).filter((tx: any) => tx.sourceId !== oldReport.id || tx.source !== 'shift_report');
                newSettings.miscCollections = (newSettings.miscCollections || []).filter((c: any) => c.sourceId !== oldReport.id);
            }
        }

        const finalReport: ShiftReport = {
            ...reportData,
            id: isEditing ? reportData.id! : crypto.randomUUID(),
            createdAt: isEditing ? (newSettings.shiftReports.find((r: ShiftReport) => r.id === reportData.id)!.createdAt || now) : now,
            updatedAt: now,
        };

        const sourceId = finalReport.id;
        if (finalReport.creditSales && finalReport.creditSales.length > 0) {
            finalReport.creditSales.forEach(cs => {
                if (cs.amount > 0 && cs.customerId) {
                    newSettings.creditHistory.push({
                        id: crypto.randomUUID(),
                        customerId: cs.customerId,
                        date: finalReport.date,
                        type: 'given',
                        amount: cs.amount,
                        createdAt: now,
                        source: 'shift_report',
                        sourceId,
                    });
                }
            });
        }
        if (finalReport.onlinePayments > 0 && finalReport.onlinePaymentsAccountId) {
            newSettings.bankLedger.push({ id: crypto.randomUUID(), accountId: finalReport.onlinePaymentsAccountId, date: finalReport.date, description: `Online Payments from Shift`, type: 'credit', amount: finalReport.onlinePayments, source: 'shift_report', sourceId, createdAt: now });
        }
        if (finalReport.cashInHand > 0) {
            newSettings.miscCollections.push({ id: crypto.randomUUID(), date: finalReport.date, description: `Cash from Shift`, amount: finalReport.cashInHand, createdAt: now, type: 'inflow', source: 'shift_report', sourceId });
        }

        const litresSoldByFuelNew: { [fuelId: string]: number } = {};
        finalReport.meterReadings.forEach((reading: any) => {
            litresSoldByFuelNew[reading.fuelId] = (litresSoldByFuelNew[reading.fuelId] || 0) + reading.saleLitres;
        });
        newSettings.tanks = newSettings.tanks.map((tank: any) => {
            const soldAmount = litresSoldByFuelNew[tank.fuelId];
            if (soldAmount) {
                return { ...tank, initialStock: tank.initialStock - soldAmount };
            }
            return tank;
        });
        
        if (isEditing) {
            const index = newSettings.shiftReports.findIndex((r: ShiftReport) => r.id === finalReport.id);
            if (index > -1) newSettings.shiftReports[index] = finalReport;
        } else {
            newSettings.shiftReports.push(finalReport);
        }
        
        newSettings.shiftReports.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        newSettings.creditHistory.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        newSettings.bankLedger.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        newSettings.miscCollections.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return { ...prev, settings: newSettings };
    });
  }, [setAppState]);

  const deleteShiftReport = useCallback((reportId: string) => {
    setAppState(prev => {
        if (!prev.settings) return prev;
        const reportToDelete = prev.settings.shiftReports.find(r => r.id === reportId);
        if (!reportToDelete) return prev;

        const newSettings = JSON.parse(JSON.stringify(prev.settings));

        const litresSoldByFuel: { [fuelId: string]: number } = {};
        reportToDelete.meterReadings.forEach(reading => {
            litresSoldByFuel[reading.fuelId] = (litresSoldByFuel[reading.fuelId] || 0) + reading.saleLitres;
        });
        newSettings.tanks = newSettings.tanks.map((tank: any) => {
            const returnedAmount = litresSoldByFuel[tank.fuelId];
            if (returnedAmount) {
                return { ...tank, initialStock: tank.initialStock + returnedAmount };
            }
            return tank;
        });

        newSettings.creditHistory = (newSettings.creditHistory || []).filter((e: any) => e.sourceId !== reportId || e.source !== 'shift_report');
        newSettings.bankLedger = (newSettings.bankLedger || []).filter((tx: any) => tx.sourceId !== reportId || tx.source !== 'shift_report');
        newSettings.miscCollections = (newSettings.miscCollections || []).filter((c: any) => c.sourceId !== reportId);
        newSettings.shiftReports = (newSettings.shiftReports || []).filter((r: any) => r.id !== reportId);

        return { ...prev, settings: newSettings };
    });
  }, [setAppState]);


  const addFuelPurchase = useCallback((purchase: Omit<FuelPurchase, 'id' | 'createdAt'>) => {
    setAppState(prev => {
      if (!prev.settings) return prev;

      const newPurchase: FuelPurchase = { ...purchase, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      
      const newPurchases = [...(prev.settings.purchases || []), newPurchase].sort((a,b) => b.date.localeCompare(a.date));

      const newTanks = prev.settings.tanks.map(tank => {
        if (tank.id === purchase.tankId) {
          return { ...tank, initialStock: tank.initialStock + purchase.quantity };
        }
        return tank;
      });

      const newSettings = { ...prev.settings, purchases: newPurchases, tanks: newTanks };

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
        
        const newSettings = { ...prev.settings, purchases: newPurchases, tanks: newTanks };
        return { ...prev, settings: newSettings };
    });
  }, [setAppState]);

  // Supplier Ledger
  const addSupplierDelivery = useCallback((deliveryData: AddSupplierDeliveryData) => {
    setAppState(prev => {
      if (!prev.settings) return prev;

      const basicAmount = deliveryData.quantityKL * deliveryData.ratePerKL;
      const gstAmount = basicAmount * GST_RATE;
      const totalInvoiceValue = basicAmount + gstAmount;

      const newDelivery: SupplierDelivery = {
        id: crypto.randomUUID(),
        ...deliveryData,
        basicAmount,
        gstAmount,
        totalInvoiceValue,
        createdAt: new Date().toISOString(),
      };
      
      const newSettings = {
        ...prev.settings,
        supplierDeliveries: [...(prev.settings.supplierDeliveries || []), newDelivery].sort((a,b) => b.date.localeCompare(a.date)),
      };
      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);

  const deleteSupplierDelivery = useCallback((deliveryId: string) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newSettings = {
        ...prev.settings,
        supplierDeliveries: (prev.settings.supplierDeliveries || []).filter(d => d.id !== deliveryId),
      };
      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);
  
  const addSupplierPayment = useCallback((payment: Omit<SupplierPayment, 'id' | 'createdAt'>) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      
      const newPayment: SupplierPayment = {
        id: crypto.randomUUID(),
        ...payment,
        createdAt: new Date().toISOString(),
      };

      const newBankDebit: BankTransaction = {
        id: crypto.randomUUID(),
        accountId: payment.accountId,
        date: payment.date,
        description: `Payment to supplier`,
        type: 'debit',
        amount: payment.amount,
        source: 'supplier_payment',
        sourceId: newPayment.id,
        createdAt: newPayment.createdAt,
      };

      const newSettings = {
        ...prev.settings,
        supplierPayments: [...(prev.settings.supplierPayments || []), newPayment].sort((a,b) => b.date.localeCompare(a.date)),
        bankLedger: [...(prev.settings.bankLedger || []), newBankDebit].sort((a,b) => b.date.localeCompare(a.date)),
      };

      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);

  const deleteSupplierPayment = useCallback((paymentId: string) => {
    setAppState(prev => {
      if (!prev.settings) return prev;
      const newSettings = {
        ...prev.settings,
        supplierPayments: (prev.settings.supplierPayments || []).filter(p => p.id !== paymentId),
        bankLedger: (prev.settings.bankLedger || []).filter(tx => tx.sourceId !== paymentId || tx.source !== 'supplier_payment'),
      };
      return { ...prev, settings: newSettings };
    });
  }, [setAppState]);

  const processDsrData = useCallback((data: AnalyzeDsrOutput) => {
    setAppState(prev => {
        if (!prev.settings) return prev;

        const now = new Date().toISOString();
        const newSettings = JSON.parse(JSON.stringify(prev.settings));

        if (data.creditSales > 0) {
            const defaultCustomer = newSettings.customers.find((c: Customer) => c.name.toLowerCase() === 'default credit') || newSettings.customers[0];
            if(defaultCustomer) {
                 newSettings.creditHistory.push({
                    id: crypto.randomUUID(), date: data.reportDate, type: 'given', amount: data.creditSales, createdAt: now, customerId: defaultCustomer.id
                });
            }
        }

        const overdraftAccount = getOverdraftAccount(newSettings);
        if (!overdraftAccount) throw new Error("No overdraft or default bank account found in settings.");

        const allDeposits = [...data.bankDeposits];
        if (data.phonepeSales > 0) {
            allDeposits.push({ description: 'PhonePe Collection', amount: data.phonepeSales });
        }

        allDeposits.forEach(deposit => {
            if (deposit.amount > 0) {
                const destinationAccount = newSettings.bankAccounts.find((acc: BankAccount) => deposit.destinationAccount && acc.name.toLowerCase().includes(deposit.destinationAccount.toLowerCase())) || overdraftAccount;
                newSettings.bankLedger.push({
                    id: crypto.randomUUID(),
                    accountId: destinationAccount.id,
                    date: data.reportDate,
                    description: `${deposit.description}${deposit.destinationAccount ? ` to ${deposit.destinationAccount}` : ''}`,
                    type: 'credit',
                    amount: deposit.amount,
                    source: 'dsr_import',
                    createdAt: now,
                });
            }
        });
        
        let totalProfit = 0; let totalLitres = 0;
        const fuelSalesForReport = newSettings.fuels.map((fuel: any) => {
            const aiReadingsForFuel = data.fuelSales.filter(fs => fs.fuelName.toLowerCase() === fuel.name.toLowerCase());
            const { costPrice } = getFuelPricesForDate(fuel.id, data.reportDate, newSettings.fuelPriceHistory, { sellingPrice: fuel.price, costPrice: fuel.cost });
            let fuelTotalLitres = 0, fuelTotalSales = 0, fuelTotalProfit = 0;

            const meterReadings = aiReadingsForFuel.map(r => {
                const saleLitres = Math.max(0, r.closingReading - r.openingReading - r.testing);
                const saleAmount = saleLitres * r.pricePerLitre;
                const estProfit = saleLitres * (r.pricePerLitre - costPrice);
                fuelTotalLitres += saleLitres; fuelTotalSales += saleAmount; fuelTotalProfit += estProfit;
                return { nozzleId: r.nozzleId, opening: r.openingReading, closing: r.closingReading, testing: r.testing, saleLitres, saleAmount, estProfit };
            });
            
            totalProfit += fuelTotalProfit; totalLitres += totalLitres;
            const pricePerLitre = aiReadingsForFuel.length > 0 ? aiReadingsForFuel[0].pricePerLitre : 0;
            return { fuelId: fuel.id, readings: meterReadings, totalLitres: fuelTotalLitres, totalSales: fuelTotalSales, estProfit: fuelTotalProfit, pricePerLitre, costPerLitre: costPrice };
        });
        
        const finalFuelSales = fuelSalesForReport.filter(fs => fs.totalLitres > 0);
        const finalFuelTotalSales = finalFuelSales.reduce((sum, fs) => sum + fs.totalSales, 0);
        const totalSales = finalFuelTotalSales + (data.lubricantSales || 0);
        const totalBankDepositsFromDSR = allDeposits.reduce((sum, dep) => sum + dep.amount, 0);

        newSettings.monthlyReports.push({
            id: crypto.randomUUID(), endDate: data.reportDate, fuelSales: finalFuelSales, lubricantSales: data.lubricantSales || 0,
            totalSales, estProfit: totalProfit, litresSold: totalLitres, bankDeposits: totalBankDepositsFromDSR,
            creditSales: data.creditSales, accountId: overdraftAccount.id, netCash: data.cashInHand || (totalSales - totalBankDepositsFromDSR - data.creditSales),
            createdAt: now, updatedAt: now,
        });
        
        newSettings.creditHistory.sort((a: any, b: any) => b.date.localeCompare(a.date));
        newSettings.bankLedger.sort((a: any, b: any) => b.date.localeCompare(a.date));
        newSettings.monthlyReports.sort((a: any, b: any) => b.endDate.localeCompare(a.endDate));

        return { ...prev, settings: newSettings };
    });
  }, [setAppState, getOverdraftAccount]);

    // Chart of Accounts
    const addChartOfAccount = useCallback((account: Omit<ChartOfAccount, 'id'>) => {
        setAppState(prev => {
            if (!prev.settings) return prev;
            const newAccount: ChartOfAccount = { ...account, id: crypto.randomUUID() };
            const newSettings = { ...prev.settings, chartOfAccounts: [...(prev.settings.chartOfAccounts || []), newAccount] };
            return { ...prev, settings: newSettings };
        });
    }, [setAppState]);

    const updateChartOfAccount = useCallback((account: ChartOfAccount) => {
        setAppState(prev => {
            if (!prev.settings) return prev;
            const newSettings = { ...prev.settings, chartOfAccounts: (prev.settings.chartOfAccounts || []).map(a => a.id === account.id ? account : a) };
            return { ...prev, settings: newSettings };
        });
    }, [setAppState]);

    const deleteChartOfAccount = useCallback((accountId: string) => {
        setAppState(prev => {
            if (!prev.settings) return prev;
            // TODO: Also check if this account is used in any journal entries and prevent deletion.
            const newSettings = { ...prev.settings, chartOfAccounts: (prev.settings.chartOfAccounts || []).filter(a => a.id !== accountId) };
            return { ...prev, settings: newSettings };
        });
    }, [setAppState]);
    
    // Journal Entries
    const addJournalEntry = useCallback((entry: Omit<JournalEntry, 'id' | 'createdAt'>) => {
        setAppState(prev => {
            if (!prev.settings) return prev;

            const now = new Date().toISOString();
            const newEntry: JournalEntry = { ...entry, id: crypto.randomUUID(), createdAt: now };

            const newBankTransactions: BankTransaction[] = [];
            const newCashTransactions: MiscCollection[] = [];

            entry.legs.forEach(leg => {
                if (leg.accountType === 'bank_account') {
                    const bankAccount = prev.settings?.bankAccounts.find(ba => ba.id === leg.accountId);
                    if (bankAccount) {
                        const amount = leg.debit > 0 ? leg.debit : leg.credit;
                        const type = leg.debit > 0 ? 'credit' : 'debit';
                        
                        newBankTransactions.push({
                            id: crypto.randomUUID(),
                            accountId: bankAccount.id,
                            date: entry.date,
                            description: `Journal: ${entry.description}`,
                            amount,
                            type,
                            source: 'journal_entry',
                            sourceId: newEntry.id,
                            createdAt: now,
                        });
                    }
                } else if (leg.accountType === 'cash_account') {
                    const amount = leg.debit > 0 ? leg.debit : leg.credit;
                    const type = leg.debit > 0 ? 'inflow' : 'outflow';

                    newCashTransactions.push({
                        id: crypto.randomUUID(),
                        date: entry.date,
                        description: `Journal: ${entry.description}`,
                        amount,
                        type,
                        source: 'journal_entry',
                        sourceId: newEntry.id,
                        createdAt: now,
                    });
                }
            });

            const newSettings = {
                ...prev.settings,
                journalEntries: [...(prev.settings.journalEntries || []), newEntry].sort((a,b) => b.date.localeCompare(a.date)),
                bankLedger: [...(prev.settings.bankLedger || []), ...newBankTransactions].sort((a,b) => b.date.localeCompare(a.date)),
                miscCollections: [...(prev.settings.miscCollections || []), ...newCashTransactions].sort((a,b) => b.date.localeCompare(a.date)),
            };
            return { ...prev, settings: newSettings };
        });
    }, [setAppState]);

    const deleteJournalEntry = useCallback((entryId: string) => {
        setAppState(prev => {
            if (!prev.settings) return prev;
            const newSettings = {
                ...prev.settings,
                journalEntries: (prev.settings.journalEntries || []).filter(je => je.id !== entryId),
                bankLedger: (prev.settings.bankLedger || []).filter(bt => bt.source !== 'journal_entry' || bt.sourceId !== entryId),
                miscCollections: (prev.settings.miscCollections || []).filter(mc => mc.source !== 'journal_entry' || mc.sourceId !== entryId),
            };
            return { ...prev, settings: newSettings };
        });
    }, [setAppState]);


  const value = useMemo(() => ({
    ...appState,
    setSettings,
    finishSetup,
    resetApp,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addManagerTransaction,
    deleteManagerTransaction,
    addCreditGiven,
    addCreditRepayment,
    deleteCreditEntry,
    addBankTransaction,
    deleteBankTransaction,
    clearManualBankTransactions,
    addMiscCollection,
    deleteMiscCollection,
    addOrUpdateMonthlyReport,
    deleteMonthlyReport,
    addOrUpdateShiftReport,
    deleteShiftReport,
    addFuelPurchase,
    deleteFuelPurchase,
    addSupplierDelivery,
    deleteSupplierDelivery,
    addSupplierPayment,
    deleteSupplierPayment,
    processDsrData,
    addChartOfAccount,
    updateChartOfAccount,
    deleteChartOfAccount,
    addJournalEntry,
    deleteJournalEntry,
  }), [
    appState,
    setSettings,
    finishSetup,
    resetApp,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addManagerTransaction,
    deleteManagerTransaction,
    addCreditGiven,
    addCreditRepayment,
    deleteCreditEntry,
    addBankTransaction,
    deleteBankTransaction,
    clearManualBankTransactions,
    addMiscCollection,
    deleteMiscCollection,
    addOrUpdateMonthlyReport,
    deleteMonthlyReport,
    addOrUpdateShiftReport,
    deleteShiftReport,
    addFuelPurchase,
    deleteFuelPurchase,
    addSupplierDelivery,
    deleteSupplierDelivery,
    addSupplierPayment,
    deleteSupplierPayment,
    processDsrData,
    addChartOfAccount,
    updateChartOfAccount,
    deleteChartOfAccount,
    addJournalEntry,
    deleteJournalEntry,
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
