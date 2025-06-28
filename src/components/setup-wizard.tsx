'use client';

import React, { useState, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAppState } from '@/contexts/app-state-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Droplets, Fuel, Database, Trash2, PlusCircle, Building, Check, Upload } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { Settings, NozzlesPerFuel, Fuel as FuelType } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from './ui/switch';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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

const setupSchema = z.object({
  pumpName: z.string().min(1, 'Pump name is required.'),
  bankAccounts: z.array(bankAccountSchema).min(1, 'At least one bank account is required.'),
  managerInitialBalance: z.coerce.number().optional(),
  fuels: z.array(fuelSchema).min(1, 'At least one fuel type is required.'),
  tanks: z.array(tankSchema).min(1, 'At least one tank is required.'),
}).refine(data => data.fuels.reduce((acc, fuel) => acc + fuel.nozzleCount, 0) > 0, {
    message: "You must have at least one nozzle in total across all fuel types.",
    path: ["fuels"],
}).refine(data => data.bankAccounts.filter(acc => acc.isOverdraft).length <= 1, {
    message: "Only one bank account can be marked as the overdraft account.",
    path: ["bankAccounts"],
});

const petrolFuel = { id: crypto.randomUUID(), name: 'Petrol', price: 100, cost: 95, nozzleCount: 1 };
const dieselFuel = { id: crypto.randomUUID(), name: 'Diesel', price: 92, cost: 88, nozzleCount: 1 };
const xtraFuel = { id: crypto.randomUUID(), name: 'Xtra', price: 110, cost: 104, nozzleCount: 0 };
const initialFuels = [petrolFuel, dieselFuel, xtraFuel];

const initialTanks = [
  { id: crypto.randomUUID(), name: 'Petrol Tank', fuelId: petrolFuel.id, capacity: 20000, initialStock: 0, dipChartType: '21kl' as const },
  { id: crypto.randomUUID(), name: 'Diesel Tank', fuelId: dieselFuel.id, capacity: 20000, initialStock: 0, dipChartType: '21kl' as const },
  { id: crypto.randomUUID(), name: 'Xtra Fuel Tank', fuelId: xtraFuel.id, capacity: 15000, initialStock: 0, dipChartType: '16kl' as const },
];

