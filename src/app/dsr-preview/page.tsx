
'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, getFuelPricesForDate } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Download } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// This helper is specific to the PDF generation due to font limitations.
const formatCurrencyForPdf = (amount: number) => {
  // jsPDF's default fonts don't support the Rupee symbol (₹).
  // Using "Rs." as a fallback to ensure correct display in the PDF.
  return `Rs. ${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
};

export default function DsrPreviewPage() {
  const { settings, deleteShiftReport } = useAppState();
  const { toast } = useToast();

  const shiftReports = React.useMemo(() => {
    return settings?.shiftReports?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];
  }, [settings?.shiftReports]);

  const getEmployeeName = (id: string) => {
    return settings?.employees.find(e => e.id === id)?.name || 'Unknown Employee';
  };

  const handleDelete = (reportId: string) => {
    deleteShiftReport(reportId);
    toast({ title: 'Success', description: 'Shift report and all associated transactions have been deleted.' });
  };

  const handleDownloadPdf = () => {
    if (!settings || !shiftReports || shiftReports.length === 0) {
      toast({ title: "No Data", description: "There are no reports to download.", variant: "destructive" });
      return;
    }

    const doc = new jsPDF();

    shiftReports.forEach((report, reportIndex) => {
      if (reportIndex > 0) {
        doc.addPage();
      }

      let lastY = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      const contentWidth = pageWidth - (margin * 2);

      // --- LETTERHEAD ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text(settings.pumpName || 'PetroVisor Station', pageWidth / 2, lastY, { align: 'center' });
      lastY += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Dealer: Indian Oil Corporation Limited', pageWidth / 2, lastY, { align: 'center' });
      lastY += 4;
      doc.text('P.S. -Talsara, Dist. - Sundargarh, Odisha', pageWidth / 2, lastY, { align: 'center' });
      lastY += 10;

      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.2);
      doc.line(margin, lastY, pageWidth - margin, lastY);
      lastY += 8;

      // --- REPORT HEADER ---
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(`Daily Shift Report`, margin, lastY);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const reportDateStr = `Date: ${format(parseISO(report.date), 'dd MMMM yyyy')} (${report.shiftType.toUpperCase()})`;
      doc.text(reportDateStr, pageWidth - margin, lastY, { align: 'right' });
      lastY += 6;

      const employeeName = getEmployeeName(report.employeeId);
      doc.text(`Employee: ${employeeName}`, margin, lastY);
      lastY += 10;

      // --- FUEL SALES ---
      const readingsByFuel = new Map<string, typeof report.meterReadings>();
      report.meterReadings.forEach(reading => {
        if (!readingsByFuel.has(reading.fuelId)) {
          readingsByFuel.set(reading.fuelId, []);
        }
        readingsByFuel.get(reading.fuelId)!.push(reading);
      });

      for (const [fuelId, readings] of readingsByFuel.entries()) {
        const fuel = settings.fuels.find(f => f.id === fuelId);
        if (!fuel) continue;

        const { sellingPrice } = getFuelPricesForDate(fuel.id, report.date, settings.fuelPriceHistory, { sellingPrice: fuel.price, costPrice: fuel.cost });
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`${fuel.name} Sales (Rate: ${formatCurrencyForPdf(sellingPrice)})`, margin, lastY);
        
        autoTable(doc, {
          startY: lastY + 2,
          head: [['Nozzle', 'Opening', 'Closing', 'Testing', 'Sale (L)', 'Sale (₹)']],
          body: readings.map(r => [
            r.nozzleId.toString(),
            r.opening.toFixed(2),
            r.closing.toFixed(2),
            r.testing.toFixed(2),
            r.saleLitres.toFixed(2),
            formatCurrencyForPdf(r.saleAmount)
          ]),
          theme: 'grid',
          headStyles: { fillColor: '#f4f4f5', textColor: '#141414', fontStyle: 'bold', fontSize: 9, cellPadding: 1.5 },
          bodyStyles: { fontSize: 8.5, cellPadding: 1.5 },
          margin: { left: margin, right: margin },
          columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 30, halign: 'right' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 25, halign: 'right' },
            4: { cellWidth: 30, halign: 'right' },
            5: { cellWidth: 'auto', halign: 'right' },
          }
        });
        lastY = (doc as any).lastAutoTable.finalY + 8;
      }
      
      // --- FINANCIAL SUMMARY & CREDIT DETAILS (Two-Column Layout) ---
      let totalCreditSales = 0;
      let creditDetails: { customerName: string, amount: number }[] = [];
      if (Array.isArray(report.creditSales) && report.creditSales.length > 0) {
        totalCreditSales = report.creditSales.reduce((sum, s) => sum + s.amount, 0);
        creditDetails = report.creditSales.map(sale => ({
            customerName: settings.customers.find(c => c.id === sale.customerId)?.name || 'Unknown',
            amount: sale.amount,
        }));
      } else if (typeof (report as any).creditSales === 'number' && (report as any).creditSales > 0) {
        totalCreditSales = (report as any).creditSales;
        creditDetails = [{ customerName: 'Legacy Entry', amount: totalCreditSales }];
      }
      const totalFuelSales = report.totalSales - (report.lubeSaleAmount || 0);

      const financialSummaryBody: any[] = [
        [{content: 'Financial Summary', colSpan: 2, styles: {fontStyle: 'bold', fontSize: 10, halign: 'left'}}],
        ['Total Fuel Sales', formatCurrencyForPdf(totalFuelSales)],
      ];
      if (report.lubeSaleAmount && report.lubeSaleAmount > 0) {
        financialSummaryBody.push([`Lube Sale (${report.lubeSaleName || 'N/A'})`, formatCurrencyForPdf(report.lubeSaleAmount)]);
      }
      financialSummaryBody.push([
        { content: 'Gross Total Sales', styles: { fontStyle: 'bold' } },
        { content: formatCurrencyForPdf(report.totalSales), styles: { fontStyle: 'bold' } }
      ]);
      financialSummaryBody.push([
          { content: 'Less: Online Payments', styles: {textColor: '#ef4444'} },
          { content: `(${formatCurrencyForPdf(report.onlinePayments)})`, styles: {textColor: '#ef4444'} }
      ]);
      financialSummaryBody.push([
          { content: 'Less: Credit Sales', styles: {textColor: '#ef4444'} },
          { content: `(${formatCurrencyForPdf(totalCreditSales)})`, styles: {textColor: '#ef4444'} }
      ]);
      financialSummaryBody.push([
        { content: 'Net Cash In Hand', styles: { fontStyle: 'bold', fillColor: '#dcfce7', textColor: '#166534' } },
        { content: formatCurrencyForPdf(report.cashInHand), styles: { fontStyle: 'bold', fillColor: '#dcfce7', textColor: '#166534' } }
      ]);

      const creditDetailsBody: any[] = [];
      if (creditDetails.length > 0) {
          creditDetailsBody.push([{content: 'Credit Sale Details', colSpan: 2, styles: {fontStyle: 'bold', fontSize: 10, halign: 'left'}}]);
          creditDetails.forEach(cd => {
              creditDetailsBody.push([cd.customerName, formatCurrencyForPdf(cd.amount)]);
          });
      }

      // Check for page overflow
      const financialTableHeight = financialSummaryBody.length * 7;
      const creditTableHeight = creditDetailsBody.length * 7;
      if (lastY + Math.max(financialTableHeight, creditTableHeight) > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        lastY = 15;
      }

      autoTable(doc, {
          startY: lastY,
          body: financialSummaryBody,
          theme: 'plain',
          bodyStyles: {fontSize: 9, cellPadding: 1.5},
          columnStyles: {1: {halign: 'right'}},
          tableWidth: contentWidth / 2 - 5,
          margin: { left: margin },
      });

      if (creditDetailsBody.length > 0) {
           autoTable(doc, {
              startY: lastY,
              body: creditDetailsBody,
              theme: 'plain',
              bodyStyles: {fontSize: 9, cellPadding: 1.5},
              columnStyles: {1: {halign: 'right'}},
              tableWidth: contentWidth / 2 - 5,
              margin: { left: margin + contentWidth / 2 + 5 },
          });
      }
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount} | Generated by PetroVisor`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    doc.save(`PetroVisor_DSR_History_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast({ title: 'Success', description: 'PDF download initiated!' });
  };

  return (
    <AppLayout>
      <PageHeader
        title="DSR Preview"
        description="A recorded preview of all submitted shift reports."
      >
        <Button onClick={handleDownloadPdf}>
            <Download className="mr-2 h-4 w-4" />
            Download PDF
        </Button>
      </PageHeader>
      <div className="p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Shift Report History</CardTitle>
            <CardDescription>
              Here is a complete log of all shift reports submitted by your employees.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {shiftReports.length === 0 ? (
              <div className="border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No shift reports have been submitted yet.</p>
                <Button asChild variant="link">
                  <Link href="/shift-report">Submit your first shift report</Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Credit Sales</TableHead>
                    <TableHead className="text-right">Online Payments</TableHead>
                    <TableHead className="text-right">Cash In Hand</TableHead>
                    <TableHead className="text-right w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftReports.map(report => {
                    let totalCreditSales = 0;
                    if (Array.isArray(report.creditSales)) {
                        totalCreditSales = (report.creditSales || []).reduce((sum, sale) => sum + sale.amount, 0);
                    } else if (typeof (report as any).creditSales === 'number') {
                        totalCreditSales = (report as any).creditSales;
                    }

                    return (
                        <TableRow key={report.id}>
                        <TableCell className="font-medium">{format(parseISO(report.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>
                            <Badge variant={report.shiftType === 'day' ? 'default' : 'secondary'} className="capitalize">
                            {report.shiftType}
                            </Badge>
                        </TableCell>
                        <TableCell>{getEmployeeName(report.employeeId)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(report.totalSales)}</TableCell>
                        <TableCell className="text-right text-destructive">{formatCurrency(totalCreditSales)}</TableCell>
                        <TableCell className="text-right text-blue-600">{formatCurrency(report.onlinePayments)}</TableCell>
                        <TableCell className="text-right font-semibold text-primary">{formatCurrency(report.cashInHand)}</TableCell>
                        <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                    <Link href={`/shift-report?id=${report.id}`}>
                                        <Pencil className="h-4 w-4" />
                                    </Link>
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Shift Report?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This will permanently delete this shift report and reverse all associated financial and stock transactions. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(report.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </TableCell>
                        </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
