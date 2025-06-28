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
import { Trash2 } from 'lucide-react';
import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useAppState } from '@/contexts/app-state-provider';

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
});

export default function SupplierLedgerPage() {
  const { settings, addSupplierDelivery, deleteSupplierDelivery, addSupplierPayment, deleteSupplierPayment } = useAppState();
  const { toast } = useToast();
  
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
    },
  });

  const handleAddDelivery = (values: z.infer<typeof deliverySchema>) => {
    addSupplierDelivery(values);
    deliveryForm.reset();
    toast({ title: 'Success', description: 'Fuel delivery recorded.' });
  };

  const handleAddPayment = (values: z.infer<typeof paymentSchema>) => {
    addSupplierPayment(values);
    paymentForm.reset();
    toast({ title: 'Success', description: 'Payment recorded.' });
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
      />
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
            <CardHeader><CardTitle>1. Add Fuel Delivery</CardTitle></CardHeader>
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
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead className="text-right">Amount Paid</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {supplierPayments.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>{format(parseISO(p.date), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeletePayment(p.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-muted-foreground text-center py-4">No payments recorded yet.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