const Step = ({ step, currentStep, title }: { step: number; currentStep: number; title: string }) => {
    const isActive = step === currentStep;
    const isCompleted = step < currentStep;
    return (
        <div className="flex items-center gap-2">
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors', isCompleted ? 'bg-primary text-primary-foreground' : isActive ? 'bg-primary/20 text-primary border-2 border-primary' : 'bg-muted text-muted-foreground')}>
                {isCompleted ? <Check size={18} /> : step}
            </div>
            <span className={cn('font-medium', isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground')}>{title}</span>
        </div>
    );
};

export default function SetupWizard() {
  const { finishSetup } = useAppState();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<z.infer<typeof setupSchema>>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      pumpName: '',
      bankAccounts: [{ id: crypto.randomUUID(), name: 'Main Overdraft Account', accountNumber: '', initialBalance: 100000, sanctionedAmount: 500000, isOverdraft: true }],
      managerInitialBalance: 0,
      fuels: initialFuels,
      tanks: initialTanks,
    },
  });

  const { fields: fuelFields, append: appendFuel, remove: removeFuel } = useFieldArray({ control: form.control, name: "fuels" });
  const { fields: tankFields, append: appendTank, remove: removeTank } = useFieldArray({ control: form.control, name: "tanks" });
  const { fields: bankFields, append: appendBank, remove: removeBank } = useFieldArray({ control: form.control, name: "bankAccounts" });
  
  const watchedFuels = form.watch('fuels');
  
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
          finishSetup(importedData);
          toast({ title: "Import Successful", description: "Your data has been restored." });
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

  const onSubmit = (data: z.infer<typeof setupSchema>) => {
    const nozzlesPerFuel: NozzlesPerFuel = {};
    const finalFuels: FuelType[] = data.fuels.map(fuelWithNozzles => {
        nozzlesPerFuel[fuelWithNozzles.id] = fuelWithNozzles.nozzleCount;
        const { nozzleCount, ...fuel } = fuelWithNozzles;
        return fuel;
    });

    const settings: Settings = {
      ...data,
      fuels: finalFuels,
      theme: 'light',
      employees: [],
      customers: [{id: 'default-credit', name: 'Default Credit Customer', createdAt: new Date().toISOString()}],
      fuelPriceHistory: [],
      nozzlesPerFuel,
      managerLedger: [],
      bankLedger: [],
      creditHistory: [],
      miscCollections: [],
      monthlyReports: [],
      shiftReports: [],
      purchases: [],
    };
    finishSetup(settings);
  };
  
  const handleNext = async () => {
        let fieldsToValidate: ('pumpName' | 'bankAccounts' | 'fuels' | 'tanks')[] = [];
        if (step === 1) {
            fieldsToValidate = ['pumpName', 'bankAccounts'];
        } else if (step === 2) {
            fieldsToValidate = ['fuels'];
        }

        const isValid = await form.trigger(fieldsToValidate);
        if (isValid) {
            setStep(s => s + 1);
            window.scrollTo(0, 0);
        } else {
             toast({
                title: "Incomplete Step",
                description: "Please fill out all required fields correctly before proceeding.",
                variant: "destructive",
            });
        }
    };

    const handleBack = () => {
        setStep(s => s - 1);
        window.scrollTo(0, 0);
    };

  return (
    <div className="min-h-screen w-full bg-muted/40 p-4 md:p-8 animate-fadeInScaleUp">
      <input type="file" ref={fileInputRef} onChange={handleImportData} className="hidden" accept=".json" />
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Droplets className="h-10 w-10 text-primary" />
          </div>
          <h1 className="font-headline text-3xl md:text-4xl font-bold">Welcome to PetroVisor</h1>
          <p className="text-muted-foreground mt-2">Let's get your station set up. You can change these settings later.</p>
           <div className="mt-6">
                <Button type="button" variant="outline" onClick={handleImportClick}>
                    <Upload className="mr-2 h-4 w-4" />
                    Or Import from Backup
                </Button>
            </div>
        </header>

         <Card>
            <CardContent className="p-6 md:p-8">
                 <div className="flex justify-center items-center gap-2 sm:gap-4 mb-8">
                    <Step step={1} currentStep={step} title="Financials"/>
                    <div className={cn("flex-1 h-0.5", step > 1 ? 'bg-primary' : 'bg-border')}/>
                    <Step step={2} currentStep={step} title="Fuels"/>
                    <div className={cn("flex-1 h-0.5", step > 2 ? 'bg-primary' : 'bg-border')}/>
                    <Step step={3} currentStep={step} title="Tanks"/>
                 </div>
        
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    
                    <div className={step === 1 ? 'block' : 'hidden'}>
                         <CardHeader className="px-0">
                            <CardTitle className="font-headline flex items-center gap-3"><Building size={24} /> Step 1: General & Financial Setup</CardTitle>
                            <CardDescription>Start with your station's name and its primary financial accounts.</CardDescription>
                         </CardHeader>
                         <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                               <FormField control={form.control} name="pumpName" render={({ field }) => (
                                <FormItem><FormLabel>Petrol Pump Name</FormLabel><FormControl><Input placeholder="e.g., Star Fuels" {...field} /></FormControl><FormMessage /></FormItem>
                              )} />
                               <FormField control={form.control} name="managerInitialBalance" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Initial Manager Balance</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormDescription>The starting balance if the manager has invested funds.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                              )} />
                            </div>
                            <Separator/>
                            <div>
                                <h4 className="text-md font-medium mb-2">Bank Accounts</h4>
                                <div className="space-y-4">
                                    {bankFields.map((field, index) => (
                                    <div key={field.id} className="border rounded-lg p-4 relative space-y-4 bg-muted/50">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name={`bankAccounts.${index}.name`} render={({ field }) => (
                                                <FormItem><FormLabel>Bank/Account Name</FormLabel><FormControl><Input placeholder="e.g., SBI Overdraft" {...field} /></FormControl><FormMessage /></FormItem>
                                            )}/>
                                            <FormField control={form.control} name={`bankAccounts.${index}.accountNumber`} render={({ field }) => (
                                                <FormItem><FormLabel>Account Number (Optional)</FormLabel><FormControl><Input placeholder="1234567890" {...field} /></FormControl><FormMessage /></FormItem>
                                            )}/>
                                            <FormField control={form.control} name={`bankAccounts.${index}.initialBalance`} render={({ field }) => (
                                                <FormItem><FormLabel>Current Balance</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                            )}/>
                                            <FormField control={form.control} name={`bankAccounts.${index}.sanctionedAmount`} render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Sanctioned Amount (for OD)</FormLabel>
                                                    <FormControl><Input type="number" placeholder="Enter if overdraft account" {...field} /></FormControl>
                                                    <FormDescription>Used to calculate your remaining credit limit.</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}/>
                                        </div>
                                        <FormField control={form.control} name={`bankAccounts.${index}.isOverdraft`} render={({ field }) => (
                                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                                <FormControl><Switch checked={field.value} onCheckedChange={(checked) => {
                                                    field.onChange(checked);
                                                    if (checked) {
                                                        form.getValues('bankAccounts').forEach((_, i) => {
                                                            if (i !== index) form.setValue(`bankAccounts.${i}.isOverdraft`, false);
                                                        });
                                                    }
                                                }} /></FormControl>
                                                <FormLabel className="font-normal">Set as primary Overdraft account</FormLabel>
                                            </FormItem>
                                        )}/>
                                        {bankFields.length > 1 && <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeBank(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                                    </div>
                                    ))}
                                </div>
                                 <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => appendBank({ id: crypto.randomUUID(), name: '', accountNumber: '', initialBalance: 0, isOverdraft: false, sanctionedAmount: 0 })}><PlusCircle size={16} className="mr-2"/> Add Another Account</Button>
                                 {form.formState.errors.bankAccounts && <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.bankAccounts?.message || form.formState.errors.bankAccounts.root?.message}</p>}
                            </div>
                        </div>
                    </div>
                    
                    <div className={step === 2 ? 'block' : 'hidden'}>
                        <CardHeader className="px-0">
                            <CardTitle className="font-headline flex items-center gap-3"><Fuel size={24}/> Step 2: Fuel & Nozzle Setup</CardTitle>
                            <CardDescription>Define the fuels you sell, their prices, costs, and nozzle counts.</CardDescription>
                        </CardHeader>
                        <div className="space-y-4">
                            {fuelFields.map((field, index) => (
                            <div key={field.id} className="border rounded-lg p-4 relative bg-muted/50">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <FormField control={form.control} name={`fuels.${index}.name`} render={({ field }) => (<FormItem><FormLabel>Fuel Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`fuels.${index}.price`} render={({ field }) => (<FormItem><FormLabel>Selling Price/L</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`fuels.${index}.cost`} render={({ field }) => (<FormItem><FormLabel>Cost Price/L</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name={`fuels.${index}.nozzleCount`} render={({ field }) => (<FormItem><FormLabel>Nozzles</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                {fuelFields.length > 1 && <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeFuel(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                            </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => appendFuel({ id: crypto.randomUUID(), name: '', price: 0, cost: 0, nozzleCount: 0 })}><PlusCircle size={16} className="mr-2"/> Add Another Fuel</Button>
                            {form.formState.errors.fuels && <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.fuels?.root?.message || form.formState.errors.fuels?.message}</p>}
                        </div>
                    </div>

                    <div className={step === 3 ? 'block' : 'hidden'}>
                         <CardHeader className="px-0">
                            <CardTitle className="font-headline flex items-center gap-3"><Database size={24}/> Step 3: Storage Tank Setup</CardTitle>
                            <CardDescription>Configure your underground storage tanks and their initial stock levels.</CardDescription>
                        </CardHeader>
                        <div className="space-y-4">
                            {tankFields.map((field, index) => (
                            <div key={field.id} className="border rounded-lg p-4 relative bg-muted/50">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    <div className="col-span-2 lg:col-span-1"><FormField control={form.control} name={`tanks.${index}.name`} render={({ field }) => (<FormItem><FormLabel>Tank Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/></div>
                                    <div className="col-span-2 lg:col-span-1">
                                        <FormField control={form.control} name={`tanks.${index}.fuelId`} render={({ field }) => (
                                            <FormItem><FormLabel>Fuel</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                                    <SelectContent>{watchedFuels.map((fuel) => (<SelectItem key={fuel.id} value={fuel.id}>{fuel.name}</SelectItem>))}</SelectContent>
                                                </Select><FormMessage />
                                            </FormItem>
                                        )}/>
                                    </div>
                                     <div className="col-span-2 lg:col-span-1">
                                        <FormField control={form.control} name={`tanks.${index}.capacity`} render={({ field }) => (<FormItem><FormLabel>Capacity (L)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    </div>
                                    <div className="col-span-2 lg:col-span-1">
                                        <FormField control={form.control} name={`tanks.${index}.initialStock`} render={({ field }) => (<FormItem><FormLabel>Current Stock (L)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
                                    </div>
                                    <div className="col-span-2 lg:col-span-1">
                                        <FormField control={form.control} name={`tanks.${index}.dipChartType`} render={({ field }) => (
                                        <FormItem><FormLabel>DIP Chart</FormLabel>
                                            <Select onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)} value={field.value || 'none'}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="none">None</SelectItem><SelectItem value="16kl">16KL</SelectItem><SelectItem value="21kl">21KL</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription className="text-xs">Optional. For auto stock calculation.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                        )}/>
                                    </div>
                                </div>
                                {tankFields.length > 1 && <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => removeTank(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                            </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" onClick={() => appendTank({ id: crypto.randomUUID(), name: '', fuelId: watchedFuels.length > 0 ? watchedFuels[0].id : '', capacity: 10000, initialStock: 0, dipChartType: undefined })}>
                                <PlusCircle size={16} className="mr-2"/> Add Another Tank
                            </Button>
                        </div>
                    </div>

                    <Separator/>

                    <div className="flex justify-between items-center">
                        <div>
                            {step > 1 && (
                                <Button type="button" variant="outline" onClick={handleBack}>
                                    Back
                                </Button>
                            )}
                        </div>
                        <div>
                            {step < 3 && (
                                <Button type="button" onClick={handleNext}>
                                    Next Step
                                </Button>
                            )}
                            {step === 3 && (
                                <Button type="submit" size="lg">
                                    Complete Setup & Launch App
                                </Button>
                            )}
                        </div>
                    </div>
                  </form>
                </Form>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
