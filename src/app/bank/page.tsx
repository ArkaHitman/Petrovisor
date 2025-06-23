'use client';
import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, cn } from '@/lib/utils';
import { Banknote, Landmark, PlusCircle, Trash2 } from 'lucide-react';
import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';

const transactionSchema = z.object({
    date: z.string().min(1, 'Date is required'),
    description: z.string().min(1, 'Description is required'),
    type: z.enum(['credit', 'debit']),
    amount: z.coerce.number().positive('Amount must be positive'),
});

function AddTransactionDialog({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
    const { addBankTransaction } = useAppState();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof transactionSchema>>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            date: format(new Date(), 'yyyy-MM-dd'),
            description: '',
            type: 'credit',
            amount: 0,
        }
    });

    const onSubmit = (values: z.infer<typeof transactionSchema>) => {
        addBankTransaction({...values, source: 'manual'});
        toast({ title: "Success", description: "Bank transaction added successfully." });
        form.reset();
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Bank Transaction</DialogTitle>
                    <DialogDescription>Record a new deposit (credit) or withdrawal (debit).</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="date" render={({ field }) => (
                            <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="e.g., Cash Deposit" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="amount" render={({ field }) => (
                            <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="type" render={({ field }) => (
                            <FormItem className="space-y-3"><FormLabel>Transaction Type</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="credit" /></FormControl>
                                            <FormLabel className="font-normal">Credit (Deposit)</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="debit" /></FormControl>
                                            <FormLabel className="font-normal">Debit (Withdrawal)</FormLabel>
                                        </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit">Add Transaction</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default function BankPage() {
    const { settings, deleteBankTransaction } = useAppState();
    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);

    const bankLedger = settings?.bankLedger || [];
    const initialBalance = settings?.initialBankBalance || 0;

    const currentBalance = useMemo(() => {
        return bankLedger.reduce((acc, tx) => {
            if (tx.type === 'credit') return acc + tx.amount;
            return acc - tx.amount;
        }, initialBalance);
    }, [bankLedger, initialBalance]);

    const canDeleteTransaction = (source?: string) => {
        // Only allow deleting manual or misc_payment transactions to avoid data inconsistency.
        // Other transactions are linked to reports or credit repayments.
        const nonDeletableSources = ['credit_repayment', 'monthly_report_deposit'];
        if (!source) return true; // Backwards compatibility for old transactions
        return !nonDeletableSources.includes(source);
    };
    
    return (
        <AppLayout>
            <PageHeader
                title="Bank Ledger"
                description="Track all your bank transactions and view your current balance."
            >
                <Button onClick={() => setIsAddDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Transaction
                </Button>
            </PageHeader>
            <div className="p-4 md:p-8 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Current Bank Balance</CardTitle>
                            <Landmark className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold font-headline">{formatCurrency(currentBalance)}</div>
                            <p className="text-xs text-muted-foreground">Based on recorded transactions</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Initial Balance</CardTitle>
                             <Banknote className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold font-headline">{formatCurrency(initialBalance)}</div>
                            <p className="text-xs text-muted-foreground">As set during application setup</p>
                        </CardContent>
                    </Card>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Transaction History</CardTitle>
                        <CardDescription>A complete log of all credits and debits.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {bankLedger.length === 0 ? (
                            <div className="border rounded-lg p-8 text-center">
                                <p className="text-muted-foreground">No bank transactions have been recorded yet.</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {bankLedger.map(tx => (
                                        <TableRow key={tx.id}>
                                            <TableCell>{format(parseISO(tx.date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell className="font-medium">{tx.description}</TableCell>
                                            <TableCell>
                                                <Badge variant={tx.type === 'credit' ? 'default' : 'destructive'} className={cn(tx.type === 'credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700', "capitalize")}>
                                                    {tx.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={cn("text-right font-semibold", tx.type === 'credit' ? 'text-green-600' : 'text-red-600')}>
                                                {tx.type === 'credit' ? '+' : '-'} {formatCurrency(tx.amount)}
                                            </TableCell>
                                            <TableCell>
                                                {canDeleteTransaction(tx.source) && (
                                                    <AlertDialog>
                                                      <AlertDialogTrigger asChild>
                                                         <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                      </AlertDialogTrigger>
                                                      <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                          <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                                                          <AlertDialogDescription>
                                                            This will permanently delete this manual transaction. This action cannot be undone.
                                                          </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                          <AlertDialogAction onClick={() => deleteBankTransaction(tx.id)}>Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                      </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
            <AddTransactionDialog open={isAddDialogOpen} setOpen={setIsAddDialogOpen} />
        </AppLayout>
    );
}
