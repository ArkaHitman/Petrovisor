export interface DipChartEntry {
  dip: number; // Dip reading in cm
  volume: number; // Corresponding volume in Litres
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
  id: string;
  name: string;
  fuelId: string;
  capacity: number;
  initialStock: number;
  lastStockUpdateTimestamp?: string; // Full ISO string
  dipChartType?: '16kl' | '21kl';
}

export interface Nozzle {
  id: string;
  pumpId: number;
  nozzleId: number;
  fuelId: string;
}

export type NozzlesPerFuel = Record<string, number>; // Map of fuel ID to nozzle count

export interface ManagerTransaction {
  id: string;
  date: string;
  description: string;
  type: 'payment_to_manager' | 'payment_from_manager';
  amount: number;
  createdAt: string;
}

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  type: 'credit' | 'debit';
  amount: number;
  source?: 'credit_repayment' | 'manual' | 'monthly_report_deposit' | 'misc_payment' | 'fuel_purchase' | 'statement_import';
  sourceId?: string; // e.g., the ID of the monthly report or purchase
  createdAt: string;
}

export interface CreditHistoryEntry {
  id: string;
  date: string;
  type: 'given' | 'repaid';
  amount: number;
  repaymentDestination?: 'cash' | 'bank';
  createdAt: string;
}

export interface MiscCollection {
    id: string;
    date: string;
    description: string;
    amount: number;
    createdAt: string;
}

export interface FuelPurchase {
  id: string;
  date: string; // YYYY-MM-DD
  tankId: string;
  fuelId: string;
  quantity: number; // in Litres
  amount: number; // total cost
  invoiceNumber?: string;
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
  totalSales: number;
  estProfit: number;
  litresSold: number;
  bankDeposits: number;
  creditSales: number;
  netCash: number;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  pumpName: string;
  theme: 'light' | 'dark';
  bankName?: string;
  bankAccountNumber?: string;
  sanctionedAmount?: number;
  initialBankBalance?: number;
  managerInitialBalance?: number;
  debtRecovered?: number;
  fuels: Fuel[];
  tanks: Tank[];
  nozzlesPerFuel: NozzlesPerFuel;
  fuelPriceHistory: FuelPriceEntry[];
  monthlyReports: MonthlyReport[];
  purchases: FuelPurchase[];

  // New ledgers and histories
  managerLedger: ManagerTransaction[];
  bankLedger: BankTransaction[];
  creditHistory: CreditHistoryEntry[];
  miscCollections: MiscCollection[];
}

export interface AppState {
  settings: Settings | null;
  isSetupComplete: boolean;
  // Add other state slices here, e.g., reports, purchases
}

export interface AppStateContextType extends AppState {
  setSettings: (settings: Settings) => void;
  finishSetup: (settings: Settings) => void;
  resetApp: () => void;

  // Manager Ledger
  addManagerTransaction: (transaction: Omit<ManagerTransaction, 'id' | 'createdAt'>) => void;
  deleteManagerTransaction: (transactionId: string) => void;

  // Credit Register
  addCreditGiven: (amount: number) => void;
  addCreditRepayment: (amount: number, destination: 'cash' | 'bank'>) => void;

  // Bank Ledger
  addBankTransaction: (transaction: Omit<BankTransaction, 'id' | 'createdAt'>) => void;
  deleteBankTransaction: (transactionId: string) => void;

  // Misc Collections
  addMiscCollection: (collection: Omit<MiscCollection, 'id' | 'createdAt'>) => void;
  deleteMiscCollection: (collectionId: string) => void;
  
  // Monthly Reports
  addOrUpdateMonthlyReport: (report: Omit<MonthlyReport, 'createdAt' | 'updatedAt'>) => void;
  deleteMonthlyReport: (reportId: string) => void;

  // Fuel Purchases
  addFuelPurchase: (purchase: Omit<FuelPurchase, 'id' | 'createdAt'>) => void;
  deleteFuelPurchase: (purchaseId: string) => void;
}
