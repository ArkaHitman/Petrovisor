
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
import type { Fuel, FuelPriceEntry, Settings, Tank, BankAccount } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { PlusCircle, Trash2, Banknote } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useFieldArray, useForm, FormProvider } from 'react-hook-form';
import { Switch } from '@/components/ui/switch';

export default function SettingsPage() {
  const router = useRouter();
  const { settings, setSettings, resetApp } = useAppState();
  const { toast } = useToast();
  
  const [isClient, setIsClient] = useState(false);
  
  const formMethods = useForm<Settings>({
      values: settings || undefined,
  });

  const { control, register, handleSubmit, watch, setValue, reset } = formMethods;

  const { fields: bankFields, append: appendBank, remove: removeBank } = useFieldArray({ control, name: "bankAccounts" });

  useEffect(() => {
    if (settings) {
      reset(settings);
    }
    setIsClient(true);
  }, [settings, reset]);

  const watchedTheme = watch('theme');
  useEffect(() => {
    if (watchedTheme) {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(watchedTheme);
      return () => {
         if (settings?.theme) {
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(settings.theme);
        }
      }
    }
  }, [watchedTheme, settings?.theme]);


  const handleSave = (data: Settings) => {
    if (!data.pumpName) {
        toast({ title: "Validation Error", description: "Petrol Pump Name is required.", variant: 'destructive' });
        return;
    }
    if (data.bankAccounts.filter(acc => acc.isOverdraft).length > 1) {
        toast({ title: "Validation Error", description: "Only one account can be the overdraft account.", variant: "destructive" });
        return;
    }
    setSettings(data);
    toast({ title: "Settings Saved", description: "Your changes have been saved successfully." });
    router.push('/');
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
        if (!settings) return;
        let logEntries: { date: string; category: string; description: string; amount: string; }[] = [];
        settings.bankLedger?.forEach(tx => logEntries.push({
            date: tx.date, category: 'Bank Ledger',
            description: `${tx.description} (${settings.bankAccounts.find(a => a.id === tx.accountId)?.name || 'N/A'})`,
            amount: tx.type === 'credit' ? formatCurrency(tx.amount) : `(${formatCurrency(tx.amount)})`,
        }));
        settings.managerLedger?.forEach(tx => logEntries.push({ date: tx.date, category: 'Manager Ledger', description: tx.description, amount: tx.type === 'payment_from_manager' ? formatCurrency(tx.amount) : `(${formatCurrency(tx.amount)})` }));
        settings.miscCollections?.forEach(c => logEntries.push({ date: c.date, category: 'Misc Collection', description: c.description, amount: formatCurrency(c.amount) }));
        settings.purchases?.forEach(p => logEntries.push({ date: p.date, category: 'Fuel Purchase', description: `Purchased ${p.quantity}L of ${settings.fuels.find(f=>f.id===p.fuelId)?.name || 'fuel'}`, amount: `(${formatCurrency(p.amount)})` }));
        settings.creditHistory?.forEach(c => logEntries.push({ date: c.date, category: 'Credit Register', description: c.type === 'given' ? 'Credit extended' : `Repayment via ${c.repaymentDestination}`, amount: formatCurrency(c.amount) }));
        logEntries.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        const headers = ['Date', 'Category', 'Description', 'Amount (INR)'];
        const csvRows = [headers.join(','), ...logEntries.map(row => [row.date, `"${row.category}"`, `"${row.description.replace(/"/g, '""')}"`, `"${row.amount}"`].join(','))];
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `petrovisor_log_${new Date().toISOString().split('T')[0]}.csv`);
        link.click();
        document.body.removeChild(link);
    };

  const handleFactoryReset = () => {
    resetApp();
    router.push('/');
  };

  if (!isClient || !settings) {
    return <AppLayout><div className="p-8">Loading Settings...</div></AppLayout>;
  }

  return (
    <AppLayout>
        <PageHeader title="Settings" description="Manage your application settings and data."/>
        <FormProvider {...formMethods}>
        <form onSubmit={handleSubmit(handleSave)} className="p-4 md:p-8 space-y-8">
            <Card>
                <CardHeader><CardTitle className="font-headline">General Settings</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="pumpName">Petrol Pump Name</Label>
                        <Input id="pumpName" {...register('pumpName')} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="theme">Theme</Label>
                         <Select value={watchedTheme} onValueChange={(value: 'light' | 'dark') => setValue('theme', value)}>
                            <SelectTrigger id="theme"><SelectValue placeholder="Select theme" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Light Theme</SelectItem>
                                <SelectItem value="dark">Dark Theme</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Banknote/> Bank Accounts</CardTitle>
                    <CardDescription>Manage all your business bank accounts here. Ensure one is marked as the overdraft account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {bankFields.map((field, index) => (
                         <Card key={field.id} className="p-4 bg-muted/50 relative">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Bank/Account Name</Label>
                                    <Input {...register(`bankAccounts.${index}.name`)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Account Number (Optional)</Label>
                                    <Input {...register(`bankAccounts.${index}.accountNumber`)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Current Balance</Label>
                                    <Input type="number" {...register(`bankAccounts.${index}.initialBalance`)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Sanctioned Amount (for OD)</Label>
                                    <Input type="number" {...register(`bankAccounts.${index}.sanctionedAmount`)} />
                                </div>
                             </div>
                             <div className="flex items-center space-x-2 mt-4">
                               <Switch
                                 checked={watch(`bankAccounts.${index}.isOverdraft`)}
                                 onCheckedChange={(checked) => {
                                     setValue(`bankAccounts.${index}.isOverdraft`, checked);
                                     if (checked) {
                                         bankFields.forEach((_, i) => {
                                             if (i !== index) setValue(`bankAccounts.${i}.isOverdraft`, false);
                                         });
                                     }
                                 }}
                               />
                               <Label>Is Overdraft Account?</Label>
                             </div>
                            {bankFields.length > 1 && <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1" onClick={() => removeBank(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                         </Card>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendBank({id: crypto.randomUUID(), name: '', accountNumber: '', initialBalance: 0, isOverdraft: false })}><PlusCircle className="h-4 w-4 mr-2"/>Add Account</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="font-headline">Data Management</CardTitle></CardHeader>
                <CardContent className="flex flex-wrap items-center gap-4">
                     <Button type="button" variant="outline" onClick={handleExportData}>Export All Data</Button>
                    <Button type="button" variant="outline" onClick={handleDownloadLog}>Download Log Report</Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild><Button type="button" variant="destructive">Factory Reset</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete all application data.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleFactoryReset}>Continue</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4 sticky bottom-4 bg-background py-4">
                <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" className="bg-accent hover:bg-accent/90">Save Changes</Button>
            </div>
        </form>
        </FormProvider>
    </AppLayout>
  );
}
