
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
    let lastY = 15;

    doc.setFontSize(18);
    doc.text("Shift Report History", doc.internal.pageSize.getWidth() / 2, lastY, { align: 'center' });
    lastY += 8;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), 'dd MMM yyyy, h:mm a')}`, doc.internal.pageSize.getWidth() / 2, lastY, { align: 'center' });
    lastY += 12;

    shiftReports.forEach((report, reportIndex) => {
      if (lastY > 250) {
        doc.addPage();
        lastY = 15;
      }
      
      if (reportIndex > 0) {
        doc.setDrawColor(221, 221, 221);
        doc.setLineWidth(0.3);
        doc.line(14, lastY, doc.internal.pageSize.getWidth() - 14, lastY);
        lastY += 10;
      }

      const employeeName = getEmployeeName(report.employeeId);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0,0,0);
      doc.text(`Shift Report: ${format(parseISO(report.date), 'dd MMMM yyyy')} (${report.shiftType.toUpperCase()})`, 14, lastY);
      lastY += 6;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Employee: ${employeeName}`, 14, lastY);
      lastY += 8;

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
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`${fuel.name} Sales (Rate: ${formatCurrency(sellingPrice)})`, 14, lastY);
        lastY += 1;
        
        autoTable(doc, {
          startY: lastY,
          head: [['Nozzle', 'Opening', 'Closing', 'Testing', 'Sale (L)', 'Sale (₹)']],
          body: readings.map(r => [
            r.nozzleId.toString(),
            r.opening.toFixed(2),
            r.closing.toFixed(2),
            r.testing.toFixed(2),
            r.saleLitres.toFixed(2),
            formatCurrency(r.saleAmount)
          ]),
          theme: 'grid',
          headStyles: { fillColor: '#f4f4f5', textColor: '#141414', fontStyle: 'normal', fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          columnStyles: {
            0: { halign: 'center' },
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' },
          }
        });
        lastY = (doc as any).lastAutoTable.finalY + 8;
      }

      let totalCreditSales = 0;
      let creditDetails = '';
      if (Array.isArray(report.creditSales) && report.creditSales.length > 0) {
        totalCreditSales = report.creditSales.reduce((sum, s) => sum + s.amount, 0);
        creditDetails = report.creditSales.map(sale => {
            const customerName = settings.customers.find(c => c.id === sale.customerId)?.name || 'Unknown';
            return `  - ${customerName}: ${formatCurrency(sale.amount)}`;
        }).join('\n');
      } else if (typeof report.creditSales === 'number' && report.creditSales > 0) {
        totalCreditSales = report.creditSales;
        creditDetails = '  - Legacy Entry';
      }

      const financialBody: any[] = [];
      financialBody.push([
        { content: 'Total Fuel Sales', styles: { fontStyle: 'bold' } },
        { content: formatCurrency(report.totalSales - (report.lubeSaleAmount || 0)), styles: { halign: 'right' } }
      ]);
      
      if (report.lubeSaleAmount && report.lubeSaleAmount > 0) {
        financialBody.push([`Lube Sale (${report.lubeSaleName || 'N/A'})`, { content: formatCurrency(report.lubeSaleAmount), styles: { halign: 'right' } }]);
      }

      financialBody.push([
        { content: 'Gross Total Sales', styles: { fontStyle: 'bold', fillColor: '#f4f4f5' } },
        { content: formatCurrency(report.totalSales), styles: { fontStyle: 'bold', halign: 'right', fillColor: '#f4f4f5' } }
      ]);

      if (totalCreditSales > 0) {
        financialBody.push([{ content: 'Credit Sales\n' + creditDetails, styles: { cellPadding: { top: 2, right: 2, bottom: 4, left: 2 } } }, { content: `(${formatCurrency(totalCreditSales)})`, styles: { halign: 'right', fontStyle: 'bold' } }]);
      }

      financialBody.push(['Online Payments', { content: `(${formatCurrency(report.onlinePayments)})`, styles: { halign: 'right', fontStyle: 'bold' } }]);
      
      financialBody.push([
        { content: 'Net Cash In Hand', styles: { fontStyle: 'bold', fillColor: '#dcfce7', textColor: '#166534' } },
        { content: formatCurrency(report.cashInHand), styles: { fontStyle: 'bold', halign: 'right', fillColor: '#dcfce7', textColor: '#166534' } }
      ]);
      
      autoTable(doc, {
        startY: lastY,
        head: [['Financial Summary', '']],
        body: financialBody,
        theme: 'grid',
        headStyles: { fillColor: '#3f3f46', textColor: '#ffffff' },
        bodyStyles: { fontSize: 9 },
      });
      lastY = (doc as any).lastAutoTable.finalY + 15;
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
