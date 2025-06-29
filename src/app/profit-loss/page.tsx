'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, getFuelPricesForDate } from '@/lib/utils';
import { BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';

export default function ProfitLossPage() {
    const { settings } = useAppState();

    const profitAndLossData = useMemo(() => {
        if (!settings) {
            return {
                totalRevenue: 0,
                fuelSales: 0,
                lubeSales: 0,
                miscCollections: 0,
                totalCogs: 0,
                grossProfit: 0,
                totalExpenses: 0,
                operatingExpenses: [],
                netProfit: 0,
            };
        }

        // 1. Calculate Revenue
        const fuelSales = settings.shiftReports?.reduce((sum, report) => sum + report.totalSales - (report.lubeSaleAmount || 0), 0) || 0;
        const lubeSales = settings.shiftReports?.reduce((sum, report) => sum + (report.lubeSaleAmount || 0), 0) || 0;
        
        // Filter misc collections to only include "true" other income, not cash transfers from sales or credit repayments.
        const miscCollections = settings.miscCollections?.filter(c => !['shift_report', 'credit_repayment'].includes(c.source || '')).reduce((sum, c) => sum + c.amount, 0) || 0;

        const totalRevenue = fuelSales + lubeSales + miscCollections;

        // 2. Calculate Cost of Goods Sold (COGS) for Fuel
        let totalCogs = 0;
        settings.shiftReports?.forEach(report => {
            report.meterReadings.forEach(reading => {
                const fuel = settings.fuels.find(f => f.id === reading.fuelId);
                if (fuel) {
                    const { costPrice } = getFuelPricesForDate(
                        fuel.id,
                        report.date,
                        settings.fuelPriceHistory,
                        { sellingPrice: fuel.price, costPrice: fuel.cost }
                    );
                    totalCogs += reading.saleLitres * costPrice;
                }
            });
        });

        const grossProfit = totalRevenue - totalCogs;

        // 3. Calculate Operating Expenses from Journal
        const expenseAccounts = settings.chartOfAccounts?.filter(acc => acc.type === 'Expense') || [];
        const expenseAccountIds = new Set(expenseAccounts.map(acc => acc.id));
        const operatingExpenses: { name: string; total: number }[] = [];
        const expenseTotals: Record<string, number> = {};

        settings.journalEntries?.forEach(entry => {
            entry.legs.forEach(leg => {
                if (leg.accountType === 'chart_of_account' && expenseAccountIds.has(leg.accountId)) {
                    const accountName = expenseAccounts.find(acc => acc.id === leg.accountId)?.name || 'Unknown Expense';
                    expenseTotals[accountName] = (expenseTotals[accountName] || 0) + leg.debit;
                }
            });
        });

        for (const [name, total] of Object.entries(expenseTotals)) {
            if (total > 0) {
                operatingExpenses.push({ name, total });
            }
        }
        
        const totalExpenses = operatingExpenses.reduce((sum, exp) => sum + exp.total, 0);

        // 4. Calculate Net Profit
        const netProfit = grossProfit - totalExpenses;

        return {
            totalRevenue,
            fuelSales,
            lubeSales,
            miscCollections,
            totalCogs,
            grossProfit,
            totalExpenses,
            operatingExpenses,
            netProfit,
        };

    }, [settings]);

    const {
        totalRevenue,
        fuelSales,
        lubeSales,
        miscCollections,
        totalCogs,
        grossProfit,
        totalExpenses,
        operatingExpenses,
        netProfit
    } = profitAndLossData;

    return (
        <AppLayout>
            <PageHeader
                title="Profit &amp; Loss Statement"
                description="An overview of your revenue, costs, and profitability."
            />
            <div className="p-4 md:p-8 space-y-6">
                <Card>
                     <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Net Profit / Loss
                        </CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-3xl font-bold font-headline ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            {formatCurrency(netProfit)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {netProfit >= 0 ? 'Overall profit generated' : 'Overall loss incurred'}
                        </p>
                    </CardContent>
                </Card>
                
                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                             <CardTitle className="font-headline flex items-center gap-2">
                                <TrendingUp className="text-green-500" />
                                Income
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>Fuel Sales</TableCell>
                                        <TableCell className="text-right">{formatCurrency(fuelSales)}</TableCell>
                                    </TableRow>
                                     <TableRow>
                                        <TableCell>Lubricant Sales</TableCell>
                                        <TableCell className="text-right">{formatCurrency(lubeSales)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Miscellaneous Collections</TableCell>
                                        <TableCell className="text-right">{formatCurrency(miscCollections)}</TableCell>
                                    </TableRow>
                                </TableBody>
                                <TableFooter>
                                    <TableRow>
                                        <TableHead>Total Revenue</TableHead>
                                        <TableHead className="text-right font-bold">{formatCurrency(totalRevenue)}</TableHead>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <TrendingDown className="text-red-500" />
                                Costs &amp; Expenses
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>Cost of Goods Sold (Fuel)</TableCell>
                                        <TableCell className="text-right">({formatCurrency(totalCogs)})</TableCell>
                                    </TableRow>
                                    <TableRow className="bg-muted/50">
                                        <TableCell className="font-semibold">Gross Profit</TableCell>
                                        <TableCell className="text-right font-semibold">{formatCurrency(grossProfit)}</TableCell>
                                    </TableRow>
                                    {operatingExpenses.map(exp => (
                                        <TableRow key={exp.name}>
                                            <TableCell className="pl-6 text-muted-foreground">{exp.name}</TableCell>
                                            <TableCell className="text-right">({formatCurrency(exp.total)})</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter>
                                     <TableRow>
                                        <TableHead>Total Expenses</TableHead>
                                        <TableHead className="text-right font-bold">({formatCurrency(totalExpenses)})</TableHead>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
