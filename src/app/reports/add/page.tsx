'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAppState } from '@/contexts/app-state-provider';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, getFuelPriceForDate } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import type { MonthlyReport, FuelSale, MeterReading } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';

const meterReadingSchema = z.object({
    nozzleId: z.number(),
    opening: z.coerce.number().min(0),
    closing: z.coerce.number().min(0),
    testing: z.coerce.number().min(0),
    saleLitres: z.number(),
    saleAmount: z.number(),
    estProfit: z.number(),
}).refine(data => data.closing >= data.opening, {
    message: "Closing meter cannot be less than opening meter.",
    path: ["closing"],
});

const fuelSaleSchema = z.object({
    fuelId: z.string(),
    readings: z.array(meterReadingSchema),
    totalLitres: z.number(),
    totalSales: z.number(),
    estProfit: z.number(),
    pricePerLitre: z.number(),
    costPerLitre: z.number(),
});

const monthlyReportSchema = z.object({
    id: z.string(),
    endDate: z.string().min(1, "Month ending date is required").refine((date) => {
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Allow today
        return parseISO(date) <= today;
    }, {
        message: "Month ending date cannot be in the future."
    }),
    bankDeposits: z.coerce.number().min(0),
    creditSales: z.coerce.number().min(0),
    fuelSales: z.array(fuelSaleSchema),
});


