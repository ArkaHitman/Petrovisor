export interface Fuel {
  id: string;
  name: string;
  price: number;
  cost: number;
}

export interface Tank {
  id: string;
  name: string;
  fuelId: string;
  capacity: number;
  initialStock: number;
}

export interface Nozzle {
  id: string;
  pumpId: number;
  nozzleId: number;
  fuelId: string;
}

export interface Settings {
  pumpName: string;
  bankName?: string;
  sanctionedAmount?: number;
  initialBankBalance?: number;
  fuels: Fuel[];
  tanks: Tank[];
  nozzleCount: number;
}

export interface AppState {
  settings: Settings | null;
  isSetupComplete: boolean;
  // Add other state slices here, e.g., reports, purchases
}

export interface AppStateContextType extends AppState {
  setSettings: (settings: Settings) => void;
  finishSetup: (settings: Settings) => void;
}
