'use client';
import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/app-state-provider';
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

const paymentSchema = z.object({
    date: z.string().min(1, 'Date is required'),
    description: z.string().min(1, 'Description is required'),
    amount: z.coerce.number().positive('Amount must be positive'),
});

export default function MiscPaymentsPage() {
    const { addBankTransaction } = useAppState();
    const { toast } = useToast();
    const router = useRouter();

    const form = useForm<z.infer<typeof paymentSchema>>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            date: format(new Date(), 'yyyy-MM-dd'),
            description: '',
            amount: 0,
        }
    });

    const onSubmit = (values: z.infer<typeof paymentSchema>) => {
        addBankTransaction({
            ...values,
            type: 'debit',
            source: 'misc_payment'
        });
        toast({ title: "Success", description: "Payment recorded successfully as a bank debit." });
        router.push('/');
    }

    return (
        <AppLayout>
            <PageHeader
                title="Miscellaneous Payments"
                description="Record online/bank expenses. This will be added as a debit to your bank ledger."
            />
            <div className="p-4 md:p-8">
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>Record a New Payment</CardTitle>
                        <CardDescription>Use this form for expenses paid directly from your bank account.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField control={form.control} name="date" render={({ field }) => (
                                    <FormItem><FormLabel>Payment Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="description" render={({ field }) => (
                                    <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="e.g., Electricity Bill for May" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="amount" render={({ field }) => (
                                    <FormItem><FormLabel>Amount Paid</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <Button type="submit" className="w-full">Record Payment</Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
