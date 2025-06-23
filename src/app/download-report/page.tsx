'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency } from '@/lib/utils';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { useMemo } from 'react';
import { format as formatDate, parseISO } from 'date-fns';

export default function DownloadReportPage() {
  const { settings } = useAppState();
  const { toast } = useToast();

  const financialData = useMemo(() => {
    if (!settings) {
      return null;
    }

    const totalStockValue = settings.tanks.reduce((total, tank) => {
      const fuel = settings.fuels.find(f => f.id === tank.fuelId);
      // NOTE: Using cost for stock value based on initial stock.
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
      return acc - tx.amount;
    }, initialBankBalance);

    const miscCollections = settings.miscCollections || [];
    const totalMiscCollections = miscCollections.reduce((acc, c) => acc + c.amount, 0);

    const netWorth = totalStockValue + currentOutstandingCredit + totalMiscCollections + currentBankBalance;
    const sanctionedAmount = settings.sanctionedAmount || 0;
    const remainingLimit = sanctionedAmount - netWorth;
    
    return { 
      totalStockValue, 
      currentOutstandingCredit, 
      currentBankBalance, 
      totalMiscCollections,
      netWorth, 
      sanctionedAmount,
      remainingLimit 
    };
  }, [settings]);

  const handleDownloadPdf = () => {
    if (!settings || !financialData) {
      toast({ title: 'Error', description: 'Application data not loaded yet.', variant: 'destructive' });
      return;
    }

    const doc = new jsPDF();
    const today = new Date();
    const formattedDate = formatDate(today, 'dd MMM yyyy');

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(settings.pumpName || 'Petro Manage Station', 14, 22);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Financial & Stock Summary', 14, 30);
    doc.setFontSize(10);
    doc.text(`Report Generated: ${formattedDate}`, 14, 36);

    let lastY = 45;

    // Financial Position
    autoTable(doc, {
      startY: lastY,
      head: [['Financial Position']],
      body: [
        ['Sanctioned Amount', formatCurrency(financialData.sanctionedAmount)],
        ['Total Stock Value (Cost)', formatCurrency(financialData.totalStockValue)],
        ['Credit Outstanding', formatCurrency(financialData.currentOutstandingCredit)],
        ['Miscellaneous Collections', formatCurrency(financialData.totalMiscCollections)],
        ['Current Bank Balance', formatCurrency(financialData.currentBankBalance)],
        [{ content: 'Net Worth', styles: { fontStyle: 'bold' } }, { content: formatCurrency(financialData.netWorth), styles: { fontStyle: 'bold' } }],
        ['Remaining Limit', formatCurrency(financialData.remainingLimit)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [0, 128, 128] }, // Teal color
    });
    lastY = (doc as any).lastAutoTable.finalY + 10;

    // Fuel Stock Position
    autoTable(doc, {
      startY: lastY,
      head: [['Fuel Type', 'Current Stock (Ltrs)', 'Stock Value (Cost)']],
      body: settings.tanks.map(tank => {
        const fuel = settings.fuels.find(f => f.id === tank.fuelId);
        const stockValue = tank.initialStock * (fuel?.cost || 0);
        return [
          fuel?.name || 'Unknown',
          `${tank.initialStock.toLocaleString()} L`,
          formatCurrency(stockValue),
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: [0, 128, 128] },
    });
    lastY = (doc as any).lastAutoTable.finalY + 10;
    
    // Latest Monthly Sales Summary
    if (settings.monthlyReports && settings.monthlyReports.length > 0) {
      // Assuming reports are sorted descending by date
      const latestReport = settings.monthlyReports[0];
      autoTable(doc, {
        startY: lastY,
        head: [[`Latest Monthly Sales Summary (Month Ending: ${formatDate(parseISO(latestReport.endDate), 'dd MMM yyyy')})`]],
        body: [
            ['Total Sales', formatCurrency(latestReport.totalSales)],
            ['Estimated Profit', formatCurrency(latestReport.estProfit)],
            ['Net Cash from Sales', formatCurrency(latestReport.netCash)],
            ['Bank Deposits This Month', formatCurrency(latestReport.bankDeposits)],
            ['Credit Sales This Month', formatCurrency(latestReport.creditSales)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [0, 128, 128] },
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
        doc.text('Generated by Petro Manage', 14, doc.internal.pageSize.height - 10);
    }
    
    doc.save(`PetroManage_Summary_${formatDate(today, 'yyyy-MM-dd')}.pdf`);
    toast({ title: 'Success', description: 'PDF download initiated!' });
  };

  return (
    <AppLayout>
      <PageHeader
        title="Download Summary Report"
        description="Generate a PDF summary of your current financial and stock position."
      />
      <div className="p-4 md:p-8">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Generate Report</CardTitle>
            <CardDescription>
              Click the button below to download a comprehensive PDF document summarizing your station's key metrics.
              This includes financial standing, live fuel stock values, and a summary of the latest monthly sales report if available.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={handleDownloadPdf}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF Summary
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
