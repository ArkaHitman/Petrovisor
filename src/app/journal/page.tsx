
'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppState } from '@/contexts/app-state-provider';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { PlusCircle, Trash2 } from 'lucide-react';
import React, { useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const legSchema = z.object({
    accountId: z.string().min(1, "Account is required."),
    debit: z.coerce.number().min(0),
    credit: z.coerce.number().min(0),
});

const journalEntrySchema = z.object({
    date: z.string().min(1, 'Date is required'),
    description: z.string().min(1, 'Description is required'),
    legs: z.array(legSchema).min(1, 'At least one account is required.'),
}).refine(data => {
    if (data.legs.length > 1) {
        const totalDebit = data.legs.reduce((sum, leg) => sum + leg.debit, 0);
        const totalCredit = data.legs.reduce((sum, leg) => sum + leg.credit, 0);
        return totalDebit === totalCredit;
    }
    return true; // Allow single-leg entries
}, {
    message: 'For multiple accounts, total debits must equal total credits.',
    path: ['legs'],
}).refine(data => {
    const totalDebit = data.legs.reduce((sum, leg) => sum + leg.debit, 0);
    const totalCredit = data.legs.reduce((sum, leg) => sum + leg.credit, 0);
    return totalDebit > 0 || totalCredit > 0;
}, {
    message: 'Total amount cannot be zero.',
    path: ['legs'],
});


export default function JournalPage() {
    const { settings, addJournalEntry, deleteJournalEntry } = useAppState();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof journalEntrySchema>>({
        resolver: zodResolver(journalEntrySchema),
        mode: 'onChange',
        defaultValues: {
            date: format(new Date(), 'yyyy-MM-dd'),
            description: '',
            legs: [
                { accountId: '', debit: 0, credit: 0 },
            ],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'legs',
    });

    const watchedLegs = form.watch('legs');
    const { totalDebit, totalCredit } = useMemo(() => {
        return watchedLegs.reduce((acc, leg) => {
            acc.totalDebit += leg.debit || 0;
            acc.totalCredit += leg.credit || 0;
            return acc;
        }, { totalDebit: 0, totalCredit: 0 });
    }, [watchedLegs]);

    const accounts = useMemo(() => {
        if (!settings) return { coa: [], banks: [] };
        return {
            coa: settings.chartOfAccounts || [],
            banks: settings.bankAccounts || [],
        };
    }, [settings]);

    const onSubmit = (values: z.infer<typeof journalEntrySchema>) => {
        const finalLegs = values.legs.map(leg => {
            const [type, id] = leg.accountId.split(':');
            return {
                accountType: type as 'chart_of_account' | 'bank_account',
                accountId: id,
                debit: leg.debit,
                credit: leg.credit,
            };
        });

        addJournalEntry({
            date: values.date,
            description: values.description,
            legs: finalLegs,
        });

        toast({ title: 'Success', description: 'Journal entry recorded.' });
        form.reset({
            date: format(new Date(), 'yyyy-MM-dd'),
            description: '',
            legs: [
                { accountId: '', debit: 0, credit: 0 },
            ],
        });
    };

    const getAccountName = (type: 'chart_of_account' | 'bank_account', id: string) => {
        if (type === 'bank_account') {
            return settings?.bankAccounts.find(a => a.id === id)?.name || 'Unknown Bank';
        }
        return settings?.chartOfAccounts?.find(a => a.id === id)?.name || 'Unknown Account';
    };

    return (
        <AppLayout>
            <PageHeader title="Journal Vouchers" description="Record single or double-entry transactions." />
            <div className="p-4 md:p-8 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>New Journal Entry</CardTitle>
                        <CardDescription>Record expenses, income, or other financial events. For multi-line entries, ensure total debits equal total credits.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid md:grid-cols-3 gap-6">
                                    <FormField control={form.control} name="date" render={({ field }) => (<FormItem className="md:col-span-1"><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="description" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Description / Narration</FormLabel><FormControl><Input placeholder="e.g., Paid monthly electricity bill" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-2/5">Account</TableHead>
                                                <TableHead className="text-right">Debit</TableHead>
                                                <TableHead className="text-right">Credit</TableHead>
                                                <TableHead className="w-12"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fields.map((field, index) => (
                                                <TableRow key={field.id} className="align-top">
                                                    <TableCell>
                                                        <FormField control={form.control} name={`legs.${index}.accountId`} render={({ field }) => (
                                                            <FormItem><Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="Select an account..." /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    <SelectGroup>
                                                                        <FormLabel className="px-2 text-xs">Bank Accounts</FormLabel>
                                                                        {accounts.banks.map(acc => <SelectItem key={acc.id} value={`bank_account:${acc.id}`}>{acc.name}</SelectItem>)}
                                                                    </SelectGroup>
                                                                    <SelectGroup>
                                                                        <FormLabel className="px-2 text-xs">Other Accounts</FormLabel>
                                                                        {accounts.coa.map(acc => <SelectItem key={acc.id} value={`chart_of_account:${acc.id}`}>{acc.name}</SelectItem>)}
                                                                    </SelectGroup>
                                                                </SelectContent>
                                                            </Select><FormMessage /></FormItem>
                                                        )} />
                                                    </TableCell>
                                                    <TableCell><FormField control={form.control} name={`legs.${index}.debit`} render={({ field }) => (<FormItem><FormControl><Input type="number" className="text-right" {...field} /></FormControl><FormMessage /></FormItem>)} /></TableCell>
                                                    <TableCell><FormField control={form.control} name={`legs.${index}.credit`} render={({ field }) => (<FormItem><FormControl><Input type="number" className="text-right" {...field} /></FormControl><FormMessage /></FormItem>)} /></TableCell>
                                                    <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                        <TableFooter>
                                            <TableRow>
                                                <TableCell className="text-right font-bold">Totals</TableCell>
                                                <TableCell className={cn("text-right font-bold", watchedLegs.length > 1 && totalDebit !== totalCredit && 'text-destructive')}>{formatCurrency(totalDebit)}</TableCell>
                                                <TableCell className={cn("text-right font-bold", watchedLegs.length > 1 && totalDebit !== totalCredit && 'text-destructive')}>{formatCurrency(totalCredit)}</TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        </TableFooter>
                                    </Table>
                                </div>
                                <div className="flex justify-between items-center">
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ accountId: '', debit: 0, credit: 0 })}><PlusCircle className="mr-2 h-4 w-4" /> Add Row</Button>
                                    <Button type="submit" disabled={!form.formState.isValid}>Save Entry</Button>
                                </div>
                                {form.formState.errors.legs?.root?.message && <p className="text-sm font-medium text-destructive text-center">{form.formState.errors.legs.root.message}</p>}
                            </form>
                        </Form>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Journal History</CardTitle></CardHeader>
                    <CardContent>
                        {settings?.journalEntries && settings.journalEntries.length > 0 ? (
                             <div className="space-y-4">
                                {settings.journalEntries.map(entry => (
                                    <div key={entry.id} className="border rounded-lg p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-semibold">{entry.description}</p>
                                                <p className="text-sm text-muted-foreground">{format(parseISO(entry.date), 'dd MMM yyyy')}</p>
                                            </div>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Delete Journal Entry?</AlertDialogTitle><AlertDialogDescription>This will delete the entry and any associated bank transactions. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteJournalEntry(entry.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Account</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {entry.legs.map((leg, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{getAccountName(leg.accountType, leg.accountId)}</TableCell>
                                                        <TableCell className="text-right">{leg.debit > 0 ? formatCurrency(leg.debit) : '-'}</TableCell>
                                                        <TableCell className="text-right">{leg.credit > 0 ? formatCurrency(leg.credit) : '-'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">No journal entries recorded.</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
