
export interface DipChartEntry {
  dip: number; // Dip reading in cm
  volume: number; // Corresponding volume in Litres
}

export interface BankAccount {
  id: string;
  name: string;
  accountNumber?: string;
  initialBalance: number;
  isOverdraft: boolean;
  sanctionedAmount?: number;
}

export interface Fuel {
  id: string;
  name: string;
  price: number;
  cost: number;
}

export interface FuelPriceEntry {
  id: string;
  date: string; // YYYY-MM-DD
  prices: Record<string, { sellingPrice: number; costPrice: number }>; // Map of fuel ID to its prices
  createdAt: string;
}

export interface Tank {
  id:string;
  name: string;
  fuelId: string;
  capacity: number;
  initialStock: number;
  lastStockUpdateTimestamp?: string; // Full ISO string
  dipChartType?: '16kl' | '21kl';
}

export interface Nozzle {
  id:string;
  pumpId: number;
  nozzleId: number;
  fuelId: string;
}

export type NozzlesPerFuel = Record<string, number>; // Map of fuel ID to nozzle count

export interface Employee {
  id: string;
  name: string;
  contactNumber?: string;
  role: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  contactNumber?: string;
  address?: string;
  createdAt: string;
}

export interface ManagerTransaction {
  id: string;
  date: string;
  description: string;
  type: 'payment_to_manager' | 'payment_from_manager';
  amount: number;
  accountId: string; // The ID of the bank account involved.
  createdAt: string;
}

export interface BankTransaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  type: 'credit' | 'debit';
  amount: number;
  source?: 'credit_repayment' | 'manual' | 'monthly_report_deposit' | 'misc_payment' | 'fuel_purchase' | 'statement_import' | 'dsr_import' | 'shift_report' | 'supplier_payment' | 'manager_payment' | 'journal_entry';
  sourceId?: string; // e.g., the ID of the monthly report or purchase
  createdAt: string;
}

export interface CreditHistoryEntry {
  id: string;
  customerId: string;
  date: string;
  type: 'given' | 'repaid';
  amount: number;
  repaymentDestination?: 'cash' | string; // Can be 'cash' or a bank account ID
  createdAt: string;
  source?: 'shift_report' | 'manual';
  sourceId?: string;
}

export interface MiscCollection {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'inflow' | 'outflow';
    createdAt: string;
    source?: 'shift_report' | 'manual' | 'credit_repayment' | 'journal_entry';
    sourceId?: string;
}

export interface FuelPurchase {
  id: string;
  date: string; // YYYY-MM-DD
  tankId: string;
  fuelId: string;
  quantity: number; // in Litres
  amount: number; // total cost
  accountId?: string; // Account used for payment
  invoiceNumber?: string;
  createdAt: string;
}

export interface SupplierDelivery {
  id: string;
  date: string;
  fuelName: 'MS' | 'HSD';
  quantityKL: number;
  ratePerKL: number; // This is the basic rate, exclusive of GST
  basicAmount: number;
  gstAmount: number;
  totalInvoiceValue: number;
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  date: string;
  amount: number;
  accountId: string;
  createdAt: string;
}


export interface MeterReading {
  nozzleId: number;
  opening: number;
  closing: number;
  testing: number;
  saleLitres: number;
  saleAmount: number;
  estProfit: number;
}

export interface FuelSale {
  fuelId: string;
  readings: MeterReading[];
  totalLitres: number;
  totalSales: number;
  estProfit: number;
  pricePerLitre: number;
  costPerLitre: number;
}

