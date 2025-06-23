'use client';

import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import FloatingCashDisplay from './floating-cash-display';
import StatCard from './stat-card';
import { Landmark, Database, Wallet, ShieldCheck, Droplets, ReceiptText, BarChart, CalendarDays, HandCoins } from 'lucide-react';
import { useMemo } from 'react';
import { format as formatDate, parseISO } from 'date-fns';

export default function Dashboard() {
  const { settings } = useAppState();

  const {
    totalStockValue,
    currentOutstandingCredit,
    currentBankBalance,
    totalMiscCollections,
    netWorth,
    remainingLimit,
    latestWeeklyReport
  } = useMemo(() => {
    if (!settings) {
      return {
        totalStockValue: 0,
        currentOutstandingCredit: 0,
        currentBankBalance: 0,
        totalMiscCollections: 0,
        netWorth: 0,
        remainingLimit: 0,
        latestWeeklyReport: null,
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
        if (tx.type === 'debit') return acc - tx.amount;
        return acc;
    }, initialBankBalance);

    const totalMiscCollections = settings.miscCollections?.reduce((acc, c) => acc + c.amount, 0) || 0;
    const netWorth = totalStockValue + currentOutstandingCredit + totalMiscCollections + currentBankBalance;
    const sanctionedAmount = settings.sanctionedAmount || 0;
    const remainingLimit = sanctionedAmount - netWorth;
    
    // Sort reports by date to find the latest one
    const latestWeeklyReport = settings.weeklyReports?.sort((a, b) => b.endDate.localeCompare(a.endDate))[0] || null;

    return { totalStockValue, currentOutstandingCredit, currentBankBalance, totalMiscCollections, netWorth, remainingLimit, latestWeeklyReport };
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-headline">Financial Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Net Worth" value={formatCurrency(netWorth)} icon={Wallet} />
                <StatCard title="Bank Balance" value={formatCurrency(currentBankBalance)} icon={Landmark} />
                <StatCard title="Outstanding Credit" value={formatCurrency(currentOutstandingCredit)} icon={ReceiptText} />
                <StatCard title="Misc Collections" value={formatCurrency(totalMiscCollections)} icon={HandCoins} />
                <StatCard title="Remaining Limit" value={formatCurrency(remainingLimit)} icon={ShieldCheck} valueClassName={remainingLimit >= 0 ? 'text-green-600' : 'text-destructive'}/>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Latest Weekly Performance</CardTitle>
              {latestWeeklyReport ? <CardDescription>Report for week ending {formatDate(parseISO(latestWeeklyReport.endDate), 'dd MMM yyyy')}</CardDescription> : <CardDescription>No weekly reports found.</CardDescription>}
            </CardHeader>
            <CardContent>
              {latestWeeklyReport ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total Sales</div>
                    <div className="font-semibold text-green-600">{formatCurrency(latestWeeklyReport.totalSales)}</div>
                  </div>
                   <div>
                    <div className="text-muted-foreground">Est. Profit</div>
                    <div className="font-semibold text-green-600">{formatCurrency(latestWeeklyReport.estProfit)}</div>
                  </div>
                   <div>
                    <div className="text-muted-foreground">Litres Sold</div>
                    <div className="font-semibold">{latestWeeklyReport.litresSold.toFixed(2)} L</div>
                  </div>
                   <div>
                    <div className="text-muted-foreground">Net Cash</div>
                    <div className="font-semibold">{formatCurrency(latestWeeklyReport.netCash)}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">No weekly reports recorded yet.</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
            <CardHeader>
              <CardTitle className="font-headline">Tank Overview</CardTitle>
              <CardDescription>Stock levels as of last update in settings. Check the Tank Status page for live details.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              {settings.tanks.map(tank => {
                const fuel = settings.fuels.find(f => f.id === tank.fuelId);
                const percentage = tank.capacity > 0 ? (tank.initialStock / tank.capacity) * 100 : 0;
                const stockValue = tank.initialStock * (fuel?.cost || 0);

                return (
                  <div key={tank.id} className="flex items-center gap-4">
                     <div className="flex-1 space-y-1">
                      <div className="flex items-baseline justify-between">
                        <p className="text-sm font-medium leading-none">{fuel?.name || 'Unknown Fuel'}</p>
                        <p className="text-sm font-semibold text-muted-foreground">{tank.initialStock.toLocaleString()} L</p>
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
      </div>
      <FloatingCashDisplay />
    </>
  );
}