export default function AddReportPage() {
    const { settings, addOrUpdateMonthlyReport } = useAppState();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const reportId = searchParams.get('id');

    const existingReport = reportId ? settings?.monthlyReports.find(r => r.id === reportId) : undefined;
    
    const form = useForm<z.infer<typeof monthlyReportSchema>>({
        resolver: zodResolver(monthlyReportSchema),
        defaultValues: existingReport ? {
            ...existingReport,
            fuelSales: settings?.fuels.map(fuel => {
                const existingFuelSale = existingReport.fuelSales.find(fs => fs.fuelId === fuel.id);
                if (existingFuelSale) return existingFuelSale;
                return {
                    fuelId: fuel.id,
                    readings: Array.from({ length: settings.nozzlesPerFuel?.[fuel.id] || 0 }, (_, i) => ({
                        nozzleId: i + 1, opening: 0, closing: 0, testing: 0, saleLitres: 0, saleAmount: 0, estProfit: 0,
                    })),
                    totalLitres: 0, totalSales: 0, estProfit: 0, pricePerLitre: 0, costPerLitre: 0,
                };
            }) || []
        } : {
            id: crypto.randomUUID(),
            endDate: format(new Date(), 'yyyy-MM-dd'),
            bankDeposits: 0,
            creditSales: 0,
            fuelSales: settings?.fuels.map(fuel => ({
                fuelId: fuel.id,
                readings: Array.from({ length: settings.nozzlesPerFuel?.[fuel.id] || 0 }, (_, i) => ({
                    nozzleId: i + 1,
                    opening: 0,
                    closing: 0,
                    testing: 0,
                    saleLitres: 0,
                    saleAmount: 0,
                    estProfit: 0,
                })),
                totalLitres: 0,
                totalSales: 0,
                estProfit: 0,
                pricePerLitre: 0,
                costPerLitre: 0,
            })) || []
        },
    });

    const { fields: fuelSalesFields } = useFieldArray({
        control: form.control,
        name: "fuelSales",
    });

    const watchedFuelSales = form.watch('fuelSales');
    const watchedEndDate = form.watch('endDate');
    const watchedBankDeposits = form.watch('bankDeposits');
    const watchedCreditSales = form.watch('creditSales');

    // Pre-fill opening meters on date change for new reports
    useEffect(() => {
        if (reportId || !settings || !settings.monthlyReports || settings.monthlyReports.length === 0) {
            return;
        }

        const previousReport = [...settings.monthlyReports]
            .sort((a, b) => b.endDate.localeCompare(a.endDate))
            .find(r => r.endDate < watchedEndDate);
        
        const fuelSales = form.getValues('fuelSales');

        if (!previousReport) {
            fuelSales.forEach((fuelSale, fuelIndex) => {
                fuelSale.readings.forEach((_, readingIndex) => {
                    form.setValue(`fuelSales.${fuelIndex}.readings.${readingIndex}.opening`, 0);
                });
            });
            return;
        }

        fuelSales.forEach((fuelSale, fuelIndex) => {
            const previousFuelSale = previousReport.fuelSales.find(fs => fs.fuelId === fuelSale.fuelId);
            
            fuelSale.readings.forEach((reading, readingIndex) => {
                if (previousFuelSale) {
                    const previousReading = previousFuelSale.readings.find(pr => pr.nozzleId === reading.nozzleId);
                    if (previousReading) {
                        form.setValue(`fuelSales.${fuelIndex}.readings.${readingIndex}.opening`, previousReading.closing);
                    } else {
                        form.setValue(`fuelSales.${fuelIndex}.readings.${readingIndex}.opening`, 0);
                    }
                } else {
                     form.setValue(`fuelSales.${fuelIndex}.readings.${readingIndex}.opening`, 0);
                }
            });
        });

    }, [reportId, watchedEndDate, settings, form]);

    useEffect(() => {
        if (!settings) return;

        watchedFuelSales.forEach((fuelSale, fuelIndex) => {
            const fuel = settings.fuels.find(f => f.id === fuelSale.fuelId);
            if (!fuel) return;

            const { price } = getFuelPriceForDate(fuel.id, watchedEndDate, settings.fuelPriceHistory, fuel.price);
            const cost = fuel.cost;

            form.setValue(`fuelSales.${fuelIndex}.pricePerLitre`, price);
            form.setValue(`fuelSales.${fuelIndex}.costPerLitre`, cost);
            
            let fuelTotalLitres = 0;
            let fuelTotalSales = 0;
            let fuelTotalProfit = 0;

            fuelSale.readings.forEach((reading, readingIndex) => {
                const saleLitres = Math.max(0, reading.closing - reading.opening - reading.testing);
                const saleAmount = saleLitres * price;
                const estProfit = saleLitres * (price - cost);

                form.setValue(`fuelSales.${fuelIndex}.readings.${readingIndex}.saleLitres`, saleLitres, { shouldValidate: true });
                form.setValue(`fuelSales.${fuelIndex}.readings.${readingIndex}.saleAmount`, saleAmount);
                form.setValue(`fuelSales.${fuelIndex}.readings.${readingIndex}.estProfit`, estProfit);

                fuelTotalLitres += saleLitres;
                fuelTotalSales += saleAmount;
                fuelTotalProfit += estProfit;
            });

            form.setValue(`fuelSales.${fuelIndex}.totalLitres`, fuelTotalLitres);
            form.setValue(`fuelSales.${fuelIndex}.totalSales`, fuelTotalSales);
            form.setValue(`fuelSales.${fuelIndex}.estProfit`, fuelTotalProfit);
        });

    }, [watchedFuelSales, watchedEndDate, settings, form]);

    const overallTotalSales = watchedFuelSales.reduce((acc, fs) => acc + fs.totalSales, 0);
    const overallTotalProfit = watchedFuelSales.reduce((acc, fs) => acc + fs.estProfit, 0);
    const overallLitresSold = watchedFuelSales.reduce((acc, fs) => acc + fs.totalLitres, 0);
    const netCash = overallTotalSales - watchedBankDeposits - watchedCreditSales;

    const onSubmit = (data: z.infer<typeof monthlyReportSchema>) => {
        const report: MonthlyReport = {
            ...data,
            totalSales: overallTotalSales,
            estProfit: overallTotalProfit,
            litresSold: overallLitresSold,
            netCash: netCash,
        };
        addOrUpdateMonthlyReport(report);
        toast({ title: 'Success', description: 'Monthly report has been saved.' });
        router.push('/reports');
    };

    if (!settings) {
        return <AppLayout><div>Loading settings...</div></AppLayout>;
    }
    
    return (
        <AppLayout>
            <PageHeader title={existingReport ? 'Edit Monthly Report' : 'Add New Monthly Report'} description="Enter meter readings, deposits, and credit sales for the month." />
            <div className="p-4 md:p-8">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <Card>
                            <CardHeader><CardTitle className="font-headline">General Information</CardTitle></CardHeader>
                            <CardContent className="grid md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="endDate" render={({ field }) => <FormItem><FormLabel>Month Ending Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
                                <FormField control={form.control} name="bankDeposits" render={({ field }) => <FormItem><FormLabel>Bank Deposits This Month</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                                <FormField control={form.control} name="creditSales" render={({ field }) => <FormItem><FormLabel>Credit Sales This Month</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                            </CardContent>
                        </Card>

                        <Card>
                             <CardHeader><CardTitle className="font-headline">Meter Readings</CardTitle><CardDescription>Enter opening and closing meter readings for each nozzle.</CardDescription></CardHeader>
                             <CardContent>
                                <Accordion type="multiple" defaultValue={settings.fuels.map(f => f.id)}>
                                    {fuelSalesFields.map((field, index) => {
                                        const fuel = settings.fuels.find(f => f.id === field.fuelId);
                                        return (
                                            <AccordionItem key={field.id} value={field.fuelId}>
                                                <AccordionTrigger className='text-lg font-semibold'>{fuel?.name} Readings</AccordionTrigger>
                                                <AccordionContent className='pt-2 space-y-4'>
                                                    <div className='grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-4 font-semibold text-sm text-muted-foreground px-2'>
                                                        <span>Nozzle #</span>
                                                        <span>Opening</span>
                                                        <span>Closing</span>
                                                        <span>Testing (L)</span>
                                                        <span className="text-right">Sale (L)</span>
                                                    </div>
                                                    {form.getValues(`fuelSales.${index}.readings`).map((_, readingIndex) => (
                                                        <div key={readingIndex} className='grid grid-cols-[1fr_1fr_1fr_1fr_1fr] gap-4 items-start px-2'>
                                                             <FormLabel className="pt-2">Nozzle {readingIndex + 1}</FormLabel>
                                                            <FormField control={form.control} name={`fuelSales.${index}.readings.${readingIndex}.opening`} render={({ field }) => <FormItem><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                                                            <FormField control={form.control} name={`fuelSales.${index}.readings.${readingIndex}.closing`} render={({ field }) => <FormItem><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                                                            <FormField control={form.control} name={`fuelSales.${index}.readings.${readingIndex}.testing`} render={({ field }) => <FormItem><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                                                             <FormField control={form.control} name={`fuelSales.${index}.readings.${readingIndex}.saleLitres`} render={({ field }) => <FormItem><FormControl><Input type="number" readOnly className="text-right bg-muted" {...field} /></FormControl></FormItem>} />
                                                        </div>
                                                    ))}
                                                    <Separator/>
                                                    <div className="grid md:grid-cols-3 gap-4 text-sm font-medium p-2 rounded-lg bg-muted">
                                                        <p>Total Litres Sold: <span className="font-bold">{form.getValues(`fuelSales.${index}.totalLitres`).toFixed(2)} L</span></p>
                                                        <p>Total Sales: <span className="font-bold">{formatCurrency(form.getValues(`fuelSales.${index}.totalSales`))}</span></p>
                                                        <p>Est. Profit: <span className="font-bold">{formatCurrency(form.getValues(`fuelSales.${index}.estProfit`))}</span></p>
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        )
                                    })}
                                </Accordion>
                             </CardContent>
                        </Card>

                        <Card className="sticky bottom-4">
                            <CardHeader><CardTitle className="font-headline">Overall Summary</CardTitle></CardHeader>
                            <CardContent className="grid md:grid-cols-3 gap-4 text-base">
                                <p>Total Sales: <span className="font-bold font-headline">{formatCurrency(overallTotalSales)}</span></p>
                                <p>Est. Profit: <span className="font-bold font-headline">{formatCurrency(overallTotalProfit)}</span></p>
                                <p className="text-destructive">Net Cash: <span className="font-bold font-headline">{formatCurrency(netCash)}</span></p>
                            </CardContent>
                        </Card>
                        
                        <Button type="submit" size="lg" className="w-full">Save Monthly Report</Button>
                    </form>
                </Form>
            </div>
        </AppLayout>
    )
}
