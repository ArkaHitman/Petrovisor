'use client';

import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import FloatingCashDisplay from './floating-cash-display';
import StatCard from './stat-card';
import { Landmark, Database, Wallet, ShieldCheck, Droplets } from 'lucide-react';

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
            valueClassName={remainingLimit >= 0 ? 'text-chart-2' : 'text-destructive'}
          />
          <StatCard
            title="Total Stock Value"
            value={formatCurrency(totalStockValue)}
            icon={Database}
            description="Estimated cost of all fuel"
          />
          <StatCard
            title="Bank Balance"
            value={formatCurrency(bankBalance)}
            icon={Landmark}
            description="As per last update"
          />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Tank Levels (Initial)</CardTitle>
              <CardDescription>Initial stock set during setup/settings.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              {settings.tanks.map(tank => {
                const fuel = settings.fuels.find(f => f.id === tank.fuelId);
                const percentage = tank.capacity > 0 ? (tank.initialStock / tank.capacity) * 100 : 0;

                return (
                  <div key={tank.id} className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <Droplets className="h-5 w-5 text-muted-foreground" />
                    </div>
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
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>
      <FloatingCashDisplay />
    </>
  );
}
