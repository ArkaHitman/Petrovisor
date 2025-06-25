
'use client';
import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, cn, getFuelPricesForDate } from '@/lib/utils';
import { Fuel } from 'lucide-react';
import { format as formatDate } from 'date-fns';

export default function TanksPage() {
  const { settings } = useAppState();
  
  if (!settings || !settings.tanks || settings.tanks.length === 0) {
    return (
      <AppLayout>
        <PageHeader
          title="Live Tank Status"
          description="Real-time display of tank levels, capacity, and stock value."
        />
        <div className="p-4 md:p-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No tanks have been configured yet.</p>
              <p className="text-sm text-muted-foreground">Please configure tanks in the settings.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const getTankLevelColor = (percentage: number) => {
    if (percentage < 20) return 'bg-destructive';
    if (percentage < 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const today = formatDate(new Date(), 'yyyy-MM-dd');

  return (
    <AppLayout>
      <PageHeader
        title="Live Tank Status"
        description="Real-time display of tank levels, capacity, and stock value based on initial stock."
      />
      <div className="p-4 md:p-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settings.tanks.map((tank, index) => {
          const fuel = settings.fuels.find(f => f.id === tank.fuelId);
          if (!fuel) return null;

          const percentage = tank.capacity > 0 ? (tank.initialStock / tank.capacity) * 100 : 0;
          
          const { costPrice, sellingPrice } = getFuelPricesForDate(
            tank.fuelId, 
            today, 
            settings.fuelPriceHistory,
            { sellingPrice: fuel.price, costPrice: fuel.cost }
          );
          const costStockValue = tank.initialStock * costPrice;
          const sellingStockValue = tank.initialStock * sellingPrice;

          return (
            <Card key={tank.id} className="opacity-0 animate-card-in" style={{ animationDelay: `${index * 100}ms` }}>
              <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <Fuel className="w-5 h-5 text-muted-foreground" />
                    {tank.name}
                  </CardTitle>
                  <CardDescription>Current estimated stock for {fuel?.name || 'N/A'}.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                  <div className="relative h-4 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={cn("h-full rounded-full transition-all duration-500 ease-in-out", getTankLevelColor(percentage))}
                        style={{ width: `${percentage}%` }}
                      />
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                      <span className="font-bold">{percentage.toFixed(1)}% Full</span>
                      <span>{tank.initialStock.toLocaleString()} L / {tank.capacity.toLocaleString()} L</span>
                  </div>
                  <div className="pt-2">
                    <p className="text-lg font-medium">Est. Value (Cost): <span className="font-headline font-semibold">{formatCurrency(costStockValue)}</span></p>
                    <p className="text-sm font-medium text-muted-foreground">Est. Value (Selling): <span className="font-semibold">{formatCurrency(sellingStockValue)}</span></p>
                  </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
}
