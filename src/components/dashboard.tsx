'use client';

import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import FloatingCashDisplay from './floating-cash-display';
import StatCard from './stat-card';
import { Landmark, Database, Wallet, ShieldCheck, Droplets, ReceiptText, Briefcase, ShoppingCart } from 'lucide-react';
import { useMemo } from 'react';
import { format as formatDate, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from './ui/badge';

export default function Dashboard() {
  const { settings } = useAppState();

  const {
    totalStockValue,
    currentOutstandingCredit,
    currentBankBalance,
    totalMiscCollections,
    netWorth,
    remainingLimit,
    latestMonthlyReport,
    recentManagerTransactions,
  } = useMemo(() => {
    if (!settings) {
      return {
        totalStockValue: 0,
        currentOutstandingCredit: 0,
        currentBankBalance: 0,
        totalMiscCollections: 0,
        netWorth: 0,
        remainingLimit: 0,
        latestMonthlyReport: null,
        recentManagerTransactions: [],
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
    const latestMonthlyReport = settings.monthlyReports?.sort((a, b) => b.endDate.localeCompare(a.endDate))[0] || null;
    
    const recentManagerTransactions = (settings.managerLedger || []).slice(0, 5);

    return { totalStockValue, currentOutstandingCredit, currentBankBalance, totalMiscCollections, netWorth, remainingLimit, latestMonthlyReport, recentManagerTransactions };
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Net Worth" value={formatCurrency(netWorth)} icon={Wallet} />
            <StatCard title="Bank Balance" value={formatCurrency(currentBankBalance)} icon={Landmark} />
            <StatCard title="Outstanding Credit" value={formatCurrency(currentOutstandingCredit)} icon={ReceiptText} />
            <StatCard title="Remaining Limit" value={formatCurrency(remainingLimit)} icon={ShieldCheck} valueClassName={remainingLimit >= 0 ? 'text-green-600' : 'text-destructive'}/>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline">Manager Ledger</CardTitle>
                    <CardDescription>Recent transactions with the manager.</CardDescription>
                </div>
                <Briefcase className="w-6 h-6 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
              {recentManagerTransactions.length > 0 ? (
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentManagerTransactions.map(tx => (
                            <TableRow key={tx.id}>
                                <TableCell>{formatDate(parseISO(tx.date), 'dd MMM')}</TableCell>
                                <TableCell className="font-medium">{tx.description}</TableCell>
                                <TableCell>
                                    <Badge variant={tx.type === 'payment_from_manager' ? 'default' : 'secondary'} className={cn(tx.type === 'payment_from_manager' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                                        {tx.type === 'payment_from_manager' ? 'From Manager' : 'To Manager'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(tx.amount)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  No manager transactions recorded yet.
                </div>
              )}
            </CardContent>
          </Card>
          <div className="space-y-6">
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
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="font-headline">Recent Purchases</CardTitle>
                        <CardDescription>A log of recent fuel deliveries.</CardDescription>
                    </div>
                    <ShoppingCart className="w-6 h-6 text-muted-foreground"/>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-24 text-muted-foreground">
                        <p>No purchase data available yet.</p>
                    </div>
                </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <FloatingCashDisplay />
    </>
  );
}
