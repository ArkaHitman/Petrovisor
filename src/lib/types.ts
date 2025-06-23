export interface Fuel {
  id: string;
  name: string;
  price: number;
  cost: number;
}

export interface FuelPriceEntry {
  id: string;
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

export interface Settings {
  pumpName: string;
  theme: 'light' | 'dark';
  bankName?: string;
  bankAccountNumber?: string;
  sanctionedAmount?: number;
  initialBankBalance?: number;
  creditOutstanding?: number;
  debtRecovered?: number;
  fuels: Fuel[];
  tanks: Tank[];
  nozzlesPerFuel: NozzlesPerFuel;
  fuelPriceHistory: FuelPriceEntry[];
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
}
