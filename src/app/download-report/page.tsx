
'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, getFuelPricesForDate } from '@/lib/utils';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { useMemo, useState } from 'react';
import { format as formatDate, parseISO } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function DownloadReportPage() {
  const { settings } = useAppState();
  const { toast } = useToast();
  const [printOnLetterhead, setPrintOnLetterhead] = useState(false);
  const [reportOptions, setReportOptions] = useState({
    financialPosition: true,
    fuelStock: true,
    recentPurchases: true,
  });


  const financialData = useMemo(() => {
    if (!settings) return null;

    const today = formatDate(new Date(), 'yyyy-MM-dd');
    const totalStockValue = settings.tanks.reduce((total, tank) => {
      const fuel = settings.fuels.find(f => f.id === tank.fuelId);
      if (!fuel) return total;
      const { costPrice } = getFuelPricesForDate(tank.fuelId, today, settings.fuelPriceHistory, { sellingPrice: fuel.price, costPrice: fuel.cost });
      return total + (tank.initialStock * costPrice);
    }, 0);

    const currentOutstandingCredit = (settings.creditHistory || []).reduce((acc, tx) => (tx.type === 'given' ? acc + tx.amount : acc - tx.amount), 0);
    
    const accountBalances = (settings.bankAccounts || []).map(account => {
        const balance = (settings.bankLedger || []).filter(tx => tx.accountId === account.id).reduce((acc, tx) => (tx.type === 'credit' ? acc + tx.amount : acc - tx.amount), account.initialBalance);
        return { ...account, currentBalance: balance };
    });
    
    const totalBankBalance = accountBalances.reduce((sum, acc) => sum + acc.currentBalance, 0);
    const overdraftAccount = settings.bankAccounts.find(acc => acc.isOverdraft) || settings.bankAccounts[0];

    const netManagerBalance = (settings.managerLedger || []).reduce((acc, tx) => (tx.type === 'payment_from_manager' ? acc + tx.amount : acc - tx.amount), settings.managerInitialBalance || 0);

    const recentPurchases = (settings.purchases || []).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    const netWorth = totalStockValue + currentOutstandingCredit + totalBankBalance + netManagerBalance;
    const sanctionedAmount = overdraftAccount?.sanctionedAmount || 0;
    const remainingLimit = netWorth - sanctionedAmount;
    
    return { totalStockValue, currentOutstandingCredit, accountBalances, netManagerBalance, recentPurchases, netWorth, sanctionedAmount, remainingLimit };
  }, [settings]);

  const handleDownloadPdf = () => {
    if (!settings || !financialData) { toast({ title: 'Error', description: 'Application data not loaded.', variant: 'destructive' }); return; }
    
    const doc = new jsPDF();
    const today = new Date();
    const formattedDateTime = formatDate(today, 'dd MMM yyyy, h:mm:ss a');
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
        currentY = 42;
        doc.setDrawColor(180, 180, 180); doc.setLineWidth(0.2); doc.line(startX, currentY, endX, currentY); currentY += 0.7; doc.line(startX, currentY, endX, currentY);
        lastY = currentY + 8;
        doc.setTextColor(0,0,0);
    } else {
        doc.setFillColor(primaryColor); doc.rect(0, 0, pageWidth, 35, 'F');
        doc.setTextColor(whiteColor); doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text(settings.pumpName || 'PetroVisor Station', 14, 18);
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(`Report Generated: ${formattedDateTime}`, pageWidth - 14, 18, { align: 'right' });
        lastY = 45;
    }

    if (reportOptions.financialPosition) {
        const financialBody = [
            [{ content: 'Sanctioned Amount', styles: { fontStyle: 'bold' } }, { content: formatNum(financialData.sanctionedAmount), styles: { halign: 'right' } }],
            ['Total Stock Value (Cost)', { content: formatNum(financialData.totalStockValue), styles: { halign: 'right' } }],
            ['Credit Outstanding', { content: formatNum(financialData.currentOutstandingCredit), styles: { halign: 'right' } }],
            ...financialData.accountBalances.map(acc => [ `Bank: ${acc.name}`, { content: formatNum(acc.currentBalance), styles: { halign: 'right' } } ]),
            ['Net Manager Balance', { content: formatNum(financialData.netManagerBalance), styles: { halign: 'right', textColor: financialData.netManagerBalance >= 0 ? undefined : negativeColor } }],
            [{ content: 'Net Worth', styles: { fontStyle: 'bold', fillColor: lightGrey } }, { content: formatNum(financialData.netWorth), styles: { fontStyle: 'bold', halign: 'right', fillColor: lightGrey } }],
            [{ content: 'Remaining Limit', styles: { fontStyle: 'bold', textColor: financialData.remainingLimit >= 0 ? negativeColor : positiveColor } }, { content: formatNum(financialData.remainingLimit), styles: { fontStyle: 'bold', halign: 'right', textColor: financialData.remainingLimit >= 0 ? negativeColor : positiveColor } }],
        ];
        autoTable(doc, { startY: lastY, head: [['Financial Position', 'Amount (INR)']], body: financialBody, theme: 'grid', headStyles: { fillColor: primaryColor, textColor: whiteColor, fontStyle: 'bold' }, columnStyles: { 1: { halign: 'right' } } });
        lastY = (doc as any).lastAutoTable.finalY + 10;
    }

    if (reportOptions.fuelStock) {
        autoTable(doc, {
          startY: lastY,
          head: [['Fuel Type', 'Current Stock (Ltrs)', 'Stock Value (Cost) (INR)']],
          body: settings.tanks.map(tank => {
            const fuel = settings.fuels.find(f => f.id === tank.fuelId);
            if (!fuel) return ['Unknown', { content: '0 L' }, { content: '0.00' }];
            const { costPrice } = getFuelPricesForDate(tank.fuelId, formatDate(today, 'yyyy-MM-dd'), settings.fuelPriceHistory, { sellingPrice: fuel.price, costPrice: fuel.cost });
            return [fuel.name, { content: `${tank.initialStock.toLocaleString()} L`, styles: { halign: 'right' } }, { content: formatNum(tank.initialStock * costPrice), styles: { halign: 'right' } }];
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
    
    doc.save(`PetroVisor_Summary_${formatDate(today, 'yyyy-MM-dd_HH-mm-ss')}.pdf`);
    toast({ title: 'Success', description: 'PDF download initiated!' });
  };
  
  const isDownloadDisabled = !reportOptions.financialPosition && !reportOptions.fuelStock && !reportOptions.recentPurchases;

  return (
    <AppLayout>
      <PageHeader title="Download Summary Report" description="Generate a PDF summary of your current financial and stock position."/>
      <div className="p-4 md:p-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader><CardTitle className="font-headline">Report Customization</CardTitle><CardDescription>Select the sections you want to include in your PDF report.</CardDescription></CardHeader>
          <CardContent className="w-full space-y-6">
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

            <div className="space-y-4 rounded-md border p-4">
                <h4 className="text-sm font-medium">Formatting</h4>
                <div className="flex items-center justify-between">
                    <Label htmlFor="letterhead-switch">Print on Letterhead</Label>
                    <Switch id="letterhead-switch" checked={printOnLetterhead} onCheckedChange={setPrintOnLetterhead} />
                </div>
            </div>

            <Button onClick={handleDownloadPdf} className="w-full" disabled={isDownloadDisabled}>
                <Download className="mr-2 h-4 w-4" />Download PDF Summary
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
