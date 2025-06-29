'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { Trash2, Bot, FileUp, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { useAppState } from '@/contexts/app-state-provider';
import { useRouter } from 'next/navigation';
import { analyzeChallan, type AnalyzeChallanOutput } from '@/ai/flows/analyze-challan-flow';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Zod schemas for forms
const deliverySchema = z.object({
  date: z.string().min(1, 'Date is required'),
  fuelName: z.enum(['MS', 'HSD'], { required_error: 'Fuel type is required' }),
  quantityKL: z.coerce.number().positive('Quantity must be positive'),
  ratePerKL: z.coerce.number().positive('Rate must be positive'), // Basic rate, pre-GST
});

const paymentSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  accountId: z.string().min(1, "Payment account is required."),
});

// --- Start of AI Challan Analysis Components ---

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

const ChallanResultsDisplay = ({ result, onConfirm }: { result: AnalysisResult; onConfirm: (data: PurchaseConfirmationValues) => void; }) => {
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
                            {result.subTotal && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span className="font-medium">{formatCurrency(result.subTotal)}</span>
                                </div>
                            )}
                            {result.vatAmount && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">VAT</span>
                                    <span className="font-medium">{formatCurrency(result.vatAmount)}</span>
                                </div>
                            )}
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

function AnalyzeChallanDialog({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
    const { addFuelPurchase, addSupplierDelivery, settings } = useAppState();
    const { toast } = useToast();
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    React.useEffect(() => {
        if (!open) {
            setFile(null);
            setError(null);
            setAnalysisResult(null);
            setIsAnalyzing(false);
        }
    }, [open]);

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
                
                addFuelPurchase({
                    date: item.date,
                    tankId: item.tankId,
                    quantity: item.quantity,
                    amount: item.amount,
                    invoiceNumber: item.invoiceNumber,
                    fuelId: matchingFuel.id,
                });

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
            
            toast({ title: "Success!", description: `Added ${data.items.length} delivery record(s). Supplier ledger and stock updated.` });
            setOpen(false);
        } catch (e) {
             const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while saving.";
             toast({ title: "Save Failed", description: errorMessage, variant: 'destructive' });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>AI Challan Analysis</DialogTitle>
                    <DialogDescription>Upload a fuel delivery challan/invoice to automatically extract purchase details.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    {!analysisResult ? (
                        <div className="space-y-4">
                            <Label htmlFor="challan-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <FileUp className="w-10 h-10 mb-4 text-muted-foreground" />
                                    {file ? (
                                        <p className="font-semibold text-primary">{file.name}</p>
                                    ) : (
                                        <>
                                            <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                            <p className="text-xs text-muted-foreground">PDF or Image file</p>
                                        </>
                                    )}
                                </div>
                                <Input id="challan-upload" type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} accept="application/pdf, image/png, image/jpeg" />
                            </Label>
                            {error && <p className="text-sm text-destructive text-center">{error}</p>}
                            <Button onClick={handleAnalyze} disabled={!file || isAnalyzing} className="w-full">
                                {isAnalyzing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>) : (<><Bot className="mr-2 h-4 w-4" /> Analyze Challan</>)}
                            </Button>
                        </div>
                    ) : (
                        <ChallanResultsDisplay result={analysisResult} onConfirm={handleConfirmPurchase} />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// --- End of AI Challan Analysis Components ---

export default function SupplierLedgerPage() {
  const { settings, addSupplierDelivery, deleteSupplierDelivery, addSupplierPayment, deleteSupplierPayment } = useAppState();
  const { toast } = useToast();
  const [isAnalyzeDialogOpen, setIsAnalyzeDialogOpen] = useState(false);
  
  const supplierDeliveries = settings?.supplierDeliveries || [];
  const supplierPayments = settings?.supplierPayments || [];

  const deliveryForm = useForm<z.infer<typeof deliverySchema>>({
    resolver: zodResolver(deliverySchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      fuelName: 'MS',
      quantityKL: 0,
      ratePerKL: 0,
    },
  });

  const paymentForm = useForm<z.infer<typeof paymentSchema>>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      amount: 0,
      accountId: settings?.bankAccounts.find(acc => acc.isOverdraft)?.id || settings?.bankAccounts[0]?.id || '',
    },
  });

  const handleAddDelivery = (values: z.infer<typeof deliverySchema>) => {
    addSupplierDelivery(values);
    deliveryForm.reset();
    toast({ title: 'Success', description: 'Fuel delivery recorded.' });
  };

  const handleAddPayment = (values: z.infer<typeof paymentSchema>) => {
    addSupplierPayment(values);
    paymentForm.reset({ 
        date: format(new Date(), 'yyyy-MM-dd'), 
        amount: 0, 
        accountId: settings?.bankAccounts.find(acc => acc.isOverdraft)?.id || settings?.bankAccounts[0]?.id || '' 
    });
    toast({ title: 'Success', description: 'Payment recorded and bank ledger updated.' });
  };

  const handleDeleteDelivery = (id: string) => {
    deleteSupplierDelivery(id);
    toast({ title: 'Success', description: 'Delivery entry deleted.' });
  };

  const handleDeletePayment = (id: string) => {
    deleteSupplierPayment(id);
    toast({ title: 'Success', description: 'Payment entry deleted.' });
  };

  const summary = useMemo(() => {
    const totalDeliveryValue = supplierDeliveries.reduce((sum, d) => sum + d.totalInvoiceValue, 0);
    const totalPaid = supplierPayments.reduce((sum, p) => sum + p.amount, 0);
    const balance = totalPaid - totalDeliveryValue;
    return { totalDeliveryValue, totalPaid, balance };
  }, [supplierDeliveries, supplierPayments]);

  return (
    <AppLayout>
      <PageHeader
        title="Supplier Ledger"
        description="Track fuel deliveries and payments with a supplier."
      >
        <Button variant="outline" onClick={() => setIsAnalyzeDialogOpen(true)}>
            <Bot className="mr-2 h-4 w-4" /> Analyze Challan
        </Button>
      </PageHeader>
      <div className="p-4 md:p-8 space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Summary Card */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="font-headline">Live Summary Report</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Delivery Value</p>
                <p className="text-2xl font-bold font-headline">{formatCurrency(summary.totalDeliveryValue)}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Amount Paid</p>
                <p className="text-2xl font-bold font-headline">{formatCurrency(summary.totalPaid)}</p>
              </div>
              <div className={cn('p-4 rounded-lg', summary.balance === 0 ? 'bg-muted' : summary.balance > 0 ? 'bg-green-100 dark:bg-green-900/50' : 'bg-red-100 dark:bg-red-900/50')}>
                <p className="text-sm text-muted-foreground">{summary.balance > 0 ? 'Advance Balance' : summary.balance < 0 ? 'Due Balance' : 'Settlement Status'}</p>
                <p className={cn('text-2xl font-bold font-headline', summary.balance === 0 ? 'text-muted-foreground' : summary.balance > 0 ? 'text-green-600' : 'text-destructive')}>
                  {summary.balance === 0 ? 'No Dues' : formatCurrency(Math.abs(summary.balance))}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Form */}
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>1. Add Fuel Delivery (Manual)</CardTitle></CardHeader>
            <CardContent>
              <Form {...deliveryForm}>
                <form onSubmit={deliveryForm.handleSubmit(handleAddDelivery)} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField control={deliveryForm.control} name="date" render={({ field }) => <FormItem><FormLabel>Delivery Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={deliveryForm.control} name="fuelName" render={({ field }) => (
                      <FormItem><FormLabel>Fuel Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select fuel" /></SelectTrigger></FormControl>
                          <SelectContent><SelectItem value="MS">MS (Petrol)</SelectItem><SelectItem value="HSD">HSD (Diesel)</SelectItem></SelectContent>
                        </Select><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={deliveryForm.control} name="quantityKL" render={({ field }) => <FormItem><FormLabel>Quantity (KL)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={deliveryForm.control} name="ratePerKL" render={({ field }) => <FormItem><FormLabel>Rate (per KL, pre-GST)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                  </div>
                  <Button type="submit">Add Delivery</Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader><CardTitle>2. Add Payment</CardTitle></CardHeader>
            <CardContent>
              <Form {...paymentForm}>
                <form onSubmit={paymentForm.handleSubmit(handleAddPayment)} className="space-y-4">
                  <FormField control={paymentForm.control} name="date" render={({ field }) => <FormItem><FormLabel>Payment Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
                   <FormField control={paymentForm.control} name="accountId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment From Account</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select an account" /></SelectTrigger></FormControl>
                          <SelectContent>{settings?.bankAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={paymentForm.control} name="amount" render={({ field }) => <FormItem><FormLabel>Amount Paid</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>} />
                  <Button type="submit">Add Payment</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Records Tables */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Delivery Records</CardTitle></CardHeader>
            <CardContent>
              {supplierDeliveries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Fuel</TableHead>
                        <TableHead>Qty(KL)</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Basic</TableHead>
                        <TableHead>GST</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierDeliveries.map(d => (
                      <TableRow key={d.id}>
                        <TableCell>{format(parseISO(d.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell>{d.fuelName}</TableCell>
                        <TableCell>{d.quantityKL.toFixed(2)}</TableCell>
                        <TableCell>{formatCurrency(d.ratePerKL)}</TableCell>
                        <TableCell>{formatCurrency(d.basicAmount)}</TableCell>
                        <TableCell>{formatCurrency(d.gstAmount)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(d.totalInvoiceValue)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteDelivery(d.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-muted-foreground text-center py-4">No deliveries recorded yet.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Payment Records</CardTitle></CardHeader>
            <CardContent>
              {supplierPayments.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Account</TableHead><TableHead className="text-right">Amount Paid</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {supplierPayments.map(p => {
                      const account = settings?.bankAccounts.find(a => a.id === p.accountId);
                      return (
                        <TableRow key={p.id}>
                            <TableCell>{format(parseISO(p.date), 'dd MMM yyyy')}</TableCell>
                            <TableCell>{account?.name || 'N/A'}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
                            <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeletePayment(p.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : <p className="text-muted-foreground text-center py-4">No payments recorded yet.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
      <AnalyzeChallanDialog open={isAnalyzeDialogOpen} setOpen={setIsAnalyzeDialogOpen} />
    </AppLayout>
  );
}
