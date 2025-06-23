'use client';

import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import FloatingCashDisplay from './floating-cash-display';
import StatCard from './stat-card';
import { Landmark, Database, Wallet, ShieldCheck, Droplets, ReceiptText } from 'lucide-react';
import { useMemo } from 'react';

export default function Dashboard() {
  const { settings } = useAppState();

  const {
    totalStockValue,
    currentOutstandingCredit,
    currentBankBalance,
    netWorth,
    remainingLimit,
  } = useMemo(() => {
    if (!settings) {
      return {
        totalStockValue: 0,
        currentOutstandingCredit: 0,
        currentBankBalance: 0,
        netWorth: 0,
        remainingLimit: 0,
      };
    }

    const totalStockValue = settings.tanks.reduce((total, tank) => {
      const fuel = settings.fuels.find(f => f.id === tank.fuelId);
      // NOTE: This uses initialStock. For live stock value, we'll need a different calculation.
      return total + (tank.initialStock * (fuel?.cost || 0));
    }, 0);

    const initialCredit = settings.creditOutstanding || 0;
    const creditHistory = settings.creditHistory || [];
    const currentOutstandingCredit = creditHistory.reduce((acc, tx) => {
        if (tx.type === 'given') return acc + tx.amount;
        if (tx.type === 'repaid') return acc - tx.amount;
        return acc;
    }, initialCredit);

    const initialBankBalance = settings.initialBankBalance || 0;
    const bankLedger = settings.bankLedger || [];
    const currentBankBalance = bankLedger.reduce((acc, tx) => {
        if (tx.type === 'credit') return acc + tx.amount;
        return acc - tx.amount;
    }, initialBankBalance);

    const debtRecovered = settings.debtRecovered || 0; // This is an initial value, live recovery is handled in collections/bank
    const netWorth = totalStockValue + currentOutstandingCredit + debtRecovered + currentBankBalance;
    const sanctionedAmount = settings.sanctionedAmount || 0;
    const remainingLimit = sanctionedAmount - netWorth;
    
    return { totalStockValue, currentOutstandingCredit, currentBankBalance, netWorth, remainingLimit };
  }, [settings]);

  if (!settings) {
    return null; // Or a loading skeleton
  }
  
  const getTankLevelColor = (percentage: number) => {
    if (percentage < 20) return 'bg-destructive';
    if (percentage < 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <>
      <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="font-headline text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
           <StatCard
            title="Net Worth"
            value={formatCurrency(netWorth)}
            icon={Wallet}
            description="Stock + Bank + Credit"
          />
           <StatCard
            title="Remaining Limit"
            value={formatCurrency(remainingLimit)}
            icon={ShieldCheck}
            description={remainingLimit >= 0 ? 'Within sanctioned limit' : 'Exceeded sanctioned limit'}
            valueClassName={remainingLimit >= 0 ? 'text-green-600' : 'text-destructive'}
          />
          <StatCard
            title="Bank Balance"
            value={formatCurrency(currentBankBalance)}
            icon={Landmark}
            description="Current calculated balance"
          />
           <StatCard
            title="Outstanding Credit"
            value={formatCurrency(currentOutstandingCredit)}
            icon={ReceiptText}
            description="Money owed to you"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
           <Card>
            <CardHeader>
              <CardTitle className="font-headline">Tank Levels (Initial)</CardTitle>
              <CardDescription>Initial stock set during setup. Check Tank Status for live levels.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              {settings.tanks.map(tank => {
                const fuel = settings.fuels.find(f => f.id === tank.fuelId);
                const percentage = tank.capacity > 0 ? (tank.initialStock / tank.capacity) * 100 : 0;
                const stockValue = tank.initialStock * (fuel?.cost || 0);

                return (
                  <div key={tank.id} className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Droplets className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-baseline justify-between">
                        <p className="text-sm font-medium leading-none">{fuel?.name || 'Unknown Fuel'}</p>
                        <p className="text-sm font-semibold text-muted-foreground">{tank.initialStock.toLocaleString()} L ({percentage.toFixed(0)}%)</p>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={cn("h-full transition-all", getTankLevelColor(percentage))}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                       <p className="text-xs text-muted-foreground">Value (Cost): {formatCurrency(stockValue)}</p>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
          <Card>
              <CardHeader>
                <CardTitle className="font-headline">Financial Snapshot</CardTitle>
                <CardDescription>Key figures based on current data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total Stock Value</span>
                    <span className="font-semibold font-headline">{formatCurrency(totalStockValue)}</span>
                  </div>
                   <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Sanctioned Amount</span>
                    <span className="font-semibold font-headline">{formatCurrency(settings.sanctionedAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Debt Recovered (Initial)</span>
                    <span className="font-semibold font-headline">{formatCurrency(settings.debtRecovered || 0)}</span>
                  </div>
                  <hr/>
                   <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Net Worth</span>
                    <span className="text-lg font-bold font-headline">{formatCurrency(netWorth)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={cn("text-lg font-bold", remainingLimit >= 0 ? 'text-green-600' : 'text-destructive')}>Remaining Limit</span>
                    <span className={cn("text-lg font-bold font-headline", remainingLimit >= 0 ? 'text-green-600' : 'text-destructive')}>{formatCurrency(remainingLimit)}</span>
                  </div>
              </CardContent>
          </Card>
        </div>
      </div>
      <FloatingCashDisplay />
    </>
  );
}
