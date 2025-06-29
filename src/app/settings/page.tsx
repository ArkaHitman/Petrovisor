
'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppState } from '@/contexts/app-state-provider';
import { useToast } from '@/hooks/use-toast';
import type { Fuel, NozzlesPerFuel, Settings, Tank, ChartOfAccount } from '@/lib/types';
import { PlusCircle, Trash2, Banknote, Fuel as FuelIcon, Database, Upload, Download, FileText, BookText, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useRef } from 'react';
import { useFieldArray, useForm, FormProvider } from 'react-hook-form';
import { Switch } from '@/components/ui/switch';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { formatCurrency } from '@/lib/utils';
import { parseISO, format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const fuelSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Fuel name is required.'),
  price: z.coerce.number().min(0, 'Price must be positive.'),
  cost: z.coerce.number().min(0, 'Cost must be positive.'),
  nozzleCount: z.coerce.number().int().min(0).default(0),
});

const tankSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Tank name is required.'),
  fuelId: z.string().min(1, 'Please select a fuel type.'),
  capacity: z.coerce.number().min(1, 'Capacity must be greater than 0.'),
  initialStock: z.coerce.number().min(0, 'Initial stock cannot be negative.'),
  dipChartType: z.enum(['16kl', '21kl', 'none']).optional().transform(val => val === 'none' ? undefined : val),
});

const bankAccountSchema = z.object({
    id: z.string(),
    name: z.string().min(1, 'Bank name is required.'),
    accountNumber: z.string().optional(),
    initialBalance: z.coerce.number().default(0),
    sanctionedAmount: z.coerce.number().optional(),
    isOverdraft: z.boolean().default(false),
});

const settingsFormSchema = z.object({
  pumpName: z.string().min(1, 'Pump name is required.'),
  theme: z.enum(['light', 'dark']),
  bankAccounts: z.array(bankAccountSchema).min(1, 'At least one bank account is required.'),
  managerInitialBalance: z.coerce.number().optional(),
  fuels: z.array(fuelSchema).min(1, 'At least one fuel type is required.'),
  tanks: z.array(tankSchema),
}).refine(data => data.fuels.reduce((acc, fuel) => acc + fuel.nozzleCount, 0) > 0, {
    message: "You must have at least one nozzle in total across all fuel types.",
    path: ["fuels"],
}).refine(data => data.bankAccounts.filter(acc => acc.isOverdraft).length <= 1, {
    message: "Only one bank account can be marked as the overdraft account.",
    path: ["bankAccounts"],
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

const chartOfAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']),
});

