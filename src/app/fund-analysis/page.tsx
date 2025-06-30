'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, Loader2, AlertTriangle, ListChecks, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { performFinancialAudit } from '@/ai/flows/fund-analysis-flow';
import type { FinancialAuditOutput } from '@/ai/flows/fund-analysis-flow';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatCard from '@/components/stat-card';
import { format as formatDate, parseISO } from 'date-fns';

const ResultsDisplay = ({ result }: { result: FinancialAuditOutput }) => {
  const { summary, dailyBreakdown } = result;
  return (
    <div className="space-y-8">
      {/* Summary Section */}
      <Card>
        <CardHeader><CardTitle>Audit Summary</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <StatCard title="Total Profit" value={formatCurrency(summary.totalProfit)} icon={BarChart3} valueClassName="text-green-600" />
          <StatCard title="Total Sales" value={formatCurrency(summary.totalSales)} icon={ListChecks} />
          <StatCard title="Total Purchases" value={formatCurrency(summary.totalPurchases)} icon={ListChecks} />
          <StatCard title="Untracked Cash" value={formatCurrency(summary.totalCashGap)} icon={AlertTriangle} valueClassName="text-destructive" description="Total cash collected but not deposited." />
          <StatCard title="Outstanding Credit" value={formatCurrency(summary.currentOutstandingCredit)} icon={ListChecks} />
          <StatCard title="Total Investment" value={formatCurrency(summary.totalInvestment)} icon={ListChecks} />
          <StatCard title="Capital Repaid" value={formatCurrency(summary.capitalRepaid)} icon={ListChecks} />
        </CardContent>
      </Card>
      
      {/* Daily Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Breakdown</CardTitle>
          <CardDescription>A day-by-day log of all financial activities based on the audit.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Purchases</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Cash In</TableHead>
                <TableHead className="text-right">Deposited</TableHead>
                <TableHead className="text-right">Cash Gap</TableHead>
                <TableHead className="text-right">Est. Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyBreakdown.map((day) => (
                <TableRow key={day.date}>
                  <TableCell className="font-medium">{formatDate(parseISO(day.date), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-right">{formatCurrency(day.purchaseAmount)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(day.totalSales)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(day.creditSales)}</TableCell>
                  <TableCell className="text-right text-blue-600">{formatCurrency(day.totalCashInHand)}</TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(day.bankDeposits)}</TableCell>
                  <TableCell className={cn("text-right font-bold", day.cashGap < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                    {formatCurrency(day.cashGap)}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-primary">{formatCurrency(day.estimatedProfit)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default function FinancialAuditPage() {
    const { settings } = useAppState();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<FinancialAuditOutput | null>(null);

    const handleRunAudit = async () => {
        if (!settings) {
            toast({ title: "Error", description: "Application data not found.", variant: 'destructive' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const dataToAudit = {
                shiftReports: settings.shiftReports,
                purchases: settings.purchases,
                bankLedger: settings.bankLedger,
                creditHistory: settings.creditHistory,
                journalEntries: settings.journalEntries,
                fuels: settings.fuels,
                fuelPriceHistory: settings.fuelPriceHistory,
                chartOfAccounts: settings.chartOfAccounts,
            };
            
            const jsonData = JSON.stringify(dataToAudit);
            const result = await performFinancialAudit({ jsonData });
            
            setAnalysisResult(result);
            toast({ title: "Audit Complete", description: "Review the financial summary and daily breakdown below." });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            toast({ title: "Audit Failed", description: errorMessage, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleReset = () => {
        setAnalysisResult(null);
        setIsLoading(false);
    };

    return (
        <AppLayout>
            <PageHeader
                title="Financial Audit"
                description="Run a comprehensive AI-powered audit on your station's financial data."
            />
            <div className="p-4 md:p-8 space-y-6">
                {!analysisResult ? (
                    <Card className="max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle className="font-headline">Run New Audit</CardTitle>
                            <CardDescription>
                                The AI will analyze all your recorded purchases, sales, deposits, and journal entries to generate a complete financial health report. This process can take a few moments.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={handleRunAudit} disabled={isLoading} className="w-full">
                                {isLoading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Performing Audit...</>
                                ) : (
                                    <><BarChart3 className="mr-2 h-4 w-4" /> Start Financial Audit</>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div>
                        <div className="mb-6">
                            <Button variant="outline" onClick={handleReset}>
                                <Trash2 className="mr-2 h-4 w-4" /> Run New Audit
                            </Button>
                        </div>
                        <ResultsDisplay result={analysisResult} />
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
