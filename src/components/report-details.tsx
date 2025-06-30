import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MonthlyReport } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { format, isAfter, parseISO } from 'date-fns';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Separator } from './ui/separator';
import { useAppState } from '@/contexts/app-state-provider';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from './ui/table';

interface ReportDetailsProps {
  report: MonthlyReport;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReportDetails({ report, isOpen, onClose }: ReportDetailsProps) {
    const { settings } = useAppState();

    const reportPeriodPurchases = React.useMemo(() => {
        if (!settings?.purchases || !settings.monthlyReports) return [];
        
        // Reports are sorted descending by endDate, so the next one in the array is the previous one chronologically.
        const reportIndex = settings.monthlyReports.findIndex(r => r.id === report.id);
        const prevReportEndDate = reportIndex > -1 && reportIndex < settings.monthlyReports.length - 1
            ? settings.monthlyReports[reportIndex + 1].endDate
            : null;

        const reportEndDate = parseISO(report.endDate);

        return settings.purchases.filter(p => {
            const purchaseDate = parseISO(p.date);
            // Purchase should be after the previous report's end date.
            const isAfterStartDate = prevReportEndDate ? isAfter(purchaseDate, parseISO(prevReportEndDate)) : true;
            // Purchase should be on or before the current report's end date.
            const isBeforeOrOnEndDate = !isAfter(purchaseDate, reportEndDate);
            return isAfterStartDate && isBeforeOrOnEndDate;
        });
    }, [settings, report]);

    const totalPurchaseValue = reportPeriodPurchases.reduce((sum, p) => sum + p.amount, 0);

    if (!settings) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Report Details</DialogTitle>
          <DialogDescription>
            Showing detailed breakdown for the month ending on {format(parseISO(report.endDate), 'dd MMMM yyyy')}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-4">
            <Card>
                <CardHeader><CardTitle className="font-headline">Overall Summary</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-base">
                    <p>Total Sales: <span className="font-bold font-headline">{formatCurrency(report.totalSales)}</span></p>
                    <p>Total Purchases: <span className="font-bold font-headline">{formatCurrency(totalPurchaseValue)}</span></p>
                    <p>Est. Profit: <span className="font-bold font-headline">{formatCurrency(report.estProfit)}</span></p>
                    <p>Litres Sold: <span className="font-bold font-headline">{report.litresSold.toFixed(2)} L</span></p>
                    <p>Lube Sales: <span className="font-bold font-headline">{formatCurrency(report.lubricantSales)}</span></p>
                    <p>Bank Deposits: <span className="font-bold font-headline">{formatCurrency(report.bankDeposits)}</span></p>
                    <p>Credit Sales: <span className="font-bold font-headline">{formatCurrency(report.creditSales)}</span></p>
                    <p className="text-destructive">Net Cash: <span className="font-bold font-headline">{formatCurrency(report.netCash)}</span></p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="font-headline">Purchases During This Period</CardTitle></CardHeader>
                <CardContent>
                    {reportPeriodPurchases.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Fuel</TableHead>
                                    <TableHead className="text-right">Quantity (L)</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reportPeriodPurchases.map(p => {
                                    const fuel = settings.fuels.find(f => f.id === p.fuelId);
                                    return (
                                        <TableRow key={p.id}>
                                            <TableCell>{format(parseISO(p.date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>{fuel?.name || 'N/A'}</TableCell>
                                            <TableCell className="text-right">{p.quantity.toLocaleString()}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={3} className="text-right font-bold">Total Purchases</TableCell>
                                    <TableCell className="text-right font-bold">{formatCurrency(totalPurchaseValue)}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">No purchases recorded during this report period.</p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="font-headline">Fuel Sale Breakdown</CardTitle></CardHeader>
                <CardContent>
                    <Accordion type="multiple" defaultValue={report.fuelSales.map(fs => fs.fuelId)}>
                        {report.fuelSales.map(fuelSale => {
                            const fuel = settings.fuels.find(f => f.id === fuelSale.fuelId);
                            return (
                                <AccordionItem key={fuelSale.fuelId} value={fuelSale.fuelId}>
                                    <AccordionTrigger className='text-lg font-semibold'>{fuel?.name}</AccordionTrigger>
                                    <AccordionContent className='space-y-4'>
                                        <div className="grid md:grid-cols-3 gap-4 text-sm font-medium p-2 rounded-lg bg-muted">
                                            <p>Total Litres: <span className="font-bold">{fuelSale.totalLitres.toFixed(2)} L</span></p>
                                            <p>Total Sales: <span className="font-bold">{formatCurrency(fuelSale.totalSales)}</span></p>
                                            <p>Est. Profit: <span className="font-bold">{formatCurrency(fuelSale.estProfit)}</span></p>
                                        </div>
                                        <div>
                                            <div className='grid grid-cols-6 gap-2 font-semibold text-sm text-muted-foreground px-2 py-1'>
                                                <span>Nozzle</span>
                                                <span>Opening</span>
                                                <span>Closing</span>
                                                <span>Testing</span>
                                                <span className='text-right'>Litres</span>
                                                <span className='text-right'>Amount</span>
                                            </div>
                                            <Separator className="my-1" />
                                            {fuelSale.readings.map(reading => (
                                                <div key={reading.nozzleId} className='grid grid-cols-6 gap-2 text-sm px-2 py-1'>
                                                    <span>#{reading.nozzleId}</span>
                                                    <span>{reading.opening.toFixed(2)}</span>
                                                    <span>{reading.closing.toFixed(2)}</span>
                                                    <span>{reading.testing.toFixed(2)}</span>
                                                    <span className='text-right'>{reading.saleLitres.toFixed(2)}</span>
                                                    <span className='text-right font-medium'>{formatCurrency(reading.saleAmount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })}
                    </Accordion>
                </CardContent>
            </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
