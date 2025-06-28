'use client';
import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, cn, getFuelPricesForDate } from '@/lib/utils';
import { GitCommitHorizontal, Fuel } from 'lucide-react';
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export default function StockVariationPage() {
  const { settings } = useAppState();

  const stockData = React.useMemo(() => {
    if (!settings) return [];

    const today = format(new Date(), 'yyyy-MM-dd');
    const { tanks, fuels, purchases, shiftReports, fuelPriceHistory } = settings;

    // 1. Calculate total sales per fuel type from shift reports
    const totalSalesByFuel = new Map<string, number>();
    (shiftReports || []).forEach(report => {
        report.meterReadings.forEach(reading => {
            const currentSales = totalSalesByFuel.get(reading.fuelId) || 0;
            totalSalesByFuel.set(reading.fuelId, currentSales + reading.saleLitres);
        });
    });

    // 2. Calculate total purchases per fuel type
    const totalPurchasesByFuel = new Map<string, number>();
    (purchases || []).forEach(purchase => {
        const fuel = fuels.find(f => f.id === purchase.fuelId);
        if (fuel) {
            const currentPurchases = totalPurchasesByFuel.get(fuel.id) || 0;
            totalPurchasesByFuel.set(fuel.id, currentPurchases + purchase.quantity);
        }
    });

    // 3. For each tank, calculate book stock and variation
    return tanks.map(tank => {
        const fuel = fuels.find(f => f.id === tank.fuelId);
        if (!fuel) return null;
        
        // This is tricky: we assume the 'initialStock' in settings was the true opening balance at the beginning of time.
        // A more robust system would use snapshots, but this is a good start.
        const openingStock = 0; // Simplified for now. A real system would need a starting snapshot.
        const purchasedQty = totalPurchasesByFuel.get(fuel.id) || 0;
        const soldQty = totalSalesByFuel.get(fuel.id) || 0;

        const bookStock = openingStock + purchasedQty - soldQty;
        const physicalStock = tank.initialStock; // This is the "live" stock updated by DIP
        const variation = physicalStock - bookStock;
        
        const { costPrice } = getFuelPricesForDate(fuel.id, today, fuelPriceHistory, { sellingPrice: fuel.price, costPrice: fuel.cost });
        const variationValue = variation * costPrice;

        return {
            tankId: tank.id,
            tankName: tank.name,
            fuelName: fuel.name,
            bookStock,
            physicalStock,
            variation,
            variationValue,
        };
    }).filter(Boolean);

  }, [settings]);

  if (!settings || !settings.tanks || settings.tanks.length === 0) {
    return (
      <AppLayout>
        <PageHeader title="Stock Variation" description="Compare book stock against physical stock readings." />
        <div className="p-4 md:p-8"><Card><CardContent className="p-8 text-center text-muted-foreground">No tanks configured.</CardContent></Card></Card></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
        <PageHeader title="Stock Variation Report" description="Compare calculated book stock against physical DIP readings to identify discrepancies." />
        <div className="p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><GitCommitHorizontal/>Stock Comparison</CardTitle>
                    <CardDescription>
                        Book Stock = (Total Purchases - Total Sales). Physical Stock is from the latest DIP entry.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tank</TableHead>
                                <TableHead>Fuel</TableHead>
                                <TableHead className="text-right">Book Stock (L)</TableHead>
                                <TableHead className="text-right">Physical Stock (L)</TableHead>
                                <TableHead className="text-right">Variation (L)</TableHead>
                                <TableHead className="text-right">Variation Value (Cost)</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stockData.map(item => (
                                <TableRow key={item!.tankId}>
                                    <TableCell className="font-medium">{item!.tankName}</TableCell>
                                    <TableCell><Badge variant="secondary">{item!.fuelName}</Badge></TableCell>
                                    <TableCell className="text-right">{item!.bookStock.toFixed(2)}</TableCell>
                                    <TableCell className="text-right font-semibold">{item!.physicalStock.toFixed(2)}</TableCell>
                                    <TableCell className={cn("text-right font-bold", item!.variation > 0 ? "text-primary" : "text-destructive")}>
                                        {item!.variation.toFixed(2)}
                                    </TableCell>
                                    <TableCell className={cn("text-right font-bold", item!.variationValue > 0 ? "text-primary" : "text-destructive")}>
                                        {formatCurrency(item!.variationValue)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    </AppLayout>
  );
}
