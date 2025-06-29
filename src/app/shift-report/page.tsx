'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAppState } from '@/contexts/app-state-provider';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, getFuelPricesForDate } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addDays, parseISO } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Link from 'next/link';

const meterReadingSchema = z.object({
  fuelId: z.string(),
  nozzleId: z.number(),
  opening: z.coerce.number().min(0),
  closing: z.coerce.number().min(0),
  testing: z.coerce.number().min(0).default(0),
  saleLitres: z.number(),
  saleAmount: z.number(),
}).refine(data => data.closing >= data.opening, {
  message: "Closing meter cannot be less than opening meter.",
  path: ["closing"],
});

const shiftReportSchema = z.object({
  id: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  employeeId: z.string().min(1, "Please select an employee."),
  shiftType: z.enum(['day', 'night']),
  meterReadings: z.array(meterReadingSchema),
  creditSales: z.coerce.number().min(0).default(0),
  creditCustomerId: z.string().optional(),
  onlinePayments: z.coerce.number().min(0).default(0),
  onlinePaymentsAccountId: z.string().min(1, 'Please select an account for online payments.'),
  lubeSaleName: z.string().optional(),
  lubeSaleAmount: z.coerce.number().min(0).default(0),
});

type ShiftReportFormValues = z.infer<typeof shiftReportSchema>;

