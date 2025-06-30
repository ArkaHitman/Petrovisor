
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const paymentSchema = z.object({
    accountId: z.string().min(1, "Please select an account."),
    date: z.string().min(1, 'Date is required'),
    description: z.string().min(1, 'Description is required'),
    amount: z.coerce.number().positive('Amount must be positive'),
});

export default function MiscPaymentsPage() {
    const { settings, addBankTransaction } = useAppState();
    const { toast } = useToast();
    const router = useRouter();

    const form = useForm<z.infer<typeof paymentSchema>>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            accountId: settings?.bankAccounts.find(acc => acc.isOverdraft)?.id || settings?.bankAccounts[0]?.id || '',
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
        router.push('/bank');
    }

    if (!settings?.bankAccounts || settings.bankAccounts.length === 0) {
        return (
            <AppLayout>
                <PageHeader title="Miscellaneous Payments" description="Record online/bank expenses from a specific account."/>
                <div className="p-4 md:p-8">
                    <Card className="max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle>No Bank Accounts Found</CardTitle>
                            <CardDescription>Please add a bank account in settings before recording payments.</CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <PageHeader title="Miscellaneous Payments" description="Record online/bank expenses from a specific account."/>
            <div className="p-4 md:p-8">
                <Card className="max-w-2xl mx-auto">
                    <CardHeader><CardTitle>Record a New Payment</CardTitle><CardDescription>This will be added as a debit to the selected bank account's ledger.</CardDescription></CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField control={form.control} name="accountId" render={({ field }) => (
                                    <FormItem><FormLabel>Payment From Account</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select an account" /></SelectTrigger></FormControl>
                                            <SelectContent>{settings.bankAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent>
                                        </Select><FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Payment Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="e.g., Electricity Bill for May" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount Paid</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <Button type="submit" className="w-full">Record Payment</Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
