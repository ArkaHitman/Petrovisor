
'use client';

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAppState } from '@/contexts/app-state-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Droplets, Fuel, Database, Trash2, PlusCircle, Landmark } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { Settings, NozzlesPerFuel, Fuel as FuelType, BankAccount } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from './ui/switch';

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

export default function SetupWizard() {
  const { finishSetup } = useAppState();
  
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
      fuelPriceHistory: [],
      nozzlesPerFuel,
      managerLedger: [],
      bankLedger: [],
      creditHistory: [],
      miscCollections: [],
      monthlyReports: [],
      dailyReports: [],
      purchases: [],
    };
    finishSetup(settings);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4 animate-fadeInScaleUp">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><Droplets className="h-8 w-8 text-primary" /></div>
          <CardTitle className="font-headline text-2xl">Welcome to PetroVisor</CardTitle>
          <CardDescription>Let's get your station set up in a few steps.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <FormField control={form.control} name="pumpName" render={({ field }) => (
                <FormItem><FormLabel>Petrol Pump Name</FormLabel><FormControl><Input placeholder="e.g., Star Fuels" {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <Separator />

              <div>
                <h3 className="text-lg font-medium font-headline flex items-center gap-2"><Landmark size={20}/>Bank Accounts</h3>
                <p className="text-sm text-muted-foreground mb-4">Define all your business bank accounts. You must have at least one.</p>
                {bankFields.map((field, index) => (
                  <Card key={field.id} className="p-3 mb-2 relative">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name={`bankAccounts.${index}.name`} render={({ field }) => (
                            <FormItem><FormLabel>Bank/Account Name</FormLabel><FormControl><Input placeholder="e.g., SBI Overdraft" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name={`bankAccounts.${index}.accountNumber`} render={({ field }) => (
                            <FormItem><FormLabel>Account Number</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name={`bankAccounts.${index}.initialBalance`} render={({ field }) => (
                            <FormItem><FormLabel>Current Balance</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                        <FormField control={form.control} name={`bankAccounts.${index}.sanctionedAmount`} render={({ field }) => (
                            <FormItem><FormLabel>Sanctioned Amount</FormLabel><FormControl><Input type="number" placeholder="For OD accounts" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    </div>
                     <div className="flex items-center space-x-2 mt-4">
                        <FormField control={form.control} name={`bankAccounts.${index}.isOverdraft`} render={({ field }) => (
                            <FormItem className="flex items-center space-x-2">
                                <FormControl><Switch checked={field.value} onCheckedChange={(checked) => {
                                    field.onChange(checked);
                                    if (checked) {
                                        form.getValues('bankAccounts').forEach((_, i) => {
                                            if (i !== index) form.setValue(`bankAccounts.${i}.isOverdraft`, false);
                                        });
                                    }
                                }} /></FormControl>
                                <FormLabel>Is Overdraft Account?</FormLabel>
                            </FormItem>
                        )}/>
                     </div>
                     {bankFields.length > 1 && <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1" onClick={() => removeBank(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </Card>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendBank({ id: crypto.randomUUID(), name: '', accountNumber: '', initialBalance: 0, isOverdraft: false, sanctionedAmount: 0 })}><PlusCircle size={16} className="mr-2"/> Add Bank Account</Button>
                {form.formState.errors.bankAccounts && <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.bankAccounts?.message}</p>}
              </div>

               <Separator />
               <div>
                  <h3 className="text-lg font-medium font-headline">Manager Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                     <FormField control={form.control} name="managerInitialBalance" render={({ field }) => (
                      <FormItem><FormLabel>Initial Manager Balance</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  </div>
               </div>

              <Separator />

              <div>
                <h3 className="text-lg font-medium font-headline flex items-center gap-2"><Fuel size={20}/> Fuel Types & Nozzles</h3>
                <p className="text-sm text-muted-foreground mb-4">Define the fuels you sell, their prices, costs, and nozzle counts.</p>
                {fuelFields.map((field, index) => (
                  <Card key={field.id} className="p-3 mb-2">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                      <div className="sm:col-span-3"><FormField control={form.control} name={`fuels.${index}.name`} render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
                      <div className="sm:col-span-3"><FormField control={form.control} name={`fuels.${index}.price`} render={({ field }) => (<FormItem><FormLabel>Selling Price</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
                      <div className="sm:col-span-3"><FormField control={form.control} name={`fuels.${index}.cost`} render={({ field }) => (<FormItem><FormLabel>Cost Price</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
                      <div className="sm:col-span-2"><FormField control={form.control} name={`fuels.${index}.nozzleCount`} render={({ field }) => (<FormItem><FormLabel>Nozzles</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
                      <div className="sm:col-span-1"><Button type="button" variant="ghost" size="icon" onClick={() => removeFuel(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                    </div>
                  </Card>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendFuel({ id: crypto.randomUUID(), name: '', price: 0, cost: 0, nozzleCount: 0 })}><PlusCircle size={16} className="mr-2"/> Add Fuel</Button>
                {form.formState.errors.fuels && <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.fuels?.message}</p>}
              </div>

              <Separator />
              
               <div>
                <h3 className="text-lg font-medium font-headline flex items-center gap-2"><Database size={20}/> Storage Tanks</h3>
                <p className="text-sm text-muted-foreground mb-4">Configure your underground storage tanks.</p>
                {tankFields.map((field, index) => (
                  <Card key={field.id} className="p-3 mb-2">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
                      <div className="md:col-span-2"><FormField control={form.control} name={`tanks.${index}.name`} render={({ field }) => (<FormItem><FormLabel>Tank Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/></div>
                      <div className="md:col-span-1">
                        <FormField control={form.control} name={`tanks.${index}.fuelId`} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Fuel</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                    <SelectContent>{watchedFuels.map((fuel) => (<SelectItem key={fuel.id} value={fuel.id}>{fuel.name}</SelectItem>))}</SelectContent>
                                </Select><FormMessage />
                            </FormItem>
                        )}/>
                      </div>
                      <div className="md:col-span-1">
                       <FormField control={form.control} name={`tanks.${index}.dipChartType`} render={({ field }) => (
                          <FormItem>
                              <FormLabel>DIP Chart</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || 'none'}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                     <SelectItem value="none">None</SelectItem><SelectItem value="16kl">16KL</SelectItem><SelectItem value="21kl">21KL</SelectItem>
                                  </SelectContent>
                              </Select><FormMessage />
                          </FormItem>
                       )}/>
                    </div>
                    <div className="md:col-span-1"><FormField control={form.control} name={`tanks.${index}.capacity`} render={({ field }) => (<FormItem><FormLabel>Capacity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/></div>
                    <div className="md:col-span-1"><FormField control={form.control} name={`tanks.${index}.initialStock`} render={({ field }) => (<FormItem><FormLabel>Stock</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/></div>
                      <div className="flex justify-end w-full md:col-span-6"><Button type="button" variant="ghost" size="icon" onClick={() => removeTank(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div>
                    </div>
                  </Card>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendTank({ id: crypto.randomUUID(), name: '', fuelId: watchedFuels.length > 0 ? watchedFuels[0].id : '', capacity: 10000, initialStock: 0, dipChartType: 'none' })}>
                    <PlusCircle size={16} className="mr-2"/> Add Tank
                </Button>
              </div>

              <Separator />

              <Button type="submit" className="w-full bg-accent hover:bg-accent/90">Finish Setup</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
