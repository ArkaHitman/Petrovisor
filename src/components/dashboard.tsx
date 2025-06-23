'use client';

import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import FloatingCashDisplay from './floating-cash-display';
import StatCard from './stat-card';
import { Landmark, Database, Wallet, ShieldCheck, Droplets, ReceiptText, BarChart, CalendarDays, HandCoins } from 'lucide-react';
import { useMemo } from 'react';
import { format as formatDate, parseISO } from 'date-fns';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const { settings } = useAppState();

  const {
    totalStockValue,
    currentOutstandingCredit,
    currentBankBalance,
    totalMiscCollections,
    netWorth,
    remainingLimit,
    latestWeeklyReport,
    salesChartData
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
        salesChartData: [],
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
    
    const salesChartData = (settings.weeklyReports || [])
      .slice(0, 7) // Get last 7 reports
      .map(report => ({
        date: formatDate(parseISO(report.endDate), 'MMM dd'),
        Sales: report.totalSales,
        Profit: report.estProfit,
      }))
      .reverse(); // To show oldest first

    return { totalStockValue, currentOutstandingCredit, currentBankBalance, totalMiscCollections, netWorth, remainingLimit, latestWeeklyReport, salesChartData };
  }, [settings]);

  if (!settings) {
    return null; // Or a loading skeleton
  }
  
  const getTankLevelColor = (percentage: number) => {
    if (percentage < 20) return 'bg-destructive';
    if (percentage < 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  const chartConfig = {
    Sales: {
      label: 'Sales',
      color: 'hsl(var(--chart-2))',
    },
    Profit: {
      label: 'Profit',
      color: 'hsl(var(--chart-1))',
    },
  };

  return (
    <>
      <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Net Worth" value={formatCurrency(netWorth)} icon={Wallet} />
            <StatCard title="Bank Balance" value={formatCurrency(currentBankBalance)} icon={Landmark} />
            <StatCard title="Outstanding Credit" value={formatCurrency(currentOutstandingCredit)} icon={ReceiptText} />
            <StatCard title="Remaining Limit" value={formatCurrency(remainingLimit)} icon={ShieldCheck} valueClassName={remainingLimit >= 0 ? 'text-green-600' : 'text-destructive'}/>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-headline">Weekly Sales</CardTitle>
              <CardDescription>Performance of the last 7 weekly reports.</CardDescription>
            </CardHeader>
            <CardContent>
              {salesChartData.length > 0 ? (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <RechartsBarChart accessibilityLayer data={salesChartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(value) => `₹${value / 1000}k`}
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="Sales" fill="var(--color-Sales)" radius={4} />
                    <Bar dataKey="Profit" fill="var(--color-Profit)" radius={4} />
                  </RechartsBarChart>
                </ChartContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No weekly reports found to display chart.
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Tank Overview</CardTitle>
              <CardDescription>Initial stock levels from settings.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
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
      </div>
      <FloatingCashDisplay />
    </>
  );
}
