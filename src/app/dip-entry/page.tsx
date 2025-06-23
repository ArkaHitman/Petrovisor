'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppState } from '@/contexts/app-state-provider';
import { useToast } from '@/hooks/use-toast';
import { getVolumeFromDip } from '@/lib/dip-charts';
import type { Tank } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Ruler, Fuel } from 'lucide-react';
import React, { useState } from 'react';

export default function DipEntryPage() {
  const { settings, setSettings } = useAppState();
  const { toast } = useToast();
  const [dipReadings, setDipReadings] = useState<Record<string, string>>({});

  const handleDipChange = (tankId: string, value: string) => {
    setDipReadings(prev => ({ ...prev, [tankId]: value }));
  };

  const handleUpdateStock = (tank: Tank) => {
    const dipValue = parseFloat(dipReadings[tank.id]);
    if (isNaN(dipValue) || !tank.dipChartType) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid dip reading. Also ensure the tank has a DIP chart assigned in settings.',
        variant: 'destructive',
      });
      return;
    }

    const newVolume = getVolumeFromDip(dipValue, tank.dipChartType);
    
    if (settings) {
      const newTanks = settings.tanks.map(t =>
        t.id === tank.id ? { ...t, initialStock: newVolume, lastStockUpdateDate: new Date().toISOString().split('T')[0] } : t
      );
      setSettings({ ...settings, tanks: newTanks });

      toast({
        title: 'Stock Updated',
        description: `${tank.name}'s stock has been updated to ${newVolume.toLocaleString()} L based on a dip reading of ${dipValue} cm.`,
      });
    }
  };

  if (!settings || !settings.tanks) {
    return (
      <AppLayout>
        <PageHeader
          title="DIP Entry"
          description="Update tank stock levels based on physical dip readings."
        />
        <div className="p-8">Loading tank information...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="DIP Entry"
        description="Update tank stock levels based on physical dip readings."
      />
      <div className="p-4 md:p-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {settings.tanks.map(tank => {
            const fuel = settings.fuels.find(f => f.id === tank.fuelId);
            return (
              <Card key={tank.id}>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center gap-2">
                    <Fuel className="w-5 h-5 text-muted-foreground" />
                    {tank.name}
                  </CardTitle>
                  <CardDescription>
                    {fuel?.name} | Chart: {tank.dipChartType?.toUpperCase() || 'None'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Current Stock</p>
                    <p className="text-2xl font-bold font-headline">
                      {tank.initialStock.toLocaleString()} L
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`dip-${tank.id}`}>New Dip Reading (cm)</Label>
                    <div className="flex gap-2">
                      <Input
                        id={`dip-${tank.id}`}
                        type="number"
                        placeholder="e.g., 150.5"
                        value={dipReadings[tank.id] || ''}
                        onChange={e => handleDipChange(tank.id, e.target.value)}
                        disabled={!tank.dipChartType}
                      />
                      <Button
                        onClick={() => handleUpdateStock(tank)}
                        disabled={!tank.dipChartType || !dipReadings[tank.id]}
                      >
                        <Ruler className="h-4 w-4 mr-2" />
                        Update
                      </Button>
                    </div>
                     {!tank.dipChartType && <p className="text-xs text-destructive">No DIP chart assigned to this tank.</p>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Card className="mt-8 bg-muted/50">
            <CardHeader>
                <CardTitle className="text-lg">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>1. Enter the physical dipstick reading (in centimeters) for a tank into the corresponding input field.</p>
                <p>2. Click the "Update" button to calculate the volume in litres using the tank's assigned DIP chart.</p>
                <p>3. The system automatically updates the "Current Stock" for that tank with the new calculated volume.</p>
                <p><strong>Note:</strong> A tank must have a DIP Chart Type (e.g., 16KL or 21KL) assigned in the <a href="/settings" className="underline">Settings</a> page to use this feature.</p>
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
