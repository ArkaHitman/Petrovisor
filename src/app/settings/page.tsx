
'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAppState } from '@/contexts/app-state-provider';
import { useToast } from '@/hooks/use-toast';
import type { Fuel, FuelPriceEntry, Settings, Tank } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

export default function SettingsPage() {
  const router = useRouter();
  const { settings, setSettings, resetApp } = useAppState();
  const { toast } = useToast();
  
  const [localSettings, setLocalSettings] = useState<Settings | null>(null);

  // State for the "Add New Price" form
  const [newPriceDate, setNewPriceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newPrices, setNewPrices] = useState<Record<string, { sellingPrice: number; costPrice: number }>>({});

  useEffect(() => {
    if (settings) {
      const newLocalSettings = JSON.parse(JSON.stringify(settings));
      
      if (!newLocalSettings.fuelPriceHistory) {
        newLocalSettings.fuelPriceHistory = [];
      }
      if (!newLocalSettings.nozzlesPerFuel) {
        newLocalSettings.nozzlesPerFuel = {};
      }
      if (!newLocalSettings.monthlyReports) {
        newLocalSettings.monthlyReports = [];
      }

      setLocalSettings(newLocalSettings);

      const initialPrices: Record<string, { sellingPrice: number; costPrice: number; }> = {};
      newLocalSettings.fuels.forEach((fuel: Fuel) => {
        initialPrices[fuel.id] = { sellingPrice: fuel.price, costPrice: fuel.cost };
      });
      setNewPrices(initialPrices);
    }
  }, [settings]);

  // Live theme preview
  useEffect(() => {
    if (localSettings?.theme) {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(localSettings.theme);

      // when component unmounts, restore original theme
      return () => {
         if (settings?.theme) {
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(settings.theme);
        }
      }
    }
  }, [localSettings?.theme, settings?.theme]);


  const handleSave = () => {
    if (!localSettings) return;
    
    if (!localSettings.pumpName) {
        toast({ title: "Validation Error", description: "Petrol Pump Name is required.", variant: 'destructive' });
        return;
    }

    setSettings(localSettings);
    toast({ title: "Settings Saved", description: "Your changes have been saved successfully." });
    router.push('/');
  };

  const handleCancel = () => {
    router.back();
  }

  const handleInputChange = (field: keyof Settings, value: any) => {
    setLocalSettings(prev => prev ? { ...prev, [field]: value } : null);
  };
  
  const handleTankChange = (tankId: string, field: keyof Tank, value: any) => {
    setLocalSettings(prev => {
        if (!prev) return null;
        const newTanks = prev.tanks.map(tank => 
            tank.id === tankId ? { ...tank, [field]: value } : tank
        );
        return { ...prev, tanks: newTanks };
    });
  };

  const handleNozzleChange = (fuelId: string, value: number) => {
     setLocalSettings(prev => {
        if (!prev) return null;
        return {
            ...prev,
            nozzlesPerFuel: {
                ...prev.nozzlesPerFuel,
                [fuelId]: value
            }
        };
    });
  }

  const handleAddPrice = () => {
    if (localSettings?.fuelPriceHistory?.some(p => p.date === newPriceDate)) {
        toast({ title: "Error", description: "A price entry for this date already exists.", variant: "destructive" });
        return;
    }
    if (Object.values(newPrices).some(p => p.sellingPrice <= 0 || p.costPrice <= 0)) {
        toast({ title: "Error", description: "All fuel prices must be positive.", variant: "destructive" });
        return;
    }

    const newEntry: FuelPriceEntry = {
        id: crypto.randomUUID(),
        date: newPriceDate,
        prices: newPrices,
        createdAt: new Date().toISOString(),
    };

    setLocalSettings(prev => {
        if (!prev) return null;
        const updatedHistory = [...(prev.fuelPriceHistory || []), newEntry].sort((a,b) => b.date.localeCompare(a.date));
        return { ...prev, fuelPriceHistory: updatedHistory };
    });
  };

  const handleDeletePrice = (id: string) => {
    setLocalSettings(prev => {
        if (!prev) return null;
        return { ...prev, fuelPriceHistory: (prev.fuelPriceHistory || []).filter(p => p.id !== id) };
    });
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], {type: "application/json"});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `petrovisor_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Data Exported", description: "Your data has been downloaded." });
  };
  
    const handleDownloadLog = () => {
        if (!settings) {
            toast({ title: 'Error', description: 'Application data not loaded yet.', variant: 'destructive' });
            return;
        }

        let logEntries: { date: string; category: string; description: string; amount: string; }[] = [];

        settings.bankLedger?.forEach(tx => logEntries.push({
            date: tx.date,
            category: 'Bank Ledger',
            description: tx.description,
            amount: tx.type === 'credit' ? formatCurrency(tx.amount) : `(${formatCurrency(tx.amount)})`,
        }));

        settings.managerLedger?.forEach(tx => logEntries.push({
            date: tx.date,
            category: 'Manager Ledger',
            description: tx.description,
            amount: tx.type === 'payment_from_manager' ? formatCurrency(tx.amount) : `(${formatCurrency(tx.amount)})`,
        }));

        settings.miscCollections?.forEach(c => logEntries.push({
            date: c.date,
            category: 'Misc Collection',
            description: c.description,
            amount: formatCurrency(c.amount),
        }));

        settings.purchases?.forEach(p => {
            const fuel = settings.fuels.find(f => f.id === p.fuelId);
            logEntries.push({
                date: p.date,
                category: 'Fuel Purchase',
                description: `Purchased ${p.quantity}L of ${fuel?.name || 'fuel'}. Invoice: ${p.invoiceNumber || 'N/A'}`,
                amount: `(${formatCurrency(p.amount)})`,
            });
        });
        
        settings.creditHistory?.forEach(c => {
           logEntries.push({
               date: c.date,
               category: 'Credit Register',
               description: c.type === 'given' ? 'Credit extended to customer' : `Credit repayment received via ${c.repaymentDestination}`,
               amount: formatCurrency(c.amount),
           })
        });
        
        settings.fuelPriceHistory?.forEach(p => {
            const prices = Object.entries(p.prices).map(([fid, price]) => {
                const fuel = settings.fuels.find(f => f.id === fid);
                return `${fuel?.name || 'Unknown'}: Sell ${price.sellingPrice}/Cost ${price.costPrice}`;
            }).join('; ');
            logEntries.push({
                date: p.date,
                category: 'Settings Change',
                description: `Fuel prices updated - ${prices}`,
                amount: 'N/A'
            });
        });

        logEntries.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());

        const headers = ['Date', 'Category', 'Description', 'Amount (INR)'];
        const csvRows = [
            headers.join(','),
            ...logEntries.map(row => [
                row.date,
                `"${row.category}"`,
                `"${row.description.replace(/"/g, '""')}"`,
                `"${row.amount}"`
            ].join(','))
        ];
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `petrovisor_log_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: 'Success', description: 'Log report download initiated!' });
    };

  const handleFactoryReset = () => {
    resetApp();
    router.push('/');
  };

  if (!localSettings) {
    return (
      <AppLayout>
          <div className="p-8">Loading Settings...</div>
      </AppLayout>
    );
  }

  const { fuels, tanks } = localSettings;

  return (
    <AppLayout>
        <PageHeader 
            title="Settings"
            description="Manage your application settings and data."
        />
        <div className="p-4 md:p-8 space-y-8">
            {/* General Settings Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">General Settings</CardTitle>
                    <CardDescription>Basic information and preferences for your station.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="pumpName">Petrol Pump Name</Label>
                        <Input id="pumpName" value={localSettings.pumpName} onChange={(e) => handleInputChange('pumpName', e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="theme">Theme</Label>
                         <Select value={localSettings.theme} onValueChange={(value: 'light' | 'dark') => handleInputChange('theme', value)}>
                            <SelectTrigger id="theme">
                                <SelectValue placeholder="Select theme" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Light Theme</SelectItem>
                                <SelectItem value="dark">Dark Theme</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
                        <Input id="bankAccountNumber" value={localSettings.bankAccountNumber || ''} onChange={(e) => handleInputChange('bankAccountNumber', e.target.value)} />
                    </div>
                      <div className="space-y-2">
                        <Label htmlFor="initialBankBalance">Initial Bank Balance (at setup)</Label>
                        <Input id="initialBankBalance" type="number" value={localSettings.initialBankBalance} onChange={(e) => handleInputChange('initialBankBalance', parseFloat(e.target.value) || 0)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="sanctionedAmount">Sanctioned Bank Amount</Label>
                        <Input id="sanctionedAmount" type="number" value={localSettings.sanctionedAmount} onChange={(e) => handleInputChange('sanctionedAmount', parseFloat(e.target.value) || 0)} />
                    </div>
                </CardContent>
            </Card>

            {/* Fuel Price History */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Fuel Price History</CardTitle>
                    <CardDescription>Manage historical fuel selling and cost prices for accurate profit calculation.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-6">
                    <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                        <h4 className="font-semibold">Add New Price Entry</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2 md:col-span-1">
                                <Label htmlFor="price-date">Effective Date</Label>
                                <Input id="price-date" type="date" value={newPriceDate} onChange={(e) => setNewPriceDate(e.target.value)} />
                            </div>
                            <div className="md:col-span-3">
                                <Button onClick={handleAddPrice}><PlusCircle className="mr-2 h-4 w-4" /> Add Price Entry</Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                            {fuels.map(fuel => (
                                <Card key={fuel.id} className="bg-background">
                                    <CardHeader className="p-3">
                                        <CardTitle className="text-base">{fuel.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-0 space-y-2">
                                        <div className="space-y-1">
                                            <Label htmlFor={`selling-price-${fuel.id}`} className="text-xs">Selling Price</Label>
                                            <Input id={`selling-price-${fuel.id}`} type="number" step="0.01" value={newPrices[fuel.id]?.sellingPrice ?? ''} onChange={(e) => setNewPrices(p => ({...p, [fuel.id]: {...(p[fuel.id] || {costPrice: 0}), sellingPrice: parseFloat(e.target.value) || 0}}))} />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor={`cost-price-${fuel.id}`} className="text-xs">Cost Price</Label>
                                            <Input id={`cost-price-${fuel.id}`} type="number" step="0.01" value={newPrices[fuel.id]?.costPrice ?? ''} onChange={(e) => setNewPrices(p => ({...p, [fuel.id]: {...(p[fuel.id] || {sellingPrice: 0}), costPrice: parseFloat(e.target.value) || 0}}))} />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h4 className="font-semibold text-muted-foreground">Existing Price Records</h4>
                         <div className="max-h-60 overflow-y-auto space-y-2 pr-2 border rounded-md p-2">
                            {localSettings.fuelPriceHistory && localSettings.fuelPriceHistory.length > 0 ? localSettings.fuelPriceHistory.map(entry => (
                                <div key={entry.id} className="flex justify-between items-center p-2 border rounded-md text-sm bg-background hover:bg-muted/50">
                                    <div>
                                        <span className="font-medium">{format(parseISO(entry.date), 'dd MMM yyyy')}</span>
                                        <div className="flex items-center gap-x-4 gap-y-1 text-muted-foreground flex-wrap">
                                            {fuels.map(fuel => (
                                                <span key={fuel.id} className="text-xs">
                                                    <span className="font-semibold">{fuel.name}:</span> Sell {formatCurrency(entry.prices[fuel.id]?.sellingPrice || 0)} / Cost {formatCurrency(entry.prices[fuel.id]?.costPrice || 0)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => handleDeletePrice(entry.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            )) : <p className="text-sm text-muted-foreground text-center py-8">No price history recorded.</p>}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tank Config */}
            <Card>
                 <CardHeader>
                    <CardTitle className="font-headline">Tank Configuration</CardTitle>
                    <CardDescription>Define the properties of your physical fuel tanks.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4">
                    {tanks.map(tank => {
                        const fuel = fuels.find(f => f.id === tank.fuelId);
                        return (
                            <div key={tank.id} className="p-4 border rounded-lg bg-muted/50">
                                <h4 className="font-semibold mb-2">{tank.name} ({fuel?.name || 'Unknown Fuel'})</h4>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-2"><Label>Capacity (Ltrs)</Label><Input type="number" value={tank.capacity} onChange={e => handleTankChange(tank.id, 'capacity', parseFloat(e.target.value) || 0)} /></div>
                                    <div className="space-y-2"><Label>Current Stock (Ltrs)</Label><Input type="number" value={tank.initialStock} onChange={e => handleTankChange(tank.id, 'initialStock', parseFloat(e.target.value) || 0)} /></div>
                                    <div className="space-y-2">
                                        <Label>Stock Last Updated</Label>
                                        <Input
                                            readOnly
                                            value={tank.lastStockUpdateTimestamp ? format(parseISO(tank.lastStockUpdateTimestamp), 'dd MMM yyyy, h:mm a') : 'Never'}
                                            className="bg-background/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>DIP Chart Type</Label>
                                        <Select value={tank.dipChartType || 'none'} onValueChange={value => handleTankChange(tank.id, 'dipChartType', value === 'none' ? undefined : value)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Chart" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                <SelectItem value="16kl">16KL Chart</SelectItem>
                                                <SelectItem value="21kl">21KL Chart</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </CardContent>
            </Card>

            {/* Nozzles */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Default Nozzles Per Fuel Type</CardTitle>
                    <CardDescription>Set the number of nozzles for each fuel type. This is used when creating new monthly reports.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {fuels.map(fuel => (
                        <div key={fuel.id} className="space-y-2">
                            <Label>{fuel.name} Nozzles</Label>
                            <Input type="number" min="0" max="10" value={localSettings.nozzlesPerFuel?.[fuel.id] || 0} onChange={e => handleNozzleChange(fuel.id, parseInt(e.target.value, 10) || 0)} />
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Data Management</CardTitle>
                    <CardDescription>Export your data for backup or reset the application.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-4">
                     <Button variant="outline" onClick={handleExportData}>Export All Data</Button>
                    <Button variant="outline" onClick={handleDownloadLog}>Download Log Report</Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">Factory Reset Application</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete all your application data from this device.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleFactoryReset}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>

            <Separator />

            <div className="flex justify-end gap-4 sticky bottom-4 bg-background py-4">
                <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                <Button onClick={handleSave} className="bg-accent hover:bg-accent/90">Save Changes</Button>
            </div>
        </div>
    </AppLayout>
  );
}
