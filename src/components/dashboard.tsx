
'use client';

import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, cn, getFuelPricesForDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import FloatingCashDisplay from './floating-cash-display';
import StatCard from './stat-card';
import { Landmark, Wallet, ShieldCheck, ReceiptText, Briefcase, ShoppingCart } from 'lucide-react';
import { useMemo, useState } from 'react';
import { format as formatDate, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from './ui/badge';
import type { BankAccount, JournalEntry } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Dashboard() {
  const { settings } = useAppState();
  const [selectedAccountId, setSelectedAccountId] = useState('all');

  const {
    totalStockValue,
    currentOutstandingCredit,
    accountBalances,
    totalBankBalance,
    overdraftAccount,
    netManagerBalance,
    netWorth,
    remainingLimit,
    recentManagerTransactions,
    recentPurchases,
    managerAccount,
  } = useMemo(() => {
    if (!settings) return { totalStockValue: 0, currentOutstandingCredit: 0, accountBalances: [], totalBankBalance: 0, overdraftAccount: null, netManagerBalance: 0, netWorth: 0, remainingLimit: 0, recentManagerTransactions: [], recentPurchases: [], managerAccount: null };

    const today = formatDate(new Date(), 'yyyy-MM-dd');
    const totalStockValue = settings.tanks.reduce((total, tank) => {
      const fuel = settings.fuels.find(f => f.id === tank.fuelId);
      if (!fuel) return total;
      const { costPrice } = getFuelPricesForDate(tank.fuelId, today, settings.fuelPriceHistory, { sellingPrice: fuel.price, costPrice: fuel.cost });
      return total + (tank.initialStock * costPrice);
    }, 0);

    const currentOutstandingCredit = (settings.creditHistory || []).reduce((acc, tx) => (tx.type === 'given' ? acc + tx.amount : acc - tx.amount), 0);

    const calculatedAccountBalances = (settings.bankAccounts || []).map(account => {
        const balance = (settings.bankLedger || []).filter(tx => tx.accountId === account.id).reduce((acc, tx) => (tx.type === 'credit' ? acc + tx.amount : acc - tx.amount), account.initialBalance);
        return { id: account.id, name: account.name, balance };
    });

    const totalBankBalance = calculatedAccountBalances.reduce((sum, acc) => sum + acc.balance, 0);
    
    const overdraftAccount: BankAccount | null = (settings.bankAccounts || []).find(acc => acc.isOverdraft) || (settings.bankAccounts || [])[0] || null;
    const overdraftAccountBalance = calculatedAccountBalances.find(acc => acc.id === overdraftAccount?.id)?.balance || 0;

    const managerAccount = settings.chartOfAccounts?.find(acc => acc.name === "Manager's Capital Account");
    let netManagerBalance = 0;
    let recentManagerTransactions: JournalEntry[] = [];
    if (managerAccount) {
        const managerJournalEntries = (settings.journalEntries || []).filter(entry => 
            entry.legs.some(leg => leg.accountType === 'chart_of_account' && leg.accountId === managerAccount.id)
        );
        netManagerBalance = managerJournalEntries.reduce((acc, entry) => {
            const managerLeg = entry.legs.find(leg => leg.accountId === managerAccount.id);
            return acc + (managerLeg?.credit || 0) - (managerLeg?.debit || 0);
        }, 0);
        recentManagerTransactions = managerJournalEntries.slice(0, 5);
    }
    
    const netWorth = totalBankBalance + currentOutstandingCredit + totalStockValue;
    
    const netWorthForLimit = totalStockValue + currentOutstandingCredit + overdraftAccountBalance + netManagerBalance;
    const sanctionedAmount = overdraftAccount?.sanctionedAmount || 0;
    const remainingLimit = netWorthForLimit - sanctionedAmount;
    
    const allRecentPurchases = (settings.purchases || []);
    const filteredPurchases = selectedAccountId === 'all'
        ? allRecentPurchases
        : allRecentPurchases.filter(p => p.accountId === selectedAccountId);
    const recentPurchases = filteredPurchases.slice(0, 5);


    return { totalStockValue, currentOutstandingCredit, accountBalances: calculatedAccountBalances, totalBankBalance, overdraftAccount, netManagerBalance, netWorth, remainingLimit, recentManagerTransactions, recentPurchases, managerAccount };
  }, [settings, selectedAccountId]);

  if (!settings) return null;
  
  const getTankLevelColor = (percentage: number) => {
    if (percentage < 20) return 'bg-destructive'; if (percentage < 50) return 'bg-yellow-500'; return 'bg-green-500';
  };
  
  const managerBalanceStatus = netManagerBalance > 0 ? "You Owe Manager" : netManagerBalance < 0 ? "Manager Owes You" : "Settled";
  const managerBalanceColor = netManagerBalance > 0 ? "text-destructive" : netManagerBalance < 0 ? "text-primary" : "text-muted-foreground";

  const showRemainingLimitCard = overdraftAccount && (selectedAccountId === 'all' || selectedAccountId === overdraftAccount.id);

  return (
    <>
      <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Net Worth" value={formatCurrency(netWorth)} icon={Wallet} description="Bank Balance + Credit + Stock Value"/>
            
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Bank Balance</CardTitle>
                    <Landmark className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold font-headline">
                        {selectedAccountId === 'all'
                            ? formatCurrency(totalBankBalance)
                            : formatCurrency(accountBalances.find(acc => acc.id === selectedAccountId)?.balance ?? 0)
                        }
                    </div>
                     <Select onValueChange={setSelectedAccountId} defaultValue="all">
                        <SelectTrigger className="h-8 text-xs mt-1 w-full">
                            <SelectValue placeholder="Select Account" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Accounts</SelectItem>
                            {accountBalances.map(acc => (
                                <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            <StatCard title="Outstanding Credit" value={formatCurrency(currentOutstandingCredit)} icon={ReceiptText} />
            
            {showRemainingLimitCard && (
                <StatCard 
                    title="Remaining Limit" 
                    description={`vs ${overdraftAccount?.name || 'OD Account'}`} 
                    value={formatCurrency(remainingLimit)} 
                    icon={ShieldCheck} 
                    valueClassName={remainingLimit >= 0 ? 'text-green-600' : 'text-destructive'}
                />
            )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="font-headline">Manager Ledger</CardTitle><Briefcase className="w-6 h-6 text-muted-foreground"/></CardHeader>
            <CardContent>
              <div className="mb-6 p-4 rounded-lg bg-muted"><p className="text-sm text-muted-foreground">Net Manager Balance</p><p className={cn("text-2xl font-bold font-headline", managerBalanceColor)}>{formatCurrency(Math.abs(netManagerBalance))}</p><p className="text-sm font-semibold">{managerBalanceStatus}</p></div>
              {recentManagerTransactions.length > 0 ? (
                 <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>{recentManagerTransactions.map(tx => {
                        const managerLeg = tx.legs.find(leg => leg.accountId === managerAccount?.id);
                        const type = managerLeg?.credit ? 'From Manager' : 'To Manager';
                        const amount = managerLeg?.credit || managerLeg?.debit || 0;
                        return (<TableRow key={tx.id}><TableCell>{formatDate(parseISO(tx.date), 'dd MMM')}</TableCell><TableCell className="font-medium">{tx.description}</TableCell><TableCell><Badge variant={type === 'From Manager' ? 'default' : 'destructive'}>{type}</Badge></TableCell><TableCell className="text-right font-semibold">{formatCurrency(amount)}</TableCell></TableRow>)
                    })}</TableBody>
                 </Table>
              ) : <div className="h-[150px] flex items-center justify-center text-muted-foreground">No manager transactions recorded.</div>}
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="font-headline">Tank Overview</CardTitle><CardDescription>Current live stock levels.</CardDescription></CardHeader>
              <CardContent className="grid gap-6">
                {settings.tanks.map(tank => {
                  const fuel = settings.fuels.find(f => f.id === tank.fuelId);
                  const percentage = tank.capacity > 0 ? (tank.initialStock / tank.capacity) * 100 : 0;
                  if (!fuel) return null;
                  const today = formatDate(new Date(), 'yyyy-MM-dd');
                  const { costPrice } = getFuelPricesForDate(tank.fuelId, today, settings.fuelPriceHistory, { sellingPrice: fuel.price, costPrice: fuel.cost });
                  const stockValue = tank.initialStock * costPrice;
                  return (
                    <div key={tank.id} className="flex items-center gap-4">
                       <div className="flex-1 space-y-1">
                        <div className="flex items-baseline justify-between"><p className="text-sm font-medium leading-none">{fuel?.name}</p><p className="text-sm font-semibold text-muted-foreground">{tank.initialStock.toLocaleString()} L</p></div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary"><div className={cn("h-full transition-all", getTankLevelColor(percentage))} style={{ width: `${percentage}%` }}/></div>
                         <p className="text-xs text-muted-foreground">Value (Cost): {formatCurrency(stockValue)}</p>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between"><CardTitle className="font-headline">Recent Purchases</CardTitle><ShoppingCart className="w-6 h-6 text-muted-foreground"/></CardHeader>
                <CardContent>
                    {recentPurchases.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Fuel</TableHead>
                                    <TableHead>Account</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentPurchases.map(p => { 
                                    const fuel = settings.fuels.find(f => f.id === p.fuelId);
                                    const account = settings.bankAccounts.find(a => a.id === p.accountId);
                                    return (
                                        <TableRow key={p.id}>
                                            <TableCell>{formatDate(parseISO(p.date), 'dd MMM')}</TableCell>
                                            <TableCell className="font-medium">{fuel?.name || 'N/A'}</TableCell>
                                            <TableCell><Badge variant="secondary">{account?.name || 'N/A'}</Badge></TableCell>
                                            <TableCell className="text-right font-semibold">{formatCurrency(p.amount)}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    ) : <div className="flex items-center justify-center h-24 text-muted-foreground"><p>No purchase data available.</p></div>}
                </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <FloatingCashDisplay />
    </>
  );
}