export interface MonthlyReport {
  id: string;
  endDate: string; // YYYY-MM-DD
  fuelSales: FuelSale[];
  lubricantSales: number;
  totalSales: number;
  estProfit: number;
  litresSold: number;
  bankDeposits: number;
  creditSales: number;
  accountId: string; // Account where deposits are made
  netCash: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftMeterReading {
  nozzleId: number;
  fuelId: string;
  opening: number;
  closing: number;
  testing: number;
  saleLitres: number;
  saleAmount: number;
}

export interface ShiftReportCreditSale {
  customerId: string;
  amount: number;
}

export interface ShiftReport {
  id: string;
  date: string; // YYYY-MM-DD
  employeeId: string;
  shiftType: 'day' | 'night';
  meterReadings: ShiftMeterReading[];
  totalSales: number;
  creditSales: ShiftReportCreditSale[];
  onlinePayments: number;
  onlinePaymentsAccountId: string;
  lubeSaleName?: string;
  lubeSaleAmount?: number;
  cashInHand: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChartOfAccount {
  id: string;
  name: string;
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
}

export interface JournalEntryLeg {
  accountId: string;
  accountType: 'chart_of_account' | 'bank_account' | 'cash_account';
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  legs: JournalEntryLeg[];
  createdAt: string;
}


// Types for DSR AI Flow
export interface AnalyzeDsrInput {
  dsrDataUri: string;
}

export interface AnalyzeDsrOutput {
    reportDate: string;
    fuelSales: {
        fuelName: string;
        pricePerLitre: number;
        nozzleId: number;
        openingReading: number;
        closingReading: number;
        testing: number;
    }[];
    lubricantSales: number;
    creditSales: number;
    phonepeSales: number;
    bankDeposits: {
        description: string;
        amount: number;
        destinationAccount?: string;
    }[];
    cashInHand: number;
}


export interface Settings {
  pumpName: string;
  theme: 'light' | 'dark';
  screenScale: number;
  bankAccounts: BankAccount[];
  employees: Employee[];
  customers: Customer[];
  managerInitialBalance?: number;
  debtRecovered?: number;
  fuels: Fuel[];
  tanks: Tank[];
  nozzlesPerFuel: NozzlesPerFuel;
  fuelPriceHistory: FuelPriceEntry[];
  monthlyReports: MonthlyReport[];
  shiftReports: ShiftReport[];
  purchases: FuelPurchase[];
  managerLedger: ManagerTransaction[];
  bankLedger: BankTransaction[];
  creditHistory: CreditHistoryEntry[];
  miscCollections: MiscCollection[];
  supplierDeliveries: SupplierDelivery[];
  supplierPayments: SupplierPayment[];
  chartOfAccounts: ChartOfAccount[];
  journalEntries: JournalEntry[];
}

export interface AppState {
  settings: Settings | null;
  isSetupComplete: boolean;
}

export type AddSupplierDeliveryData = Omit<SupplierDelivery, 'id' | 'createdAt' | 'basicAmount' | 'gstAmount' | 'totalInvoiceValue'>;

export interface AppStateContextType extends AppState {
  setSettings: (settings: Settings) => void;
  finishSetup: (settings: Settings) => void;
  resetApp: () => void;

  // Employee Management
  addEmployee: (employee: Omit<Employee, 'id' | 'createdAt'>) => void;
  updateEmployee: (employee: Employee) => void;
  deleteEmployee: (employeeId: string) => void;

  // Customer Management
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (customerId: string) => void;

  // Manager Ledger
  addManagerTransaction: (transaction: Omit<ManagerTransaction, 'id' | 'createdAt'>) => void;
  deleteManagerTransaction: (transactionId: string) => void;
  
  // Credit Register
  addCreditGiven: (amount: number, date: string, customerId: string) => void;
  addCreditRepayment: (amount: number, destination: 'cash' | string, date: string, customerId: string) => void;
  deleteCreditEntry: (entryId: string) => void;

  // Bank Ledger
  addBankTransaction: (transaction: Omit<BankTransaction, 'id' | 'createdAt'>) => void;
  deleteBankTransaction: (transactionId: string) => void;
  clearManualBankTransactions: () => void;

  // Misc Collections
  addMiscCollection: (collection: Omit<MiscCollection, 'id' | 'createdAt' | 'type' | 'sourceId'>) => void;
  deleteMiscCollection: (collectionId: string) => void;
  
  // Monthly Reports
  addOrUpdateMonthlyReport: (report: Omit<MonthlyReport, 'createdAt' | 'updatedAt'>) => void;
  deleteMonthlyReport: (reportId: string) => void;

  // Shift Reports
  addOrUpdateShiftReport: (report: Omit<ShiftReport, 'createdAt' | 'updatedAt'>) => void;
  deleteShiftReport: (reportId: string) => void;

  // Fuel Purchases
  addFuelPurchase: (purchase: Omit<FuelPurchase, 'id' | 'createdAt'>) => void;
  deleteFuelPurchase: (purchaseId: string) => void;

  // Supplier Ledger
  addSupplierDelivery: (delivery: AddSupplierDeliveryData) => void;
  deleteSupplierDelivery: (deliveryId: string) => void;
  addSupplierPayment: (payment: Omit<SupplierPayment, 'id' | 'createdAt'>) => void;
  deleteSupplierPayment: (paymentId: string) => void;
  
  // DSR Processing
  processDsrData: (data: AnalyzeDsrOutput) => void;

  // Chart of Accounts
  addChartOfAccount: (account: Omit<ChartOfAccount, 'id'>) => void;
  updateChartOfAccount: (account: ChartOfAccount) => void;
  deleteChartOfAccount: (accountId: string) => void;

  // Journal Entries
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => void;
  deleteJournalEntry: (entryId: string) => void;
}
