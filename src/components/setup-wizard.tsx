'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAppState } from '@/contexts/app-state-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Droplets, Fuel, Database, Trash2, PlusCircle } from 'lucide-react';
import { Separator } from './ui/separator';
import type { Settings } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const fuelSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Fuel name is required.'),
  price: z.coerce.number().min(0, 'Price must be positive.'),
  cost: z.coerce.number().min(0, 'Cost must be positive.'),
});

const tankSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Tank name is required.'),
  fuelId: z.string().min(1, 'Please select a fuel type.'),
  capacity: z.coerce.number().min(1, 'Capacity must be greater than 0.'),
  initialStock: z.coerce.number().min(0, 'Initial stock cannot be negative.'),
});

const setupSchema = z.object({
  pumpName: z.string().min(1, 'Pump name is required.'),
  nozzleCount: z.coerce.number().int().min(1, 'Must have at least one nozzle.'),
  fuels: z.array(fuelSchema).min(1, 'At least one fuel type is required.'),
  tanks: z.array(tankSchema).min(1, 'At least one tank is required.'),
});

export default function SetupWizard() {
  const { finishSetup } = useAppState();
  
  const [initialValues] = useState(() => {
    const petrolFuel = { id: crypto.randomUUID(), name: 'Petrol', price: 100, cost: 95 };
    const dieselFuel = { id: crypto.randomUUID(), name: 'Diesel', price: 92, cost: 88 };
    const xtraFuel = { id: crypto.randomUUID(), name: 'Xtra', price: 110, cost: 104 };
    
    return {
      pumpName: '',
      nozzleCount: 1,
      fuels: [petrolFuel, dieselFuel, xtraFuel],
      tanks: [
        { id: crypto.randomUUID(), name: 'Petrol Tank', fuelId: petrolFuel.id, capacity: 20000, initialStock: 0 },
        { id: crypto.randomUUID(), name: 'Diesel Tank', fuelId: dieselFuel.id, capacity: 20000, initialStock: 0 },
        { id: crypto.randomUUID(), name: 'Xtra Fuel Tank', fuelId: xtraFuel.id, capacity: 15000, initialStock: 0 },
      ],
    }
  });

  const form = useForm<z.infer<typeof setupSchema>>({
    resolver: zodResolver(setupSchema),
    defaultValues: initialValues,
  });

  const { fields: fuelFields, append: appendFuel, remove: removeFuel } = useFieldArray({
    control: form.control,
    name: "fuels",
  });

  const { fields: tankFields, append: appendTank, remove: removeTank } = useFieldArray({
    control: form.control,
    name: "tanks",
  });
  
  const watchedFuels = form.watch('fuels');

  const onSubmit = (data: z.infer<typeof setupSchema>) => {
    const settings: Settings = {
      ...data,
      nozzles: [], 
    };
    finishSetup(settings);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Droplets className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="font-headline text-2xl">Welcome to PetroVisor</CardTitle>
          <CardDescription>Let's get your station set up in a few steps.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <FormField
                control={form.control}
                name="pumpName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Petrol Pump Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Star Fuels" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Separator />

              <div>
                <h3 className="text-lg font-medium font-headline flex items-center gap-2"><Fuel size={20}/> Fuel Types</h3>
                <p className="text-sm text-muted-foreground mb-4">Define the fuels you sell, their prices, and costs.</p>
                {fuelFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end mb-2 p-3 border rounded-lg">
                    <FormField control={form.control} name={`fuels.${index}.name`} render={({ field }) => <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name={`fuels.${index}.price`} render={({ field }) => <FormItem><FormLabel>Selling Price</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name={`fuels.${index}.cost`} render={({ field }) => <FormItem><FormLabel>Cost Price</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeFuel(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendFuel({ id: crypto.randomUUID(), name: '', price: 0, cost: 0 })}><PlusCircle size={16} className="mr-2"/> Add Fuel</Button>
              </div>

              <Separator />
              
               <div>
                <h3 className="text-lg font-medium font-headline flex items-center gap-2"><Database size={20}/> Storage Tanks</h3>
                <p className="text-sm text-muted-foreground mb-4">Configure your underground storage tanks.</p>
                {tankFields.map((field, index) => (
                   <div key={field.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-end mb-2 p-3 border rounded-lg">
                    <FormField control={form.control} name={`tanks.${index}.name`} render={({ field }) => <FormItem><FormLabel>Tank Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField
                      control={form.control}
                      name={`tanks.${index}.fuelId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fuel</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a fuel" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {watchedFuels.map((fuel) => (
                                <SelectItem key={fuel.id} value={fuel.id}>
                                  {fuel.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField control={form.control} name={`tanks.${index}.capacity`} render={({ field }) => <FormItem><FormLabel>Capacity (L)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name={`tanks.${index}.initialStock`} render={({ field }) => <FormItem><FormLabel>Current Stock (L)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTank(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => appendTank({ 
                    id: crypto.randomUUID(), 
                    name: '', 
                    fuelId: watchedFuels.length > 0 ? watchedFuels[0].id : '', 
                    capacity: 10000, 
                    initialStock: 0 
                  })}
                >
                  <PlusCircle size={16} className="mr-2"/> Add Tank
                </Button>
              </div>

               <Separator />
               
              <FormField
                control={form.control}
                name="nozzleCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Number of Nozzles</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full bg-accent hover:bg-accent/90">Finish Setup</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
