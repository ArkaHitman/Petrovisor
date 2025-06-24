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
      return total + (tank.initialStock * (fuel?.cost || 0));
    }, 0);

    const creditHistory = settings.creditHistory || [];
    const currentOutstandingCredit = creditHistory.reduce((acc, tx) => {
      if (tx.type === 'given') return acc + tx.amount;
      if (tx.type === 'repaid') return acc - tx.amount;
      return acc;
    }, 0);

    const initialBankBalance = settings.initialBankBalance || 0;
    const bankLedger = settings.bankLedger || [];
    const currentBankBalance = bankLedger.reduce((acc, tx) => {
      if (tx.type === 'credit') return acc + tx.amount;
      if (tx.type === 'debit') return acc - tx.amount;
      return acc;
    }, initialBankBalance);

    const miscCollections = settings.miscCollections || [];
    const totalMiscCollections = miscCollections.reduce((acc, c) => acc + c.amount, 0);

    const managerLedger = settings.managerLedger || [];
    const managerInitialBalance = settings.managerInitialBalance || 0;
    const netManagerBalance = managerLedger.reduce((acc, tx) => {
        if (tx.type === 'payment_from_manager') return acc + tx.amount;
        return acc - tx.amount;
    }, managerInitialBalance);

    const recentPurchases = (settings.purchases || [])
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);

    const netWorth = totalStockValue + currentOutstandingCredit + currentBankBalance + netManagerBalance;
    const sanctionedAmount = settings.sanctionedAmount || 0;
    const remainingLimit = sanctionedAmount - netWorth;
    
    return { 
      totalStockValue, 
      currentOutstandingCredit, 
      currentBankBalance, 
      totalMiscCollections,
      netManagerBalance,
      recentPurchases,
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
    const pageWidth = doc.internal.pageSize.getWidth();

    // Helper to format numbers without currency symbol for PDF
    const formatNumberForPdf = (num: number) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(num);
    };

    // Theme Colors
    const primaryColor = '#008080'; // Teal
    const lightGrey = '#F0F2F5';
    const whiteColor = '#FFFFFF';
    const positiveColor = '#22c55e'; // green-500
    const negativeColor = '#ef4444'; // red-500

    // --- Header ---
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(whiteColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text(settings.pumpName || 'PetroVisor Station', 14, 18);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Report Generated: ${formattedDate}`, pageWidth - 14, 18, { align: 'right' });
    
    let lastY = 45;

    // --- Financial Position ---
    const financialBody = [
        ['Sanctioned Amount', { content: formatNumberForPdf(financialData.sanctionedAmount), styles: { halign: 'right' } }],
        ['Total Stock Value (Cost)', { content: formatNumberForPdf(financialData.totalStockValue), styles: { halign: 'right' } }],
        ['Credit Outstanding', { content: formatNumberForPdf(financialData.currentOutstandingCredit), styles: { halign: 'right' } }],
        ['Current Bank Balance', { content: formatNumberForPdf(financialData.currentBankBalance), styles: { halign: 'right' } }],
        ['Net Manager Balance', { content: formatNumberForPdf(financialData.netManagerBalance), styles: { halign: 'right', textColor: financialData.netManagerBalance >= 0 ? undefined : negativeColor } }],
        [
            { content: 'Net Worth', styles: { fontStyle: 'bold', fillColor: lightGrey } },
            { content: formatNumberForPdf(financialData.netWorth), styles: { fontStyle: 'bold', halign: 'right', fillColor: lightGrey } },
        ],
        [
            { content: 'Remaining Limit', styles: { fontStyle: 'bold', textColor: financialData.remainingLimit >= 0 ? positiveColor : negativeColor } },
            { content: formatNumberForPdf(financialData.remainingLimit), styles: { fontStyle: 'bold', halign: 'right', textColor: financialData.remainingLimit >= 0 ? positiveColor : negativeColor } },
        ],
    ];

    autoTable(doc, {
        startY: lastY,
        head: [['Financial Position', 'Amount (INR)']],
        body: financialBody,
        theme: 'grid',
        headStyles: { 
            fillColor: primaryColor, 
            textColor: whiteColor,
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'right' },
        },
    });
    lastY = (doc as any).lastAutoTable.finalY + 10;

    // --- Fuel Stock Position ---
    autoTable(doc, {
      startY: lastY,
      head: [['Fuel Type', 'Current Stock (Ltrs)', 'Stock Value (Cost) (INR)']],
      body: settings.tanks.map(tank => {
        const fuel = settings.fuels.find(f => f.id === tank.fuelId);
        const stockValue = tank.initialStock * (fuel?.cost || 0);
        return [
          fuel?.name || 'Unknown',
          { content: `${tank.initialStock.toLocaleString()} L`, styles: { halign: 'right' } },
          { content: formatNumberForPdf(stockValue), styles: { halign: 'right' } },
        ];
      }),
      theme: 'striped',
      headStyles: { 
          fillColor: primaryColor,
          textColor: whiteColor,
          fontStyle: 'bold'
      },
      columnStyles: {
          1: { halign: 'right' },
          2: { halign: 'right' }
      },
    });
    lastY = (doc as any).lastAutoTable.finalY + 10;
    
    // --- Recent Fuel Purchases ---
    if (financialData.recentPurchases.length > 0) {
      autoTable(doc, {
        startY: lastY,
        head: [['Recent Fuel Purchases', 'Date', 'Quantity (L)', 'Amount (INR)']],
        body: financialData.recentPurchases.map(p => {
          const fuel = settings.fuels.find(f => f.id === p.fuelId);
          return [
            fuel?.name || 'Unknown',
            formatDate(parseISO(p.date), 'dd-MM-yy'),
            { content: p.quantity.toLocaleString(), styles: { halign: 'right' } },
            { content: formatNumberForPdf(p.amount), styles: { halign: 'right' } },
          ];
        }),
        theme: 'striped',
        headStyles: { 
            fillColor: primaryColor,
            textColor: whiteColor,
            fontStyle: 'bold'
        },
        columnStyles: {
            0: { cellWidth: 50 },
            2: { halign: 'right' },
            3: { halign: 'right' },
        },
      });
      lastY = (doc as any).lastAutoTable.finalY + 10;
    }

    // --- Latest Monthly Sales Summary ---
    if (settings.monthlyReports && settings.monthlyReports.length > 0) {
      const latestReport = settings.monthlyReports[0];
      autoTable(doc, {
        startY: lastY,
        head: [[`Latest Sales (Ending: ${formatDate(parseISO(latestReport.endDate), 'dd MMM yyyy')})`, 'Amount (INR)']],
        body: [
            ['Total Sales', { content: formatNumberForPdf(latestReport.totalSales), styles: { halign: 'right' } }],
            ['Estimated Profit', { content: formatNumberForPdf(latestReport.estProfit), styles: { halign: 'right' } }],
            ['Net Cash from Sales', { content: formatNumberForPdf(latestReport.netCash), styles: { halign: 'right' } }],
            ['Bank Deposits This Month', { content: formatNumberForPdf(latestReport.bankDeposits), styles: { halign: 'right' } }],
            ['Credit Sales This Month', { content: formatNumberForPdf(latestReport.creditSales), styles: { halign: 'right' } }],
        ],
        theme: 'grid',
        headStyles: { 
            fillColor: primaryColor,
            textColor: whiteColor,
            fontStyle: 'bold'
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'right' }
        }
      });
    }

    // --- Footer ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount} | Generated by PetroVisor`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
    }
    
    doc.save(`PetroVisor_Summary_${formatDate(today, 'yyyy-MM-dd')}.pdf`);
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
