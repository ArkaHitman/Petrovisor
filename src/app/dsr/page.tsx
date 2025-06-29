
'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FileUp, Loader2, Bot, CheckCircle, AlertTriangle, FileText, Pencil } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { analyzeDsr, type AnalyzeDsrOutput } from '@/ai/flows/analyze-dsr-flow';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, getFuelPricesForDate } from '@/lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';

type DailyReportData = AnalyzeDsrOutput[0];

// --- Start of DSR Edit Form ---

const dailyEntrySchema = z.object({
  date: z.string(),
  meterReadings: z.array(z.object({
    fuelId: z.string(),
    nozzleId: z.number(),
    opening: z.number(),
    closing: z.number(),
    testing: z.number(),
    saleLitres: z.number(),
    saleAmount: z.number(),
  })),
  lubeSaleAmount: z.coerce.number().min(0).default(0),
  creditSales: z.coerce.number().min(0).default(0),
  onlinePayments: z.coerce.number().min(0).default(0),
  cashInHand: z.number(),
});

const dsrFormSchema = z.object({
  employeeId: z.string().min(1, "Please select an employee."),
  shiftType: z.enum(['day', 'night']),
  onlinePaymentsAccountId: z.string().min(1, "Please select an account."),
  reports: z.array(dailyEntrySchema),
});

type DsrFormValues = z.infer<typeof dsrFormSchema>;

