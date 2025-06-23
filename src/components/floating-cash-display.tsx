'use client';

import { formatCurrency } from "@/lib/utils";

export default function FloatingCashDisplay() {
  const totalCash = 10500; // Placeholder value

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-accent to-primary rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
        <div className="relative flex items-center justify-center h-28 w-28 rounded-full bg-background/80 text-foreground p-1 shadow-lg transition-transform group-hover:scale-105">
            <div className="flex flex-col items-center justify-center h-full w-full rounded-full">
               <span className="text-sm font-medium">Total Cash</span>
               <span className="font-headline text-lg font-bold">{formatCurrency(totalCash)}</span>
            </div>
        </div>
      </div>
    </div>
  );
}