function ChartOfAccountDialog({ open, setOpen, account, onSave }: { open: boolean, setOpen: (open: boolean) => void, account: ChartOfAccount | null, onSave: (data: z.infer<typeof chartOfAccountSchema>, id?: string) => void }) {
    const form = useForm<z.infer<typeof chartOfAccountSchema>>({
        resolver: zodResolver(chartOfAccountSchema),
        defaultValues: account || { name: '', type: 'Expense' },
    });

    useEffect(() => {
        form.reset(account || { name: '', type: 'Expense' });
    }, [account, form]);
    
    const onSubmit = (values: z.infer<typeof chartOfAccountSchema>) => {
        onSave(values, account?.id);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{account ? 'Edit Account' : 'Add New Account'}</DialogTitle>
                    <DialogDescription>Manage accounts for your journal entries.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Account Name</FormLabel><FormControl><Input placeholder="e.g., Office Supplies" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="type" render={({ field }) => (
                            <FormItem><FormLabel>Account Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Asset">Asset</SelectItem>
                                        <SelectItem value="Liability">Liability</SelectItem>
                                        <SelectItem value="Equity">Equity</SelectItem>
                                        <SelectItem value="Revenue">Revenue</SelectItem>
                                        <SelectItem value="Expense">Expense</SelectItem>
                                    </SelectContent>
                                </Select><FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Save Account</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default function SettingsPage() {
  const router = useRouter();
  const { settings, setSettings, resetApp, addChartOfAccount, updateChartOfAccount, deleteChartOfAccount } = useAppState();
  const { toast } = useToast();
  
  const [isClient, setIsClient] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccount | null>(null);

  const formMethods = useForm<SettingsFormValues>({
      resolver: zodResolver(settingsFormSchema),
  });

  const { control, register, handleSubmit, watch, setValue, reset } = formMethods;

  const { fields: bankFields, append: appendBank, remove: removeBank } = useFieldArray({ control, name: "bankAccounts" });
  const { fields: fuelFields, append: appendFuel, remove: removeFuel } = useFieldArray({ control, name: "fuels" });
  const { fields: tankFields, append: appendTank, remove: removeTank } = useFieldArray({ control, name: "tanks" });
  
  const watchedFuels = watch('fuels');
  
  useEffect(() => {
    if (settings) {
      const formValues: SettingsFormValues = {
        ...settings,
        fuels: settings.fuels.map(fuel => ({
          ...fuel,
          nozzleCount: settings.nozzlesPerFuel[fuel.id] || 0
        })),
        tanks: settings.tanks || [],
        managerInitialBalance: settings.managerInitialBalance || 0,
      };
      reset(formValues);
    }
    setIsClient(true);
  }, [settings, reset]);

  const watchedTheme = watch('theme');
  useEffect(() => {
    const themeClasses = ['dark'];
    if (watchedTheme) {
        document.documentElement.classList.remove(...themeClasses);
        if (watchedTheme === 'dark') {
          document.documentElement.classList.add('dark');
        }
    }
  }, [watchedTheme]);

  const handleSave = (data: SettingsFormValues) => {
    if (!settings) return;

    const nozzlesPerFuel: NozzlesPerFuel = {};
    const finalFuels: Fuel[] = data.fuels.map(fuelWithNozzles => {
        nozzlesPerFuel[fuelWithNozzles.id] = fuelWithNozzles.nozzleCount;
        const { nozzleCount, ...fuel } = fuelWithNozzles;
        return fuel;
    });

    const finalSettings: Settings = {
      ...settings,
      pumpName: data.pumpName,
      theme: data.theme,
      bankAccounts: data.bankAccounts,
      managerInitialBalance: data.managerInitialBalance,
      fuels: finalFuels,
      tanks: data.tanks,
      nozzlesPerFuel,
    };
    
    setSettings(finalSettings);
    toast({ title: "Settings Saved", description: "Your changes have been saved successfully." });
    router.push('/');
  };

  const handleExportData = () => {
    if (!settings) {
      toast({ title: "Error", description: "No data to export.", variant: "destructive" });
      return;
    }
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

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error("File could not be read.");
        }
        const importedData: Settings = JSON.parse(text);

        if (importedData.pumpName && importedData.bankAccounts && importedData.fuels && importedData.tanks) {
          setSettings(importedData);
          toast({ title: "Import Successful", description: "Your data has been restored." });
          router.push('/');
        } else {
          throw new Error("Invalid or corrupted data file.");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({ title: "Import Failed", description: errorMessage, variant: "destructive" });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = () => {
        toast({ title: "Import Failed", description: "Failed to read file.", variant: "destructive" });
    };
    reader.readAsText(file);
  };
  
  const handleDownloadLog = () => {
        if (!settings) return;
        let logEntries: { date: string; category: string; description: string; amount: string; }[] = [];
        
        settings.bankLedger?.forEach(tx => logEntries.push({
            date: format(parseISO(tx.date), 'yyyy-MM-dd'), category: 'Bank Ledger',
            description: `${tx.description} (${settings.bankAccounts.find(a => a.id === tx.accountId)?.name || 'N/A'})`,
            amount: tx.type === 'credit' ? formatCurrency(tx.amount) : `(${formatCurrency(tx.amount)})`,
        }));
        
        settings.managerLedger?.forEach(tx => logEntries.push({ date: format(parseISO(tx.date), 'yyyy-MM-dd'), category: 'Manager Ledger', description: tx.description, amount: tx.type === 'payment_from_manager' ? formatCurrency(tx.amount) : `(${formatCurrency(tx.amount)})` }));
        
        settings.miscCollections?.forEach(c => logEntries.push({ date: format(parseISO(c.date), 'yyyy-MM-dd'), category: 'Misc Collection', description: c.description, amount: formatCurrency(c.amount) }));
        
        settings.purchases?.forEach(p => logEntries.push({ date: format(parseISO(p.date), 'yyyy-MM-dd'), category: 'Fuel Purchase', description: `Purchased ${p.quantity}L of ${settings.fuels.find(f=>f.id===p.fuelId)?.name || 'fuel'}`, amount: `(${formatCurrency(p.amount)})` }));
        
        settings.creditHistory?.forEach(c => {
            const customerName = settings.customers.find(cust => cust.id === c.customerId)?.name || 'Unknown Customer';
            let desc = `Credit to ${customerName}`;
            if (c.type === 'repaid') {
                if (c.repaymentDestination === 'cash') {
                    desc = `Repayment (Cash) from ${customerName}`;
                } else {
                    const bankAccount = settings.bankAccounts.find(a => a.id === c.repaymentDestination);
                    desc = `Repayment (Bank) from ${customerName} to ${bankAccount?.name || 'Bank'}`;
                }
            }
            logEntries.push({ date: format(parseISO(c.date), 'yyyy-MM-dd'), category: 'Credit Register', description: desc, amount: c.type === 'given' ? `(${formatCurrency(c.amount)})` : formatCurrency(c.amount) })
        });
        
        settings.shiftReports?.forEach(sr => {
            const employeeName = settings.employees.find(e => e.id === sr.employeeId)?.name || 'Unknown';
            logEntries.push({ date: format(parseISO(sr.date), 'yyyy-MM-dd'), category: 'Shift Sale', description: `Total collection from ${employeeName} (${sr.shiftType} shift)`, amount: formatCurrency(sr.totalSales)})
        });

        logEntries.sort((a, b) => parseISO(b.date).getTime() - parseISO(a.date).getTime());
        const headers = ['Date', 'Category', 'Description', 'Amount (INR)'];
        const csvRows = [headers.join(','), ...logEntries.map(row => [row.date, `"${row.category}"`, `"${row.description.replace(/"/g, '""')}"`, `"${row.amount.replace(/"/g, '""')}"`].join(','))];
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
    };

  const handleFactoryReset = () => {
    resetApp();
    router.push('/');
  };

  const handleSaveAccount = (data: z.infer<typeof chartOfAccountSchema>, id?: string) => {
    if (id) {
        updateChartOfAccount({ ...data, id });
        toast({ title: 'Success', description: 'Account updated.' });
    } else {
        addChartOfAccount(data);
        toast({ title: 'Success', description: 'New account added.' });
    }
  };

  const openAccountDialog = (account: ChartOfAccount | null = null) => {
      setSelectedAccount(account);
      setIsAccountDialogOpen(true);
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
                         <Select value={watchedTheme} onValueChange={(value) => setValue('theme', value as any)}>
                            <SelectTrigger id="theme"><SelectValue placeholder="Select theme" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label>Initial Manager Balance</Label>
                        <Input type="number" {...register('managerInitialBalance')} />
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
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><BookText /> Chart of Accounts</CardTitle>
                    <CardDescription>Manage the accounts used in your journal entries.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Account Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="w-24"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {settings.chartOfAccounts.length > 0 ? settings.chartOfAccounts.map(account => (
                                    <TableRow key={account.id}>
                                        <TableCell className="font-medium">{account.name}</TableCell>
                                        <TableCell>{account.type}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openAccountDialog(account)}><Edit className="h-4 w-4" /></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Delete Account?</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete the "{account.name}" account? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteChartOfAccount(account.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No accounts configured.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                     </div>
                     <Button type="button" variant="outline" size="sm" onClick={() => openAccountDialog()}><PlusCircle className="h-4 w-4 mr-2"/>Add Account</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><FuelIcon/> Fuel Types & Pricing</CardTitle>
                    <CardDescription>Manage the fuels you sell, their pricing, and associated nozzle counts.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {fuelFields.map((field, index) => (
                        <Card key={field.id} className="p-4 bg-muted/50 relative">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label>Fuel Name</Label>
                                    <Input {...register(`fuels.${index}.name`)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Selling Price</Label>
                                    <Input type="number" step="0.01" {...register(`fuels.${index}.price`)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Cost Price</Label>
                                    <Input type="number" step="0.01" {...register(`fuels.${index}.cost`)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nozzle Count</Label>
                                    <Input type="number" {...register(`fuels.${index}.nozzleCount`, { valueAsNumber: true })} />
                                </div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1" onClick={() => removeFuel(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </Card>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendFuel({id: crypto.randomUUID(), name: '', price: 0, cost: 0, nozzleCount: 0 })}><PlusCircle className="h-4 w-4 mr-2"/>Add Fuel</Button>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><Database/> Storage Tanks</CardTitle>
                    <CardDescription>Configure your underground storage tanks.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {tankFields.map((field, index) => (
                        <Card key={field.id} className="p-4 bg-muted/50 relative">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Tank Name</Label>
                                    <Input {...register(`tanks.${index}.name`)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Fuel Type</Label>
                                    <Select onValueChange={(value) => setValue(`tanks.${index}.fuelId`, value)} value={watch(`tanks.${index}.fuelId`)}>
                                        <SelectTrigger><SelectValue placeholder="Select fuel" /></SelectTrigger>
                                        <SelectContent>
                                            {(watchedFuels || []).map(fuel => <SelectItem key={fuel.id} value={fuel.id}>{fuel.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>DIP Chart Type</Label>
                                    <Select onValueChange={(value) => setValue(`tanks.${index}.dipChartType`, value === 'none' ? undefined : value as '16kl' | '21kl')} value={watch(`tanks.${index}.dipChartType`) || 'none'}>
                                        <SelectTrigger><SelectValue placeholder="Select chart" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            <SelectItem value="16kl">16KL</SelectItem>
                                            <SelectItem value="21kl">21KL</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Tank Capacity (L)</Label>
                                    <Input type="number" {...register(`tanks.${index}.capacity`, { valueAsNumber: true })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Current Stock (L)</Label>
                                    <Input type="number" {...register(`tanks.${index}.initialStock`, { valueAsNumber: true })} />
                                </div>
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1" onClick={() => removeTank(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </Card>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => appendTank({id: crypto.randomUUID(), name: '', fuelId: watchedFuels?.[0]?.id || '', capacity: 10000, initialStock: 0, dipChartType: undefined })}><PlusCircle className="h-4 w-4 mr-2"/>Add Tank</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Data Management</CardTitle>
                    <CardDescription>Backup your current data to a file, or restore from a previous backup.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-4">
                     <input type="file" ref={fileInputRef} onChange={handleImportData} className="hidden" accept=".json" />
                     <Button type="button" variant="outline" onClick={handleImportClick}>
                        <Upload className="mr-2 h-4 w-4" />
                        Import Data
                     </Button>
                     <Button type="button" variant="outline" onClick={handleExportData}>
                        <Download className="mr-2 h-4 w-4" />
                        Export Data
                     </Button>
                    <Button type="button" variant="outline" onClick={handleDownloadLog}>
                        <FileText className="mr-2 h-4 w-4" />
                        Download Log Report
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button type="button" variant="destructive"><Trash2 className="mr-2 h-4 w-4" />Factory Reset</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete all application data and cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleFactoryReset}>Continue</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4 sticky bottom-4 bg-background py-4">
                <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
                <Button type="submit" size="lg">Save Changes</Button>
            </div>
        </form>
        </FormProvider>
        {isAccountDialogOpen && <ChartOfAccountDialog open={isAccountDialogOpen} setOpen={setIsAccountDialogOpen} account={selectedAccount} onSave={handleSaveAccount} />}
    </AppLayout>
  );
}
