
'use client';

import { useAppState } from "@/contexts/app-state-provider";
import { formatCurrency } from "@/lib/utils";
import { useMemo } from "react";

export default function FloatingCashDisplay() {
  const { settings } = useAppState();

  const totalCash = useMemo(() => {
    if (!settings) return 0;
    
    // The miscCollections ledger serves as the single source of truth for all physical cash transactions.
    return settings.miscCollections?.reduce((sum, c) => {
        // Backwards compatibility for old data that doesn't have a 'type'
        const type = c.type || 'inflow';
        if (type === 'inflow') {
            return sum + c.amount;
        } else {
            return sum - c.amount;
        }
    }, 0) || 0;
  }, [settings]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-accent to-primary rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
        <div className="relative flex items-center justify-center h-28 w-28 rounded-full bg-background/80 text-foreground p-1 shadow-lg transition-transform group-hover:scale-105">
            <div className="flex flex-col items-center justify-center h-full w-full rounded-full text-center">
               <span className="text-sm font-medium">Cash in Hand</span>
               <span className="font-headline text-lg font-bold">{formatCurrency(totalCash)}</span>
            </div>
        </div>
      </div>
    </div>
  );
}
