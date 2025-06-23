'use client';

import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from './ui/card';
import FloatingCashDisplay from './floating-cash-display';

export default function Dashboard() {
  const { settings } = useAppState();

  if (!settings) {
    return null; // Or a loading skeleton
  }

  // Calculations for Financial Snapshot
  const totalStockValue = settings.tanks.reduce((total, tank) => {
    const fuel = settings.fuels.find(f => f.id === tank.fuelId);
    return total + (tank.initialStock * (fuel?.cost || 0));
  }, 0);

  const creditOutstanding = settings.creditOutstanding || 0;
  const debtRecovered = settings.debtRecovered || 0;
  const bankBalance = settings.initialBankBalance || 0;

  const netWorth = totalStockValue + creditOutstanding + debtRecovered + bankBalance;
  const sanctionedAmount = settings.sanctionedAmount || 0;
  const remainingLimit = sanctionedAmount - netWorth;

  const getTankLevelColor = (percentage: number) => {
    if (percentage < 20) return 'bg-chart-1'; // Red-ish
    if (percentage < 50) return 'bg-chart-4'; // Yellow-ish
    return 'bg-chart-2'; // Green-ish
  };

  const hasWeeklyReport = false; // Placeholder

  return (
    <>
    <div className="flex-1 space-y-8 p-4 pt-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-headline text-3xl font-bold md:text-4xl text-foreground">
          {settings.pumpName || 'PETRO MANAGE'}
        </h1>
        <p className="text-muted-foreground">Station Dashboard</p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Latest Weekly Performance Card */}
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Latest Weekly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {hasWeeklyReport ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Report Ending: <span className="font-medium text-foreground">22 Jun 2025</span></p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Sales</p>
                    <p className="font-headline text-lg font-semibold text-green-600">{formatCurrency(50000)}</p>
                  </div>
                   <div>
                    <p className="text-sm text-muted-foreground">Est. Profit</p>
                    <p className="font-headline text-lg font-semibold text-green-600">{formatCurrency(5000)}</p>
                  </div>
                   <div>
                    <p className="text-sm text-muted-foreground">Litres Sold</p>
                    <p className="font-headline text-lg font-semibold">500 Ltrs</p>
                  </div>
                   <div>
                    <p className="text-sm text-muted-foreground">Net Cash</p>
                    <p className="font-headline text-lg font-semibold">{formatCurrency(10500)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>No weekly reports recorded yet.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Snapshot Card */}
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Financial Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sanctioned Amt.</span> <span className="font-medium">{formatCurrency(sanctionedAmount)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Stock Value</span> <span className="font-medium">{formatCurrency(totalStockValue)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Credit Outstanding</span> <span className="font-medium">{formatCurrency(creditOutstanding)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Debt Recovered</span> <span className="font-medium">{formatCurrency(debtRecovered)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Bank Balance</span> <span className="font-medium">{formatCurrency(bankBalance)}</span></div>
            <div className="flex justify-between text-sm p-2 bg-muted rounded-md"><span className="font-semibold">Net Worth</span> <span className="font-headline font-bold text-primary">{formatCurrency(netWorth)}</span></div>
            <div className={`flex justify-between text-sm p-2 rounded-md ${remainingLimit >= 0 ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50'}`}>
                <span className={`font-semibold ${remainingLimit >= 0 ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>Remaining Limit</span>
                <span className={`font-headline font-bold ${remainingLimit >= 0 ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>{formatCurrency(remainingLimit)}</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Tank Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Tank Overview (Initial Stock)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {settings.tanks.map(tank => {
              const fuel = settings.fuels.find(f => f.id === tank.fuelId);
              const percentage = tank.capacity > 0 ? (tank.initialStock / tank.capacity) * 100 : 0;
              const stockValue = tank.initialStock * (fuel?.cost || 0);

              return (
                <div key={tank.id}>
                  <p className="text-sm font-medium">{fuel?.name || 'Unknown Fuel'}</p>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary mt-1">
                    <div
                      className={cn("h-full transition-all", getTankLevelColor(percentage))}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                     <span>{Math.round(percentage)}% ({tank.initialStock}L)</span>
                     <span className="font-medium">Value: {formatCurrency(stockValue)}</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
          <CardFooter>
             <p className="text-xs italic text-muted-foreground">
                Note: Bars show initial stock levels. Check Tank Status page for live data.
             </p>
          </CardFooter>
        </Card>
      </div>

    </div>
    <FloatingCashDisplay />
    </>
  );
}