export default function ShiftReportPage() {
  const { settings, addOrUpdateShiftReport } = useAppState();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const reportId = searchParams.get('id');
  const isEditing = !!reportId;
  
  const existingReport = useMemo(() => isEditing ? settings?.shiftReports?.find(r => r.id === reportId) : undefined, [isEditing, reportId, settings?.shiftReports]);
  const latestShiftReport = settings?.shiftReports?.[0];

  const form = useForm<ShiftReportFormValues>({
    resolver: zodResolver(shiftReportSchema),
    defaultValues: existingReport || {
      date: latestShiftReport ? format(addDays(parseISO(latestShiftReport.date), 1), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      employeeId: '',
      shiftType: 'day',
      meterReadings: settings?.fuels?.flatMap(fuel =>
        Array.from({ length: settings.nozzlesPerFuel?.[fuel.id] || 0 }, (_, i) => {
          const nozzleId = i + 1;
          const latestReading = latestShiftReport?.meterReadings.find(r => r.fuelId === fuel.id && r.nozzleId === nozzleId);
          return {
            fuelId: fuel.id,
            nozzleId: nozzleId,
            opening: latestReading?.closing || 0,
            closing: latestReading?.closing || 0,
            testing: 0,
            saleLitres: 0,
            saleAmount: 0,
          };
        })
      ) || [],
      creditSales: 0,
      creditCustomerId: '',
      onlinePayments: 0,
      onlinePaymentsAccountId: settings?.bankAccounts?.find(acc => acc.isOverdraft)?.id || settings?.bankAccounts?.[0]?.id || '',
      lubeSaleName: '',
      lubeSaleAmount: 0,
    }
  });

  useEffect(() => {
    if (existingReport) {
      form.reset(existingReport);
    }
  }, [existingReport, form]);

  const { fields: meterReadingFields } = useFieldArray({
    control: form.control,
    name: "meterReadings",
  });

  const watchedValuesString = JSON.stringify(form.watch());

  useEffect(() => {
    if (!settings) return;

    const currentValues = JSON.parse(watchedValuesString);
    const { meterReadings, date } = currentValues;

    meterReadings.forEach((reading: any, index: number) => {
      const fuel = settings.fuels.find(f => f.id === reading.fuelId);
      if (!fuel) return;
      
      const { sellingPrice } = getFuelPricesForDate(fuel.id, date, settings.fuelPriceHistory, { sellingPrice: fuel.price, costPrice: fuel.cost });
      
      const saleLitres = Math.max(0, reading.closing - reading.opening - reading.testing);
      const saleAmount = saleLitres * sellingPrice;

      if (form.getValues(`meterReadings.${index}.saleLitres`) !== saleLitres) {
        form.setValue(`meterReadings.${index}.saleLitres`, saleLitres, { shouldValidate: true });
      }
      if (form.getValues(`meterReadings.${index}.saleAmount`) !== saleAmount) {
        form.setValue(`meterReadings.${index}.saleAmount`, saleAmount);
      }
    });

  }, [watchedValuesString, settings, form]);

  const { meterReadings, creditSales, onlinePayments, lubeSaleAmount } = JSON.parse(watchedValuesString);
  const totalFuelSales = meterReadings.reduce((acc: number, r: any) => acc + r.saleAmount, 0);
  const totalSales = totalFuelSales + (lubeSaleAmount || 0);
  const cashInHand = totalSales - creditSales - onlinePayments;

  const onSubmit = (data: ShiftReportFormValues) => {
    addOrUpdateShiftReport({
      ...data,
      totalSales,
      cashInHand,
    });
    toast({ title: 'Success', description: `Shift report ${isEditing ? 'updated' : 'saved'} and ledgers updated.` });
    router.push('/dsr-preview');
  };
  
  if (!settings) return <AppLayout><div>Loading settings...</div></AppLayout>;

  const readingsByFuel = (settings.fuels || []).map(fuel => ({
    fuel,
    readings: meterReadingFields.map((field, index) => ({ field, index })).filter(({ field }) => field.fuelId === fuel.id)
  })).filter(group => group.readings.length > 0);
  
  return (
    <AppLayout>
      <PageHeader title={isEditing ? 'Edit Shift Report' : 'Shift Report Entry'} description="Enter shift sales data to automatically update stock and ledgers." />
      <div className="p-4 md:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Shift Information</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-6">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="employeeId" render={({ field }) => (
                    <FormItem><FormLabel>Employee</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger></FormControl>
                            <SelectContent>{(settings.employees || []).length > 0 ? settings.employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>) : <div className="p-4 text-sm text-center">No employees. <Link href="/employees" className="text-primary underline">Add one</Link>.</div>}</SelectContent>
                        </Select><FormMessage />
                    </FormItem>
                )} />
                 <FormField control={form.control} name="shiftType" render={({ field }) => (
                    <FormItem><FormLabel>Shift</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center space-x-4 pt-2">
                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="day" /></FormControl><FormLabel className="font-normal">Day</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="night" /></FormControl><FormLabel className="font-normal">Night</FormLabel></FormItem>
                            </RadioGroup>
                        </FormControl><FormMessage />
                    </FormItem>
                )} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader><CardTitle>Meter Readings</CardTitle><CardDescription>{isEditing ? 'Edit meter readings for this shift.' : 'For your first report, enter opening meter readings. Subsequently, they auto-fill from the previous day.'}</CardDescription></CardHeader>
              <CardContent>
                 <Accordion type="multiple" defaultValue={(settings.fuels || []).map(f => f.id)} className="w-full">
                    {readingsByFuel.map(({ fuel, readings }) => (
                      <AccordionItem key={fuel.id} value={fuel.id}>
                        <AccordionTrigger className="text-lg font-semibold">{fuel.name}</AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                          <div className="grid grid-cols-[repeat(6,1fr)] gap-4 font-semibold text-sm text-muted-foreground px-2 items-center">
                            <span>Nozzle</span><span>Opening</span><span>Closing</span><span>Testing (L)</span><span className="text-right">Sale (L)</span><span className="text-right">Sale (INR)</span>
                          </div>
                          {readings.map(({ field, index }) => (
                            <div key={field.id} className="grid grid-cols-[repeat(6,1fr)] gap-4 items-start px-2">
                                <FormLabel className="pt-2">Nozzle {field.nozzleId}</FormLabel>
                                <FormField control={form.control} name={`meterReadings.${index}.opening`} render={({ field }) => <FormItem><FormControl><Input type="number" readOnly={!isEditing && !!latestShiftReport} className={!isEditing && !!latestShiftReport ? "bg-muted/50" : ""} {...field} /></FormControl><FormMessage/></FormItem>} />
                                <FormField control={form.control} name={`meterReadings.${index}.closing`} render={({ field }) => <FormItem><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>} />
                                <FormField control={form.control} name={`meterReadings.${index}.testing`} render={({ field }) => <FormItem><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>} />
                                <FormField control={form.control} name={`meterReadings.${index}.saleLitres`} render={({ field }) => <FormItem><FormControl><Input type="text" readOnly className="text-right bg-muted/50" value={field.value.toFixed(2)} /></FormControl></FormItem>} />
                                <FormField control={form.control} name={`meterReadings.${index}.saleAmount`} render={({ field }) => <FormItem><FormControl><Input type="text" readOnly className="text-right bg-muted/50" value={formatCurrency(field.value)} /></FormControl></FormItem>} />
                            </div>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                 </Accordion>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Financials</CardTitle><CardDescription>Enter other sales and payments for the day.</CardDescription></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="lubeSaleName" render={({ field }) => <FormItem><FormLabel>Lube Sale Name (Optional)</FormLabel><FormControl><Input placeholder="e.g., Castrol GTX" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="lubeSaleAmount" render={({ field }) => <FormItem><FormLabel>Lube Sale Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="creditSales" render={({ field }) => <FormItem><FormLabel>Credit Sales</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="creditCustomerId" render={({ field }) => (
                        <FormItem><FormLabel>Credit To</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger></FormControl>
                                <SelectContent>{(settings.customers || []).map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent>
                            </Select><FormMessage />
                        </FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="onlinePayments" render={({ field }) => <FormItem><FormLabel>Online Payments</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name="onlinePaymentsAccountId" render={({ field }) => (
                        <FormItem><FormLabel>Deposit To</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select an account" /></SelectTrigger></FormControl>
                                <SelectContent>{(settings.bankAccounts || []).map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent>
                            </Select><FormMessage />
                        </FormItem>
                    )} />
                </div>
              </CardContent>
            </Card>

            <Card className="sticky bottom-4 shadow-2xl bg-card/80 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle>Daily Summary Preview</CardTitle>
                    <CardDescription>Review the calculated totals before submitting.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm p-4 border rounded-lg bg-muted/50">
                        <div className="flex justify-between">
                            <span>Total Fuel Sales</span>
                            <span className="font-medium">{formatCurrency(totalFuelSales)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Total Lube Sales</span>
                            <span className="font-medium">{formatCurrency(lubeSaleAmount || 0)}</span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between font-bold text-base">
                            <span>Gross Total Sales</span>
                            <span>{formatCurrency(totalSales)}</span>
                        </div>
                    </div>

                    <div className="space-y-2 text-sm p-4 border rounded-lg bg-muted/50">
                         <div className="flex justify-between">
                            <span>Less: Credit Sales</span>
                            <span className="font-medium text-destructive">-{formatCurrency(creditSales)}</span>
                        </div>
                         <div className="flex justify-between">
                            <span>Less: Online Payments</span>
                            <span className="font-medium text-destructive">-{formatCurrency(onlinePayments)}</span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between items-center font-bold text-lg text-primary">
                            <span>Net Cash to Collect</span>
                            <span className="font-headline text-2xl">{formatCurrency(cashInHand)}</span>
                        </div>
                    </div>
                </CardContent>
                <CardContent className="pt-0">
                    <Button type="submit" size="lg" className="w-full">
                        {isEditing ? 'Update' : 'Submit'} Shift Report
                    </Button>
                </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}
