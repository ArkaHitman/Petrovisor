import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { FuelPriceEntry } from "./types";
import { parseISO, isBefore, isEqual } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function getFuelPriceForDate(fuelId: string, date: string, priceHistory: FuelPriceEntry[], fallbackPrice: number): { price: number, entryDate: string | null } {
  const targetDate = parseISO(date);
  
  const relevantPriceEntry = priceHistory
    .filter(entry => {
      const entryDate = parseISO(entry.date);
      return isBefore(entryDate, targetDate) || isEqual(entryDate, targetDate);
    })
    .sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
    [0];

  if (relevantPriceEntry && relevantPriceEntry.prices[fuelId] !== undefined) {
    return { price: relevantPriceEntry.prices[fuelId], entryDate: relevantPriceEntry.date };
  }
  
  return { price: fallbackPrice, entryDate: null };
}
