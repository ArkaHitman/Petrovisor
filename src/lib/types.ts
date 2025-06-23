export interface Fuel {
  id: string;
  name: string;
  price: number;
  cost: number;
}

export interface FuelPriceEntry {
  id:string;
  date: string; // YYYY-MM-DD
  prices: Record<string, number>; // Map of fuel ID to its price
}

export interface Tank {
  id: string;
  name: string;
  fuelId: string;
  capacity: number;
  initialStock: number;
  lastStockUpdateDate?: string; // YYYY-MM-DD
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
}

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  type: 'credit' | 'debit';
  amount: number;
  source?: 'credit_repayment' | 'manual';
}

export interface CreditHistoryEntry {
  id: string;
  date: string;
  type: 'given' | 'repaid';
  amount: number;
  repaymentDestination?: 'cash' | 'bank';
}

export interface MiscCollection {
    id: string;
    date: string;
    description: string;
    amount: number;
}

export interface WeeklyReport {
  id: string;
  endDate: string; // YYYY-MM-DD
  totalSales: number;
  estProfit: number;
  litresSold: number;
  bankDeposits: number;
  creditSales: number;
  netCash: number;
}

export interface Settings {
  pumpName: string;
  theme: 'light' | 'dark';
  bankName?: string;
  bankAccountNumber?: string;
  sanctionedAmount?: number;
  initialBankBalance?: number;
  creditOutstanding?: number; // This will now be the initial value
  managerInitialBalance?: number;
  debtRecovered?: number;
  fuels: Fuel[];
  tanks: Tank[];
  nozzlesPerFuel: NozzlesPerFuel;
  fuelPriceHistory: FuelPriceEntry[];
  weeklyReports: WeeklyReport[];

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
  addManagerTransaction: (transaction: Omit<ManagerTransaction, 'id'>) => void;
  deleteManagerTransaction: (transactionId: string) => void;

  // Credit Register
  addCreditGiven: (amount: number) => void;
  addCreditRepayment: (amount: number, destination: 'cash' | 'bank') => void;

  // Bank Ledger
  addBankTransaction: (transaction: Omit<BankTransaction, 'id'>) => void;
  deleteBankTransaction: (transactionId: string) => void;

  // Misc Collections
  addMiscCollection: (collection: Omit<MiscCollection, 'id'>) => void;
  deleteMiscCollection: (collectionId: string) => void;
}
