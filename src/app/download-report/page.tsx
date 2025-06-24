
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
import { useMemo, useState } from 'react';
import { format as formatDate, parseISO } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function DownloadReportPage() {
  const { settings } = useAppState();
  const { toast } = useToast();
  const [printOnLetterhead, setPrintOnLetterhead] = useState(false);

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
    
    let lastY = 15;

    if (printOnLetterhead) {
        // --- Indian Oil Logo (Verified Stable Base64) ---
        const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJgAAAA+CAMAAAByv6b/AAAAaVBMVEX////9/fr9+fj89vD9+Pb+/Pz89vP89O79+PX9+ff78+j9+/v8+fT99vD88uj78ef99/L669766Nv55Nb34cr13Mf12sP02L3y0bny0LXvzK/ux6buwqjrwKLovZ7mtq3ns6XloZrllpG3joiwZ823AAAC/0lEQVR42uya65qrIBBGJ8EiyqJ4EBAE3P9tLpISaifU5nA9T3u/Dq2Qnplep7U3AwAAAAAAAAAAAAAAAAA/xJ4uPZzHH4/H4/Hj53L+z4uf19fX//vV6+vX1/d3zp/vP9/f7+/vV8+3r/cPd/93vP98f7r9/ePj453P/54vX9/d7u/vXz5ff35+f399+/r69v7u9b9s/L58uf35u375c//z5eP1+vX7t35f79/++f7t5fvv/9+3f/78eX9+/vj4/Pv5/b0sA2s3p/P57eX7+9W+v778+Pjy/vXy+f7t5d28/PP+/fP7t5d/+fn+/fX95Y+X13f3S1/f3e7vl/8v35/+Xv7+fPn8+fHh+eW3fPn/efnzp+eXT/z2+/P3x8eXx+d3x5eXf35+vPz0/u7u6e2l+eeXz/evr9/uX5+/fnu5v3/+/fX54+Pl9dvLty/fvl5e3909wY9/+ePl/efH+7f3l/efb2/vl48v7+7uXt5d3s0v3+7f3t5d3t3v7u4efv78eHl/e3f/9v7t7eXj/fvr9/s3Zt6/P//79w/60u8/Pz9/fny8fP3+9fX9+ePj48v7u7unsxf4/+fn+7f/vPz5d/7++f7z+8v3l+9/+fn++//719c/+v7++eMbeL18v799+/j4/L9/e3/3dnb6/z4/v33//Pb+5e7r9/c/+eXj48vj4+O3d/fP9+9vj+9v797e3f+dPz9+/3b/x8fH++f799d39+9/fn5/f3//fvv88eH57eX9++vr+/u7+/c//79+/7b+x8e357cfz+/unh7u7p5e3t3f3T3dAAD/LczL0+d//uX++fnj49v716//8fH5x8fH9+9//n75cvv75Y9/fHx+fnu/fL/9+f7x8fn57eX7+7f3r88vX748v7t7+vr48sP7u7u7u7u7u7u7u3v48u7u7u7+8eH93ePl/ePl6+3l/d29gL/z+f/Dx/u389v7x/u3l/fL/9+//fzx4eX9z+9/fl/e3e/u7h7e397/Pz8/v1/9AAAAAAAAAAAAAAAAAPA/+gFq9m2qU2sUpgAAAABJRU5ErkJggg==';

        // --- Letterhead Header ---
        const startX = 14;
        const endX = pageWidth - 14;
        let currentY = 18;

        // Left side: Logo
        doc.addImage(logoBase64, 'PNG', startX, currentY - 8, 30, 10);

        // Right side: Company Details
        const detailsX = 55;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('M/S. OM SRIMAA SANTOSHI FUEL', detailsX, currentY - 5);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('Dealer: Indian Oil Corporation Limited', detailsX, currentY + 2);
        doc.text('P.S. -Talsara, Dist. - Sundargarh, Odisha', detailsX, currentY + 7);
        doc.text('Mob: 9437083729', detailsX, currentY + 12);
        
        currentY = 42;
        // Draw lines
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.2);
        doc.line(startX, currentY, endX, currentY);
        currentY += 0.7;
        doc.line(startX, currentY, endX, currentY);

        lastY = currentY + 8;
        
        // Reset colors for the rest of the document
        doc.setTextColor(0,0,0);
    } else {
        // --- Standard Header ---
        doc.setFillColor(primaryColor);
        doc.rect(0, 0, pageWidth, 35, 'F');
        
        doc.setTextColor(whiteColor);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text(settings.pumpName || 'PetroVisor Station', 14, 18);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Report Generated: ${formattedDate}`, pageWidth - 14, 18, { align: 'right' });
        
        lastY = 45;
    }

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
          <CardContent className="flex flex-col items-center gap-4">
             <div className="flex items-center space-x-2">
                <Switch
                    id="letterhead-switch"
                    checked={printOnLetterhead}
                    onCheckedChange={setPrintOnLetterhead}
                />
                <Label htmlFor="letterhead-switch">Print on Letterhead</Label>
            </div>
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
