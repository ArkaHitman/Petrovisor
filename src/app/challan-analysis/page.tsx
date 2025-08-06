'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FileUp, Loader2, Bot, AlertTriangle, CheckCircle } from 'lucide-react';
import React, { useState } from 'react';
import { analyzeChallan, type AnalyzeChallanOutput } from '@/ai/flows/analyze-challan-flow';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';

type AnalysisResult = AnalyzeChallanOutput;

const purchaseConfirmationSchema = z.object({
  items: z.array(z.object({
    tankId: z.string().min(1, "Tank is required."),
    fuelName: z.string(),
    quantity: z.number(),
    rate: z.number(),
    amount: z.number(),
    date: z.string(),
    invoiceNumber: z.string(),
  })),
});

type PurchaseConfirmationValues = z.infer<typeof purchaseConfirmationSchema>;

const GST_RATE = 0.28;

const ResultsDisplay = ({ result, onConfirm }: { result: AnalysisResult; onConfirm: (data: PurchaseConfirmationValues) => void; }) => {
    const { settings } = useAppState();

    const form = useForm<PurchaseConfirmationValues>({
        resolver: zodResolver(purchaseConfirmationSchema),
        defaultValues: {
            items: result.items.map(item => ({
                tankId: '',
                fuelName: item.fuelName,
                quantity: item.quantity,
                rate: item.rate,
                amount: item.amount,
                date: result.date,
                invoiceNumber: result.invoiceNumber,
            })),
        },
    });

    const { fields } = useFieldArray({ control: form.control, name: "items" });

    const onSubmit = (data: PurchaseConfirmationValues) => {
        onConfirm(data);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Analysis Summary</CardTitle>
                        <div className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 pt-2">
                           <p>Invoice #: <span className="font-semibold text-foreground">{result.invoiceNumber}</span></p>
                           <p>Date: <span className="font-semibold text-foreground">{format(parseISO(result.date), 'dd MMM yyyy')}</span></p>
                           <p>Supplier: <span className="font-semibold text-foreground">{result.supplierName || 'N/A'}</span></p>
                           <p>Vehicle: <span className="font-semibold text-foreground">{result.vehicleNumber || 'N/A'}</span></p>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fuel Type</TableHead>
                                    <TableHead className="text-right">Quantity (L)</TableHead>
                                    <TableHead className="text-right">Rate</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="w-[200px]">Deposit to Tank</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => {
                                    const matchingFuel = settings?.fuels.find(f => result.items[index].fuelName.toLowerCase().includes(f.name.toLowerCase()));
                                    const compatibleTanks = settings?.tanks.filter(t => t.fuelId === matchingFuel?.id);
                                    return (
                                        <TableRow key={field.id}>
                                            <TableCell className="font-medium">{result.items[index].fuelName}</TableCell>
                                            <TableCell className="text-right">{result.items[index].quantity.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(result.items[index].rate)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(result.items[index].amount)}</TableCell>
                                            <TableCell>
                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.tankId`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="Select tank" /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    {compatibleTanks && compatibleTanks.length > 0 ? (
                                                                        compatibleTanks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)
                                                                    ) : (
                                                                        <div className="p-2 text-xs text-muted-foreground">No compatible tank</div>
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                         <div className="mt-6 border-t pt-4 space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-medium">{formatCurrency(result.subTotal || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">VAT</span>
                                <span className="font-medium">{formatCurrency(result.vatAmount || 0)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                                <span>Grand Total</span>
                                <span>{formatCurrency(result.totalAmount)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <div className="flex items-center gap-2 p-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-md">
                   <CheckCircle className="h-4 w-4"/>
                   <p>Data looks good? Assign tanks and click below to add this delivery to your ledgers.</p>
                </div>
                <Button type="submit" className="w-full">Confirm and Add Delivery</Button>
            </form>
        </Form>
    );
};


export default function ChallanAnalysisPage() {
    const { addFuelPurchase, addSupplierDelivery, settings } = useAppState();
    const { toast } = useToast();
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
            setAnalysisResult(null);
        }
    };

    const handleAnalyze = async () => {
        if (!file) { setError("Please select a file first."); return; }
        setIsAnalyzing(true); setError(null); setAnalysisResult(null);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async (e) => {
                const challanDataUri = e.target?.result as string;
                if (!challanDataUri) { setError("Could not read the file."); setIsAnalyzing(false); return; }

                const result = await analyzeChallan({ challanDataUri });
                setAnalysisResult(result);
                toast({ title: "Analysis Complete", description: "Please review and confirm the extracted data below." });
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

    const handleConfirmPurchase = (data: PurchaseConfirmationValues) => {
        if (!settings) return;
        try {
            data.items.forEach(item => {
                const matchingFuel = settings.fuels.find(f => item.fuelName.toLowerCase().includes(f.name.toLowerCase()));
                if (!matchingFuel) {
                    throw new Error(`Could not find a matching fuel in settings for "${item.fuelName}"`);
                }
                
                // Add to Fuel Purchases (for stock management, etc.)
                addFuelPurchase({
                    date: item.date,
                    tankId: item.tankId,
                    quantity: item.quantity,
                    amount: item.amount,
                    invoiceNumber: item.invoiceNumber,
                    fuelId: matchingFuel.id,
                });

                // Add to Supplier Ledger (for payables tracking)
                const fuelNameForLedger = item.fuelName.toLowerCase().includes('petrol') ? 'MS' : 'HSD';
                const basicRatePerLitre = item.rate / (1 + GST_RATE);
                const basicRatePerKL = basicRatePerLitre * 1000;
                
                addSupplierDelivery({
                    date: item.date,
                    fuelName: fuelNameForLedger,
                    quantityKL: item.quantity / 1000,
                    ratePerKL: basicRatePerKL,
                });
            });
            
            toast({ title: "Success!", description: `Added ${data.items.length} delivery record(s). Please record the payment in the Supplier Ledger.` });
            router.push('/supplier-ledger');
        } catch (e) {
             const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while saving.";
             toast({ title: "Save Failed", description: errorMessage, variant: 'destructive' });
        }
    };

  return (
    <AppLayout>
      <PageHeader
        title="AI Challan Analysis"
        description="Upload a fuel delivery challan/invoice to automatically extract purchase details."
      />
      <div className="p-4 md:p-8 grid gap-8 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">1. Upload Challan</CardTitle>
                <CardDescription>Select the challan file from your device.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <Label htmlFor="challan-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FileUp className="w-10 h-10 mb-4 text-muted-foreground" />
                        {file ? (
                            <p className="font-semibold text-primary">{file.name}</p>
                        ) : (
                            <>
                                <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-muted-foreground">PDF or Image file of your challan</p>
                            </>
                        )}
                    </div>
                    <Input id="challan-upload" type="file" className="hidden" onChange={handleFileChange} accept="application/pdf, image/png, image/jpeg" />
                </Label>
                {error && <p className="text-sm text-destructive text-center">{error}</p>}

                 <Button onClick={handleAnalyze} disabled={!file || isAnalyzing} className="w-full">
                    {isAnalyzing ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                    ) : (
                        <><Bot className="mr-2 h-4 w-4" /> Analyze Challan</>
                    )}
                </Button>
            </CardContent>
        </Card>
        
        <Card className={!isAnalyzing && !analysisResult ? 'bg-muted/50' : ''}>
             <CardHeader>
                <CardTitle className="font-headline">2. Review & Confirm</CardTitle>
                <CardDescription>Check the data extracted by the AI and assign it to a tank before saving.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin mb-4"/>
                        <p>AI is reading your challan...</p>
                        <p className="text-xs mt-2">This may take a moment.</p>
                    </div>
                )}
                {analysisResult && <ResultsDisplay result={analysisResult} onConfirm={handleConfirmPurchase} />}
                {!isAnalyzing && !analysisResult && (
                     <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <AlertTriangle className="w-8 h-8 mb-4"/>
                        <p>Awaiting analysis results...</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
