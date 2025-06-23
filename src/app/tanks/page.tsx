'use client';
import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, cn } from '@/lib/utils';
import { Fuel } from 'lucide-react';

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

  return (
    <AppLayout>
      <PageHeader
        title="Live Tank Status"
        description="Real-time display of tank levels, capacity, and stock value based on initial stock."
      />
      <div className="p-4 md:p-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settings.tanks.map(tank => {
          const fuel = settings.fuels.find(f => f.id === tank.fuelId);
          const percentage = tank.capacity > 0 ? (tank.initialStock / tank.capacity) * 100 : 0;
          const stockValue = tank.initialStock * (fuel?.cost || 0);

          return (
            <Card key={tank.id}>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Fuel className="w-5 h-5 text-muted-foreground" />
                    {tank.name}
                  </CardTitle>
                  <CardDescription>Current estimated stock for {fuel?.name || 'N/A'}.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                  <Progress value={percentage} aria-label={`${percentage.toFixed(0)}% full`} />
                  <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{tank.initialStock.toLocaleString()} L</span>
                      <span>{tank.capacity.toLocaleString()} L</span>
                  </div>
                  <p className="text-sm font-medium">Est. Value (Cost): <span className="font-headline font-semibold">{formatCurrency(stockValue)}</span></p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
}