function DsrEditForm({ dailyReports, onSave, existingReportDates }: { dailyReports: DailyReportData[], onSave: (data: DsrFormValues) => void, existingReportDates: string[] }) {
    const { settings } = useAppState();
    const router = useRouter();
    const [showOverwriteDialog, setShowOverwriteDialog] = useState(existingReportDates.length > 0);

    const formMethods = useForm<DsrFormValues>({
        resolver: zodResolver(dsrFormSchema),
        defaultValues: {
            employeeId: settings?.employees[0]?.id || '',
            shiftType: 'day',
            onlinePaymentsAccountId: settings?.bankAccounts.find(acc => acc.isOverdraft)?.id || settings?.bankAccounts[0]?.id || '',
            reports: [],
        },
    });

    const { control, setValue, watch, handleSubmit } = formMethods;
    const { fields } = useFieldArray({ control, name: 'reports' });
    const watchedReportsString = JSON.stringify(watch('reports'));

    useEffect(() => {
        if (!settings) return;
        const reportsData = dailyReports.map(dr => {
            const meterReadings = dr.meterReadings.map(mr => {
                 const fuel = settings.fuels.find(f => f.name.toLowerCase() === mr.fuelName.toLowerCase());
                 return { ...mr, fuelId: fuel?.id || '' };
            });
            return {
                ...dr,
                lubeSaleAmount: dr.lubricantSales || 0,
                creditSales: dr.creditSales || 0,
                onlinePayments: dr.phonepeSales || 0,
                cashInHand: 0, // Will be calculated
                meterReadings,
            };
        });
        setValue('reports', reportsData);
    }, [dailyReports, setValue, settings]);
    
    useEffect(() => {
        if (!settings) return;
        const reports = JSON.parse(watchedReportsString);
        reports.forEach((report: any, index: number) => {
            let totalSales = report.lubeSaleAmount || 0;
            report.meterReadings.forEach((reading: any, readingIndex: number) => {
                 const fuel = settings.fuels.find(f => f.id === reading.fuelId);
                 if (!fuel) return;

                 const { sellingPrice } = getFuelPricesForDate(fuel.id, report.date, settings.fuelPriceHistory, { sellingPrice: fuel.price, costPrice: fuel.cost });
                 const saleLitres = Math.max(0, reading.closing - reading.opening - reading.testing);
                 const saleAmount = saleLitres * sellingPrice;
                 
                 setValue(`reports.${index}.meterReadings.${readingIndex}.saleLitres`, saleLitres);
                 setValue(`reports.${index}.meterReadings.${readingIndex}.saleAmount`, saleAmount);
                 totalSales += saleAmount;
            });
            const cashInHand = totalSales - (report.creditSales || 0) - (report.onlinePayments || 0);
            setValue(`reports.${index}.cashInHand`, cashInHand);
        });
    }, [watchedReportsString, setValue, settings]);


    const handleProceed = () => {
        onSave(formMethods.getValues());
    };

    if (!settings) return null;

    return (
        <FormProvider {...formMethods}>
            <form onSubmit={handleSubmit(handleProceed)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">3. Review & Save Daily Reports</CardTitle>
                        <CardDescription>
                            The AI has extracted {dailyReports.length} daily entries. Review them, assign an employee, and save.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
                             <FormField control={control} name="employeeId" render={({ field }) => (
                                <FormItem><FormLabel>Assign to Employee</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger></FormControl>
                                        <SelectContent>{settings.employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                                    </Select><FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={control} name="shiftType" render={({ field }) => (
                                <FormItem><FormLabel>Shift Type</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4 pt-2">
                                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="day" /></FormControl><FormLabel className="font-normal">Day</FormLabel></FormItem>
                                            <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="night" /></FormControl><FormLabel className="font-normal">Night</FormLabel></FormItem>
                                        </RadioGroup>
                                    </FormControl><FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={control} name="onlinePaymentsAccountId" render={({ field }) => (
                                <FormItem><FormLabel>Online Payment Account</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger></FormControl>
                                        <SelectContent>{settings.bankAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent>
                                    </Select><FormMessage />
                                </FormItem>
                            )} />
                        </div>
                        <Accordion type="multiple" className="w-full">
                            {fields.map((field, index) => (
                                <AccordionItem key={field.id} value={field.id}>
                                    <AccordionTrigger>
                                        <div className="flex justify-between w-full pr-4">
                                            <span>{format(parseISO(watch(`reports.${index}.date`)), 'PPP')}</span>
                                            <span className="font-semibold">{formatCurrency(watch(`reports.${index}.cashInHand`))}</span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="p-4 bg-background rounded-b-md">
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <FormField control={control} name={`reports.${index}.lubeSaleAmount`} render={({ field }) => (<FormItem><FormLabel>Lube Sales</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={control} name={`reports.${index}.creditSales`} render={({ field }) => (<FormItem><FormLabel>Credit Sales</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={control} name={`reports.${index}.onlinePayments`} render={({ field }) => (<FormItem><FormLabel>Online Payments</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormItem><FormLabel>Cash In Hand</FormLabel><Input readOnly value={formatCurrency(watch(`reports.${index}.cashInHand`))} className="bg-muted" /></FormItem>
                                            </div>
                                            <h4 className="font-medium text-sm pt-2">Meter Readings</h4>
                                            <div className="text-xs text-muted-foreground grid grid-cols-5 gap-2 px-1">
                                                <span>Fuel</span><span>Opening</span><span>Closing</span><span>Testing</span><span className="text-right">Sale (L)</span>
                                            </div>
                                             {watch(`reports.${index}.meterReadings`).map((mr, mrIndex) => (
                                                <div key={mrIndex} className="grid grid-cols-5 gap-2 items-center text-sm">
                                                     <span>{settings.fuels.find(f=>f.id === mr.fuelId)?.name} #{mr.nozzleId}</span>
                                                     <Input readOnly value={mr.opening} className="bg-muted/50 h-8"/>
                                                     <Input readOnly value={mr.closing} className="bg-muted/50 h-8"/>
                                                     <Input readOnly value={mr.testing} className="bg-muted/50 h-8"/>
                                                     <Input readOnly value={mr.saleLitres.toFixed(2)} className="bg-muted/50 h-8 text-right"/>
                                                </div>
                                             ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
                 <Button type="submit" size="lg" className="w-full">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Save All {fields.length} Reports
                 </Button>
            </form>

            <AlertDialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Overwrite Existing Reports?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Found existing shift reports for {existingReportDates.length} date(s): {existingReportDates.join(', ')}.
                            Continuing will delete these existing reports and replace them with the data from your upload. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => router.push('/dsr-preview')}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => setShowOverwriteDialog(false)}>Overwrite and Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </FormProvider>
    );
}


// --- Main Page Component ---
export default function DsrPage() {
    const { settings, addOrUpdateShiftReport, deleteShiftReport } = useAppState();
    const { toast } = useToast();
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalyzeDsrOutput | null>(null);
    const [existingReportDates, setExistingReportDates] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'upload' | 'review'>('upload');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
            setAnalysisResult(null);
            setStep('upload');
        }
    };
    
    const handleReset = () => {
        setFile(null);
        setError(null);
        setAnalysisResult(null);
        setExistingReportDates([]);
        setStep('upload');
    };

    const handleAnalyze = async () => {
        if (!file) { setError("Please select a file first."); return; }
        setIsAnalyzing(true); setError(null); setAnalysisResult(null);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async (e) => {
                const dsrDataUri = e.target?.result as string;
                if (!dsrDataUri) { setError("Could not read the file."); setIsAnalyzing(false); return; }
                const result = await analyzeDsr({ dsrDataUri });

                if (!result || result.length === 0) {
                    setError("AI could not find any daily entries in the document.");
                    setIsAnalyzing(false);
                    return;
                }
                
                // Check for conflicts
                const resultDates = new Set(result.map(r => r.date));
                const conflictingDates = (settings?.shiftReports || [])
                    .map(sr => sr.date)
                    .filter(date => resultDates.has(date));
                
                setExistingReportDates(Array.from(new Set(conflictingDates)).map(d => format(parseISO(d), 'dd MMM')));

                setAnalysisResult(result);
                setStep('review');
                toast({ title: "Analysis Complete", description: "Please review the extracted daily entries below." });
            };
            reader.onerror = () => { setError("Failed to read file."); };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(errorMessage);
            toast({ title: "Analysis Failed", description: errorMessage, variant: 'destructive' });
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const handleSaveReports = (data: DsrFormValues) => {
        if (!settings) return;
        
        // First, delete existing reports if user agreed to overwrite
        const datesToOverwrite = new Set(dailyReports.map(r => r.date));
        const reportsToDelete = settings.shiftReports.filter(sr => datesToOverwrite.has(sr.date));
        reportsToDelete.forEach(report => deleteShiftReport(report.id));

        const defaultCustomer = settings.customers.find(c => c.id === 'default-credit') || settings.customers[0];
        if (!defaultCustomer) {
            toast({ title: "Error", description: "Default credit customer not found.", variant: 'destructive' });
            return;
        }

        data.reports.forEach(dr => {
            const totalSales = dr.meterReadings.reduce((sum, r) => sum + r.saleAmount, 0) + dr.lubeSaleAmount;
            
            const newReport: Omit<ShiftReport, 'id' | 'createdAt' | 'updatedAt'> = {
                date: dr.date,
                employeeId: data.employeeId,
                shiftType: data.shiftType,
                meterReadings: dr.meterReadings.map(mr => ({...mr, saleLitres: mr.saleLitres, saleAmount: mr.saleAmount})),
                lubeSaleAmount: dr.lubeSaleAmount,
                onlinePayments: dr.onlinePayments,
                onlinePaymentsAccountId: data.onlinePaymentsAccountId,
                creditSales: dr.creditSales > 0 ? [{ customerId: defaultCustomer.id, amount: dr.creditSales }] : [],
                totalSales: totalSales,
                cashInHand: dr.cashInHand,
            };
            addOrUpdateShiftReport(newReport);
        });
        
        toast({ title: "Success!", description: `${data.reports.length} daily reports have been saved.` });
        router.push('/dsr-preview');
    };

    const dailyReports = analysisResult || [];

  return (
    <AppLayout>
      <PageHeader
        title="AI DSR Analysis"
        description="Upload a sales report to bulk-create daily shift entries."
      />
      <div className="p-4 md:p-8 space-y-6">
        {step === 'upload' && (
             <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle className="font-headline">1. Upload Report</CardTitle>
                    <CardDescription>Select the report file (PDF or filled CSV) from your device.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Label htmlFor="dsr-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <FileUp className="w-10 h-10 mb-4 text-muted-foreground" />
                            {file ? (<p className="font-semibold text-primary">{file.name}</p>) : (<p className="text-sm text-muted-foreground">Click or drag and drop to upload</p>)}
                        </div>
                        <Input id="dsr-upload" type="file" className="hidden" onChange={handleFileChange} accept="application/pdf,.csv" />
                    </Label>
                    {error && <p className="text-sm text-destructive text-center">{error}</p>}
                    <Button onClick={handleAnalyze} disabled={!file || isAnalyzing} className="w-full">
                        {isAnalyzing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>) : (<><Bot className="mr-2 h-4 w-4" /> Analyze Report</>)}
                    </Button>
                </CardContent>
            </Card>
        )}
        
        {step === 'review' && analysisResult && (
            <div>
                <Button variant="outline" onClick={handleReset} className="mb-4">
                    <Pencil className="mr-2 h-4 w-4" /> Start Over
                </Button>
                 <DsrEditForm 
                    dailyReports={dailyReports} 
                    onSave={handleSaveReports}
                    existingReportDates={existingReportDates}
                />
            </div>
        )}

      </div>
    </AppLayout>
  );
}
