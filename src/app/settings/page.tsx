'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppState } from '@/contexts/app-state-provider';
import { useToast } from '@/hooks/use-toast';
import type { Fuel, FuelPriceEntry, Settings, Tank } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { PlusCircle, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

export default function SettingsPage() {
  const router = useRouter();
  const { settings, setSettings, resetApp } = useAppState();
  const { toast } = useToast();
  
  const [localSettings, setLocalSettings] = useState<Settings | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(true);

  // State for the "Add New Price" form
  const [newPriceDate, setNewPriceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newPrices, setNewPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (settings) {
      // Deep copy settings to local state for editing
      setLocalSettings(JSON.parse(JSON.stringify(settings)));
      const initialPrices: Record<string, number> = {};
      settings.fuels.forEach(fuel => {
        initialPrices[fuel.id] = fuel.price;
      });
      setNewPrices(initialPrices);
    }
  }, [settings]);

  // Live theme preview
  useEffect(() => {
    if (localSettings?.theme) {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(localSettings.theme);
    }
  }, [localSettings?.theme]);

  const handleClose = () => {
    setIsModalOpen(false);
    // Restore original theme on close without saving
    if (settings?.theme) {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(settings.theme);
    }
    setTimeout(() => router.back(), 300); // Wait for animation
  };

  const handleSave = () => {
    if (!localSettings) return;
    
    // Simple validation
    if (!localSettings.pumpName) {
        toast({ title: "Validation Error", description: "Petrol Pump Name is required.", variant: 'destructive' });
        return;
    }

    setSettings(localSettings);
    toast({ title: "Settings Saved", description: "Your changes have been saved successfully." });
    handleClose();
  };

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
    if (Object.values(newPrices).some(p => p <= 0)) {
        toast({ title: "Error", description: "All fuel prices must be positive.", variant: "destructive" });
        return;
    }

    const newEntry: FuelPriceEntry = {
        id: crypto.randomUUID(),
        date: newPriceDate,
        prices: newPrices,
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
  
  const handleFactoryReset = () => {
    resetApp();
  };

  if (!localSettings) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
        <div className="text-white">Loading Settings...</div>
      </div>
    );
  }

  const { fuels, tanks } = localSettings;

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 animate-fadeInScaleUp" aria-labelledby="settings-modal-title">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle id="settings-modal-title" className="font-headline text-2xl font-bold text-primary">Settings</DialogTitle>
        </DialogHeader>

        <div className="px-6 space-y-4">
            <Accordion type="multiple" defaultValue={['general']} className="w-full">
                <AccordionItem value="general">
                    <AccordionTrigger className="text-xl font-semibold">General</AccordionTrigger>
                    <AccordionContent className="pt-2 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <Input id="initialBankBalance" type="number" value={localSettings.initialBankBalance || ''} onChange={(e) => handleInputChange('initialBankBalance', parseFloat(e.target.value))} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="sanctionedAmount">Sanctioned Bank Amount</Label>
                                <Input id="sanctionedAmount" type="number" value={localSettings.sanctionedAmount || ''} onChange={(e) => handleInputChange('sanctionedAmount', parseFloat(e.target.value))} />
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="fuel-prices">
                    <AccordionTrigger className="text-xl font-semibold">Fuel Price History</AccordionTrigger>
                    <AccordionContent className="pt-2 space-y-4">
                        <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                            <h4 className="font-semibold">Add New Price Entry</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
                                <div className="space-y-2">
                                    <Label htmlFor="price-date">Date</Label>
                                    <Input id="price-date" type="date" value={newPriceDate} onChange={(e) => setNewPriceDate(e.target.value)} />
                                </div>
                                {fuels.map(fuel => (
                                     <div key={fuel.id} className="space-y-2">
                                        <Label htmlFor={`price-${fuel.id}`}>{fuel.name} Price</Label>
                                        <Input id={`price-${fuel.id}`} type="number" value={newPrices[fuel.id] || ''} onChange={(e) => setNewPrices(p => ({...p, [fuel.id]: parseFloat(e.target.value)}))} />
                                    </div>
                                ))}
                                <Button onClick={handleAddPrice} size="sm"><PlusCircle className="mr-2" /> Add</Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-semibold">Existing Prices</h4>
                             <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                                {localSettings.fuelPriceHistory && localSettings.fuelPriceHistory.length > 0 ? localSettings.fuelPriceHistory.map(entry => (
                                    <div key={entry.id} className="flex justify-between items-center p-2 border rounded-md text-sm">
                                        <span>{format(parseISO(entry.date), 'dd MMM yyyy')}</span>
                                        <div className="flex items-center gap-4">
                                            {fuels.map(fuel => (
                                                <span key={fuel.id}>{fuel.name.charAt(0)}: {entry.prices[fuel.id] || 'N/A'}</span>
                                            ))}
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeletePrice(entry.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                )) : <p className="text-sm text-muted-foreground text-center py-4">No price history recorded.</p>}
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="tanks">
                    <AccordionTrigger className="text-xl font-semibold">Tank Configuration</AccordionTrigger>
                    <AccordionContent className="pt-2 space-y-4">
                        {tanks.map(tank => {
                            const fuel = fuels.find(f => f.id === tank.fuelId);
                            return (
                                <div key={tank.id} className="p-4 border rounded-lg bg-muted/50">
                                    <h4 className="font-semibold mb-2">{tank.name} ({fuel?.name || 'Unknown Fuel'})</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2"><Label>Capacity (Ltrs)</Label><Input type="number" value={tank.capacity} onChange={e => handleTankChange(tank.id, 'capacity', parseFloat(e.target.value))} /></div>
                                        <div className="space-y-2"><Label>Initial Stock (Ltrs)</Label><Input type="number" value={tank.initialStock} onChange={e => handleTankChange(tank.id, 'initialStock', parseFloat(e.target.value))} /></div>
                                        <div className="space-y-2"><Label>Stock Last Updated</Label><Input type="date" value={tank.lastStockUpdateDate || ''} onChange={e => handleTankChange(tank.id, 'lastStockUpdateDate', e.target.value)} /></div>
                                    </div>
                                </div>
                            )
                        })}
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="nozzles">
                    <AccordionTrigger className="text-xl font-semibold">Default Nozzles Per Fuel Type</AccordionTrigger>
                    <AccordionContent className="pt-2">
                         <div className="p-4 border rounded-lg bg-muted/50 grid grid-cols-1 md:grid-cols-3 gap-4">
                            {fuels.map(fuel => (
                                <div key={fuel.id} className="space-y-2">
                                    <Label>{fuel.name} Nozzles</Label>
                                    <Input type="number" min="0" max="10" value={localSettings.nozzlesPerFuel[fuel.id] || 0} onChange={e => handleNozzleChange(fuel.id, parseInt(e.target.value, 10))} />
                                </div>
                            ))}
                         </div>
                    </AccordionContent>
                </AccordionItem>

                <AccordionItem value="data">
                    <AccordionTrigger className="text-xl font-semibold">Data Management</AccordionTrigger>
                    <AccordionContent className="pt-2 space-y-4">
                         <div className="flex flex-wrap gap-4">
                            <Button variant="outline" onClick={handleExportData}>Export All Data</Button>
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
                         </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
        
        <DialogFooter className="p-6 pt-4">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
