
'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, getFuelPricesForDate, cn } from '@/lib/utils';
import { Download, CalendarIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { useMemo, useState, useEffect } from 'react';
import { format as formatDate, parseISO, isAfter } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';


export default function DownloadReportPage() {
  const { settings } = useAppState();
  const { toast } = useToast();
  const [printOnLetterhead, setPrintOnLetterhead] = useState(false);
  const [reportOptions, setReportOptions] = useState({
    financialPosition: true,
    fuelStock: true,
    recentPurchases: true,
  });
  const [selectedAccountIds, setSelectedAccountIds] = useState<Record<string, boolean>>({});
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    if (settings?.bankAccounts) {
      const initialSelection = settings.bankAccounts.reduce((acc, account) => {
        acc[account.id] = true;
        return acc;
      }, {} as Record<string, boolean>);
      setSelectedAccountIds(initialSelection);
    }
  }, [settings?.bankAccounts]);


  const financialData = useMemo(() => {
    if (!settings || !selectedDate) return null;

    const targetDate = selectedDate;
    
    // --- START: Historical Stock Calculation ---
    const tanksWithHistoricalStock = settings.tanks.map(tank => {
      let historicalStock = tank.initialStock; // Start with today's stock

      // 1. Add back sales that happened AFTER the targetDate
      const salesAfterTargetDate = (settings.shiftReports || [])
          .filter(sr => isAfter(parseISO(sr.date), targetDate))
          .flatMap(sr => sr.meterReadings)
          .filter(reading => reading.fuelId === tank.fuelId)
          .reduce((sum, reading) => sum + reading.saleLitres, 0);

      historicalStock += salesAfterTargetDate;

      // 2. Subtract purchases that happened AFTER the targetDate
      const purchasesAfterTargetDate = (settings.purchases || [])
          .filter(p => isAfter(parseISO(p.date), targetDate) && p.tankId === tank.id)
          .reduce((sum, p) => sum + p.quantity, 0);
      
      historicalStock -= purchasesAfterTargetDate;

      return { ...tank, historicalStock };
    });
    // --- END: Historical Stock Calculation ---
    
    const reportDateStr = formatDate(targetDate, 'yyyy-MM-dd');
    
    // Now use historical stock for value calculation
    const totalStockValue = tanksWithHistoricalStock.reduce((total, tank) => {
        const fuel = settings.fuels.find(f => f.id === tank.fuelId);
        if (!fuel) return total;
        const { costPrice } = getFuelPricesForDate(tank.fuelId, reportDateStr, settings.fuelPriceHistory, { sellingPrice: fuel.price, costPrice: fuel.cost });
        return total + (tank.historicalStock * costPrice);
    }, 0);

    const creditHistoryUpToDate = (settings.creditHistory || []).filter(tx => !isAfter(parseISO(tx.date), targetDate));
    const currentOutstandingCredit = creditHistoryUpToDate.reduce((acc, tx) => (tx.type === 'given' ? acc + tx.amount : acc - tx.amount), 0);

    const bankLedgerUpToDate = (settings.bankLedger || []).filter(tx => !isAfter(parseISO(tx.date), targetDate));
    const accountBalances = (settings.bankAccounts || []).map(account => {
        const balance = bankLedgerUpToDate.filter(tx => tx.accountId === account.id).reduce((acc, tx) => (tx.type === 'credit' ? acc + tx.amount : acc - tx.amount), account.initialBalance);
        return { ...account, currentBalance: balance };
    });

    const totalBankBalance = accountBalances.reduce((sum, acc) => sum + acc.currentBalance, 0);
    const overdraftAccount = settings.bankAccounts.find(acc => acc.isOverdraft) || settings.bankAccounts[0];
    const overdraftAccountBalance = accountBalances.find(acc => acc.id === overdraftAccount?.id)?.currentBalance || 0;

    const managerLedgerUpToDate = (settings.managerLedger || []).filter(tx => !isAfter(parseISO(tx.date), targetDate));
    const netManagerBalance = managerLedgerUpToDate.reduce((acc, tx) => (tx.type === 'payment_from_manager' ? acc + tx.amount : acc - tx.amount), settings.managerInitialBalance || 0);

    const supplierDeliveriesUpToDate = (settings.supplierDeliveries || []).filter(tx => !isAfter(parseISO(tx.date), targetDate));
    const supplierPaymentsUpToDate = (settings.supplierPayments || []).filter(tx => !isAfter(parseISO(tx.date), targetDate));
    const totalDeliveryValue = supplierDeliveriesUpToDate.reduce((sum, d) => sum + d.totalInvoiceValue, 0);
    const totalPaid = supplierPaymentsUpToDate.reduce((sum, p) => sum + p.amount, 0);
    const supplierDues = totalDeliveryValue - totalPaid > 0 ? totalDeliveryValue - totalPaid : 0;

    const netWorth = totalStockValue + currentOutstandingCredit + totalBankBalance + netManagerBalance - supplierDues;
    const sanctionedAmount = overdraftAccount?.sanctionedAmount || 0;

    const netWorthForLimit = totalStockValue + currentOutstandingCredit + overdraftAccountBalance + netManagerBalance - supplierDues;
    const remainingLimit = netWorthForLimit - sanctionedAmount;
    
    const recentPurchases = (settings.purchases || [])
        .filter(p => !isAfter(parseISO(p.date), targetDate))
        .sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime())
        .slice(0, 5);
    
    return { totalStockValue, currentOutstandingCredit, accountBalances, netManagerBalance, recentPurchases, netWorth, sanctionedAmount, remainingLimit, tanksWithHistoricalStock, supplierDues };
  }, [settings, selectedDate]);

  const handleDownloadPdf = () => {
    if (!settings || !financialData || !selectedDate) { toast({ title: 'Error', description: 'Application data not loaded or date not selected.', variant: 'destructive' }); return; }
    
    const doc = new jsPDF();
    const generationDateTime = new Date();
    const formattedGenerationDateTime = formatDate(generationDateTime, 'dd MMM yyyy, h:mm:ss a');
    const formattedReportDate = formatDate(selectedDate, 'dd MMMM yyyy');
    const pageWidth = doc.internal.pageSize.getWidth();
    const formatNum = (num: number) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    const primaryColor = '#008080', lightGrey = '#F0F2F5', whiteColor = '#FFFFFF', positiveColor = '#22c55e', negativeColor = '#ef4444';
    let lastY = 15;

    if (printOnLetterhead) {
        const startX = 14, endX = pageWidth - 14; let currentY = 18;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.text('M/S. OM SRIMAA SANTOSHI FUEL', pageWidth / 2, currentY - 5, { align: 'center' });
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
        doc.text('Dealer: Indian Oil Corporation Limited', pageWidth / 2, currentY + 2, { align: 'center' });
        doc.text('P.S. -Talsara, Dist. - Sundargarh, Odisha', pageWidth / 2, currentY + 7, { align: 'center' });
        doc.text('Mob: 9437083729', pageWidth / 2, currentY + 12, { align: 'center' });
        doc.text(`Date: ${formattedReportDate}`, endX, currentY + 18, { align: 'right' });
        currentY = 42;
        doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.2); doc.line(startX, currentY, endX, currentY); currentY += 0.7; doc.line(startX, currentY, endX, currentY);
        lastY = currentY + 8;
        doc.setTextColor(0,0,0);
    } else {
        doc.setFillColor(primaryColor); doc.rect(0, 0, pageWidth, 35, 'F');
        doc.setTextColor(whiteColor); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(settings.pumpName || 'PetroVisor Station', 14, 15);
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); 
        doc.text(`Report for: ${formattedReportDate}`, 14, 25);
        doc.text(`Generated: ${formattedGenerationDateTime}`, pageWidth - 14, 25, { align: 'right' });
        lastY = 45;
    }

    if (reportOptions.financialPosition) {
        const includedBalances = financialData.accountBalances.filter(acc => selectedAccountIds[acc.id]);
        const totalIncludedBankBalance = includedBalances.reduce((sum, acc) => sum + acc.currentBalance, 0);

        const netWorthWithSelectedAccounts = financialData.totalStockValue + financialData.currentOutstandingCredit + totalIncludedBankBalance + financialData.netManagerBalance - financialData.supplierDues;

        const overdraftAccount = settings.bankAccounts.find(acc => acc.isOverdraft) || settings.bankAccounts[0];
        const overdraftBalanceForLimitCalc = selectedAccountIds[overdraftAccount.id] 
            ? (financialData.accountBalances.find(acc => acc.id === overdraftAccount.id)?.currentBalance || 0)
            : 0;

        const netWorthForLimitWithSelectedAccounts = financialData.totalStockValue + financialData.currentOutstandingCredit + overdraftBalanceForLimitCalc + financialData.netManagerBalance - financialData.supplierDues;
        const remainingLimitWithSelectedAccounts = netWorthForLimitWithSelectedAccounts - financialData.sanctionedAmount;

        const financialBody = [
            [{ content: 'Sanctioned Amount', styles: { fontStyle: 'bold' } }, { content: formatNum(financialData.sanctionedAmount), styles: { halign: 'right' } }],
            ['Total Stock Value (Cost)', { content: formatNum(financialData.totalStockValue), styles: { halign: 'right' } }],
            ['Credit Outstanding', { content: formatNum(financialData.currentOutstandingCredit), styles: { halign: 'right' } }],
            ...includedBalances.map(acc => [ `Bank: ${acc.name}`, { content: formatNum(acc.currentBalance), styles: { halign: 'right' } } ]),
            ['Net Manager Balance', { content: formatNum(financialData.netManagerBalance), styles: { halign: 'right', textColor: financialData.netManagerBalance >= 0 ? undefined : negativeColor } }],
            ['Supplier Dues', { content: formatNum(financialData.supplierDues), styles: { halign: 'right', textColor: financialData.supplierDues > 0 ? negativeColor : undefined } }],
            [{ content: 'Net Worth (Selected Accounts)', styles: { fontStyle: 'bold', fillColor: lightGrey } }, { content: formatNum(netWorthWithSelectedAccounts), styles: { fontStyle: 'bold', halign: 'right', fillColor: lightGrey } }],
            [{ content: 'Remaining Limit', styles: { fontStyle: 'bold', textColor: remainingLimitWithSelectedAccounts >= 0 ? positiveColor : negativeColor } }, { content: formatNum(remainingLimitWithSelectedAccounts), styles: { fontStyle: 'bold', halign: 'right', textColor: remainingLimitWithSelectedAccounts >= 0 ? positiveColor : negativeColor } }],
        ];

        autoTable(doc, { startY: lastY, head: [['Financial Position', 'Amount (INR)']], body: financialBody, theme: 'grid', headStyles: { fillColor: primaryColor, textColor: whiteColor, fontStyle: 'bold' }, columnStyles: { 1: { halign: 'right' } } });
        lastY = (doc as any).lastAutoTable.finalY + 10;
    }

    if (reportOptions.fuelStock) {
      autoTable(doc, {
        startY: lastY,
        head: [['Fuel Type', 'Stock as of Date (L)', 'Stock Value (Cost) (INR)']],
        body: financialData.tanksWithHistoricalStock.map(tank => {
          const fuel = settings.fuels.find(f => f.id === tank.fuelId);
          if (!fuel) return ['Unknown', { content: '0 L' }, { content: '0.00' }];
          const { costPrice } = getFuelPricesForDate(tank.fuelId, formatDate(selectedDate, 'yyyy-MM-dd'), settings.fuelPriceHistory, { sellingPrice: fuel.price, costPrice: fuel.cost });
          const stockLtrs = tank.historicalStock.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
          return [fuel.name, { content: `${stockLtrs} L`, styles: { halign: 'right' } }, { content: formatNum(tank.historicalStock * costPrice), styles: { halign: 'right' } }];
        }),
        theme: 'striped', headStyles: { fillColor: primaryColor, textColor: whiteColor, fontStyle: 'bold' }, columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      });
      lastY = (doc as any).lastAutoTable.finalY + 10;
    }
    
    if (reportOptions.recentPurchases && financialData.recentPurchases.length > 0) {
      autoTable(doc, {
        startY: lastY,
        head: [['Recent Fuel Purchases', 'Date', 'Quantity (L)', 'Amount (INR)']],
        body: financialData.recentPurchases.map(p => [ settings.fuels.find(f => f.id === p.fuelId)?.name || 'Unknown', formatDate(parseISO(p.date), 'dd-MM-yy'), { content: p.quantity.toLocaleString(), styles: { halign: 'right' } }, { content: formatNum(p.amount), styles: { halign: 'right' } } ]),
        theme: 'striped', headStyles: { fillColor: primaryColor, textColor: whiteColor, fontStyle: 'bold' }, columnStyles: { 0: { cellWidth: 50 }, 2: { halign: 'right' }, 3: { halign: 'right' } },
      });
      lastY = (doc as any).lastAutoTable.finalY + 10;
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150); doc.text(`Page ${i} of ${pageCount} | Generated by PetroVisor`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }
    
    doc.save(`PetroVisor_Summary_${formatDate(selectedDate, 'yyyy-MM-dd')}.pdf`);
    toast({ title: 'Success', description: 'PDF download initiated!' });
  };
  
  const isDownloadDisabled = !reportOptions.financialPosition && !reportOptions.fuelStock && !reportOptions.recentPurchases;

  return (
    <AppLayout>
      <PageHeader title="Download Summary Report" description="Generate a PDF summary of your financial and stock position for a specific date."/>
      <div className="p-4 md:p-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader><CardTitle className="font-headline">Report Customization</CardTitle><CardDescription>Select the date and sections you want to include in your PDF report.</CardDescription></CardHeader>
          <CardContent className="w-full space-y-6">
             <div className="space-y-4 rounded-md border p-4">
                <h4 className="text-sm font-medium">Report Settings</h4>
                <div className="space-y-4">
                    <div>
                        <Label>Report Date</Label>
                         <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal mt-1",
                                !selectedDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? formatDate(selectedDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={setSelectedDate}
                              disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="letterhead-switch" className="flex flex-col space-y-1">
                          <span>Print on Letterhead</span>
                          <span className="font-normal leading-snug text-muted-foreground text-xs">Formats the report for official use.</span>
                        </Label>
                        <Switch id="letterhead-switch" checked={printOnLetterhead} onCheckedChange={setPrintOnLetterhead} />
                    </div>
                </div>
            </div>
             <div className="space-y-4 rounded-md border p-4">
                <h4 className="text-sm font-medium">Report Content</h4>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="financial-switch" className="flex flex-col space-y-1">
                            <span>Financial Position</span>
                            <span className="font-normal leading-snug text-muted-foreground text-xs">Net worth, bank balances, and outstanding credit.</span>
                        </Label>
                        <Switch id="financial-switch" checked={reportOptions.financialPosition} onCheckedChange={(val) => setReportOptions(p => ({ ...p, financialPosition: val }))} />
                    </div>
                     {reportOptions.financialPosition && (
                        <div className="pl-6 pt-2 pb-2 border-l-2 ml-2 space-y-2">
                            <Label className="font-semibold text-xs uppercase">Include Accounts</Label>
                            {(settings?.bankAccounts || []).map(account => (
                                <div key={account.id} className="flex items-center space-x-3">
                                    <Checkbox
                                        id={`account-check-${account.id}`}
                                        checked={selectedAccountIds[account.id] ?? false}
                                        onCheckedChange={(checked) => {
                                            setSelectedAccountIds(prev => ({ ...prev, [account.id]: !!checked }));
                                        }}
                                    />
                                    <label
                                        htmlFor={`account-check-${account.id}`}
                                        className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {account.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <Label htmlFor="stock-switch" className="flex flex-col space-y-1">
                            <span>Fuel Stock Details</span>
                            <span className="font-normal leading-snug text-muted-foreground text-xs">Current stock levels and value for each tank.</span>
                        </Label>
                        <Switch id="stock-switch" checked={reportOptions.fuelStock} onCheckedChange={(val) => setReportOptions(p => ({ ...p, fuelStock: val }))} />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="purchases-switch" className="flex flex-col space-y-1">
                            <span>Recent Purchases</span>
                            <span className="font-normal leading-snug text-muted-foreground text-xs">A list of the last 5 fuel purchases.</span>
                        </Label>
                        <Switch id="purchases-switch" checked={reportOptions.recentPurchases} onCheckedChange={(val) => setReportOptions(p => ({ ...p, recentPurchases: val }))} />
                    </div>
                </div>
            </div>

            <Button onClick={handleDownloadPdf} className="w-full" disabled={isDownloadDisabled || !selectedDate}>
                <Download className="mr-2 h-4 w-4" />Download PDF Summary
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
