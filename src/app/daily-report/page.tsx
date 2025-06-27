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
import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';

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

const dailyReportSchema = z.object({
  date: z.string().min(1, "Date is required"),
  meterReadings: z.array(meterReadingSchema),
  creditSales: z.coerce.number().min(0).default(0),
  onlinePayments: z.coerce.number().min(0).default(0),
});

type DailyReportFormValues = z.infer<typeof dailyReportSchema>;

export default function DailyReportPage() {
  const { settings, addDailyReport } = useAppState();
  const router = useRouter();
  const { toast } = useToast();

  const latestDailyReport = settings?.dailyReports?.[0]; // Assumes reports are sorted desc by date

  const form = useForm<DailyReportFormValues>({
    resolver: zodResolver(dailyReportSchema),
    defaultValues: {
      date: latestDailyReport ? format(addDays(parseISO(latestDailyReport.date), 1), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      meterReadings: settings?.fuels.flatMap(fuel =>
        Array.from({ length: settings.nozzlesPerFuel?.[fuel.id] || 0 }, (_, i) => {
          const nozzleId = i + 1;
          const latestReading = latestDailyReport?.meterReadings.find(r => r.fuelId === fuel.id && r.nozzleId === nozzleId);
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
      onlinePayments: 0,
    }
  });

  const { fields: meterReadingFields } = useFieldArray({
    control: form.control,
    name: "meterReadings",
  });

  const watchedMeterReadings = form.watch('meterReadings');
  const watchedDate = form.watch('date');
  const watchedCreditSales = form.watch('creditSales');
  const watchedOnlinePayments = form.watch('onlinePayments');

  useEffect(() => {
    if (!settings) return;

    watchedMeterReadings.forEach((reading, index) => {
      const fuel = settings.fuels.find(f => f.id === reading.fuelId);
      if (!fuel) return;
      
      const { sellingPrice } = getFuelPricesForDate(fuel.id, watchedDate, settings.fuelPriceHistory, { sellingPrice: fuel.price, costPrice: fuel.cost });
      
      const saleLitres = Math.max(0, reading.closing - reading.opening - reading.testing);
      const saleAmount = saleLitres * sellingPrice;

      form.setValue(`meterReadings.${index}.saleLitres`, saleLitres, { shouldValidate: true });
      form.setValue(`meterReadings.${index}.saleAmount`, saleAmount);
    });

  }, [watchedMeterReadings, watchedDate, settings, form]);

  const totalSales = watchedMeterReadings.reduce((acc, r) => acc + r.saleAmount, 0);
  const cashInHand = totalSales - watchedCreditSales - watchedOnlinePayments;

  const onSubmit = (data: DailyReportFormValues) => {
    addDailyReport({
      ...data,
      totalSales,
      cashInHand,
    });
    toast({ title: 'Success', description: 'Daily report has been saved and all ledgers are updated.' });
    router.push('/');
  };
  
  if (!settings) return <AppLayout><div>Loading settings...</div></AppLayout>;

  // Group readings by fuel for the UI
  const readingsByFuel = settings.fuels.map(fuel => ({
    fuel,
    readings: meterReadingFields.map((field, index) => ({ field, index })).filter(({ field }) => field.fuelId === fuel.id)
  })).filter(group => group.readings.length > 0);
  
  return (
    <AppLayout>
      <PageHeader title="Daily Report Entry" description="Enter daily sales data to automatically update stock and ledgers." />
      <div className="p-4 md:p-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Report Date</CardTitle></CardHeader>
              <CardContent>
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel>Select the date for this report</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Meter Readings</CardTitle>
                <CardDescription>Enter closing meter and testing values. Opening meters are pre-filled.</CardDescription>
              </CardHeader>
              <CardContent>
                 <Accordion type="multiple" defaultValue={settings.fuels.map(f => f.id)} className="w-full">
                    {readingsByFuel.map(({ fuel, readings }) => (
                      <AccordionItem key={fuel.id} value={fuel.id}>
                        <AccordionTrigger className="text-lg font-semibold">{fuel.name}</AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                          <div className="grid grid-cols-[repeat(6,1fr)] gap-4 font-semibold text-sm text-muted-foreground px-2 items-center">
                            <span>Nozzle</span>
                            <span>Opening</span>
                            <span>Closing</span>
                            <span>Testing (L)</span>
                            <span className="text-right">Sale (L)</span>
                            <span className="text-right">Sale (INR)</span>
                          </div>
                          {readings.map(({ field, index }) => (
                            <div key={field.id} className="grid grid-cols-[repeat(6,1fr)] gap-4 items-start px-2">
                                <FormLabel className="pt-2">Nozzle {field.nozzleId}</FormLabel>
                                <FormField control={form.control} name={`meterReadings.${index}.opening`} render={({ field }) => <FormItem><FormControl><Input type="number" readOnly className="bg-muted" {...field} /></FormControl><FormMessage/></FormItem>} />
                                <FormField control={form.control} name={`meterReadings.${index}.closing`} render={({ field }) => <FormItem><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>} />
                                <FormField control={form.control} name={`meterReadings.${index}.testing`} render={({ field }) => <FormItem><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>} />
                                <FormField control={form.control} name={`meterReadings.${index}.saleLitres`} render={({ field }) => <FormItem><FormControl><Input type="number" readOnly className="text-right bg-muted" value={field.value.toFixed(2)} /></FormControl></FormItem>} />
                                <FormField control={form.control} name={`meterReadings.${index}.saleAmount`} render={({ field }) => <FormItem><FormControl><Input readOnly className="text-right bg-muted" value={formatCurrency(field.value)} /></FormControl></FormItem>} />
                            </div>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                 </Accordion>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Financials</CardTitle><CardDescription>Enter credit sales and total online payments for the day.</CardDescription></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6">
                <FormField control={form.control} name="creditSales" render={({ field }) => <FormItem><FormLabel>Credit Sales</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="onlinePayments" render={({ field }) => <FormItem><FormLabel>Online Payments (PhonePe, etc.)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
              </CardContent>
            </Card>

            <Card className="sticky bottom-4 shadow-2xl">
              <CardHeader><CardTitle>Daily Summary</CardTitle></CardHeader>
              <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2 text-lg">
                  <p>Total Sales: <span className="font-bold font-headline">{formatCurrency(totalSales)}</span></p>
                  <p>Less Credit: <span className="font-bold font-headline text-destructive">{formatCurrency(watchedCreditSales)}</span></p>
                  <p>Less Online: <span className="font-bold font-headline text-destructive">{formatCurrency(watchedOnlinePayments)}</span></p>
                </div>
                 <div className="bg-primary text-primary-foreground p-4 rounded-lg text-center">
                    <p className="text-base font-medium">Cash in Hand</p>
                    <p className="text-2xl font-bold font-headline">{formatCurrency(cashInHand)}</p>
                </div>
              </CardContent>
              <Separator />
               <CardContent className="pt-4">
                 <Button type="submit" size="lg" className="w-full bg-accent hover:bg-accent/90">Submit Daily Report</Button>
              </CardContent>
            </Card>

          </form>
        </Form>
      </div>
    </AppLayout>
  );
}
