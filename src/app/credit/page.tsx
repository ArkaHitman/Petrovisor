'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, cn } from '@/lib/utils';
import React, { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { HandCoins, Landmark, ArrowLeftRight, Trash2, PlusCircle, User, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { format, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Customer, CreditHistoryEntry } from '@/lib/types';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const transactionSchema = z.object({
  customerId: z.string().min(1, "Please select a customer."),
  date: z.string().min(1, 'Date is required'),
  amount: z.coerce.number().positive("Amount must be positive"),
  type: z.enum(['given', 'repaid']),
  destination: z.string().optional(), // 'cash' or a bank account ID, only for 'repaid'
}).refine(data => data.type === 'given' || (data.type === 'repaid' && data.destination), {
  message: "Repayment destination is required.",
  path: ['destination'],
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

function AddTransactionDialog({ open, setOpen, customers, bankAccounts, selectedCustomer, onTransactionAdded }: { open: boolean, setOpen: (open: boolean) => void, customers: Customer[], bankAccounts: any[], selectedCustomer?: string, onTransactionAdded: () => void }) {
    const { addCreditGiven, addCreditRepayment } = useAppState();
    const { toast } = useToast();

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            customerId: selectedCustomer || '',
            date: format(new Date(), 'yyyy-MM-dd'),
            amount: 0,
            type: 'given',
            destination: 'cash'
        },
    });

    const watchedType = form.watch('type');

    const onSubmit = (values: TransactionFormValues) => {
        if (values.type === 'given') {
            addCreditGiven(values.amount, values.date, values.customerId);
            toast({ title: "Success", description: "Credit given has been recorded." });
        } else if (values.type === 'repaid' && values.destination) {
            addCreditRepayment(values.amount, values.destination, values.date, values.customerId);
            toast({ title: "Success", description: "Credit repayment has been recorded." });
        }
        form.reset();
        setOpen(false);
        onTransactionAdded();
    };
    
    React.useEffect(() => {
        if (selectedCustomer) {
            form.reset({ customerId: selectedCustomer, date: format(new Date(), 'yyyy-MM-dd'), amount: 0, type: 'given', destination: 'cash' });
        }
    }, [selectedCustomer, form]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>New Credit Transaction</DialogTitle><DialogDescription>Record credit given or a repayment received for a customer.</DialogDescription></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField control={form.control} name="customerId" render={({ field }) => (
                            <FormItem><FormLabel>Customer</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger></FormControl>
                                    <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                </Select><FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="type" render={({ field }) => (
                            <FormItem><FormLabel>Transaction Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="given">Give Credit</SelectItem><SelectItem value="repaid">Receive Repayment</SelectItem></SelectContent>
                                </Select><FormMessage />
                            </FormItem>
                        )} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        {watchedType === 'repaid' && (
                             <FormField control={form.control} name="destination" render={({ field }) => (
                                <FormItem className="space-y-2"><FormLabel>Repayment Destination</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Label className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><RadioGroupItem value="cash" className="sr-only" /><HandCoins className="mb-3 h-6 w-6" />Add to Cash</Label>
                                            {bankAccounts.map(acc => (
                                                <Label key={acc.id} className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><RadioGroupItem value={acc.id} className="sr-only" /><Landmark className="mb-3 h-6 w-6" />{acc.name}</Label>
                                            ))}
                                        </RadioGroup>
                                    </FormControl><FormMessage />
                                </FormItem>
                            )} />
                        )}
                        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Add Transaction</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default function CreditPage() {
    const { settings, deleteCreditEntry } = useAppState();
    const { toast } = useToast();
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [isAddTxDialogOpen, setIsAddTxDialogOpen] = useState(false);

    const customers = settings?.customers || [];
    const bankAccounts = settings?.bankAccounts || [];
    const creditHistory = settings?.creditHistory || [];

    const customerBalances = useMemo(() => {
        const balances = new Map<string, number>();
        customers.forEach(c => balances.set(c.id, 0));
        creditHistory.forEach(tx => {
            const currentBalance = balances.get(tx.customerId) || 0;
            if (tx.type === 'given') {
                balances.set(tx.customerId, currentBalance + tx.amount);
            } else if (tx.type === 'repaid') {
                balances.set(tx.customerId, currentBalance - tx.amount);
            }
        });
        return balances;
    }, [customers, creditHistory]);

    const totalOutstandingCredit = useMemo(() => Array.from(customerBalances.values()).reduce((sum, bal) => sum + bal, 0), [customerBalances]);

    const selectedCustomerHistory = useMemo(() => {
        if (!selectedCustomer) return [];
        return creditHistory
            .filter(tx => tx.customerId === selectedCustomer.id)
            .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    }, [creditHistory, selectedCustomer]);

    const handleDelete = (tx: CreditHistoryEntry) => {
        deleteCreditEntry(tx.id);
        toast({ title: "Success", description: "Credit entry deleted." });
    };

    return (
        <AppLayout>
            <PageHeader title="Credit Management" description="Manage credit customers, balances, and transaction history.">
                <Button onClick={() => setIsAddTxDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> New Transaction</Button>
            </PageHeader>

            <div className="p-4 md:p-8 grid gap-8 md:grid-cols-3">
                <div className="md:col-span-1 space-y-6">
                    <Card><CardHeader><CardTitle className="font-headline">Total Outstanding</CardTitle><CardDescription>Total credit owed by all customers.</CardDescription></CardHeader><CardContent><p className="text-3xl font-bold font-headline text-primary">{formatCurrency(totalOutstandingCredit)}</p></CardContent></Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Customers</CardTitle>
                            <CardDescription>Select a customer to view their details.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {customers.length === 0 ? (
                                <div className="text-center text-muted-foreground py-4">
                                    <p>No customers added yet.</p>
                                    <Button variant="link" asChild><Link href="/customers">Add Customers</Link></Button>
                                </div>
                            ) : (
                                <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
                                    {customers.map(c => (
                                        <button key={c.id} onClick={() => setSelectedCustomer(c)} className={cn("w-full text-left p-3 rounded-md transition-colors", selectedCustomer?.id === c.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50")}>
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium">{c.name}</span>
                                                <span className={cn("font-semibold", (customerBalances.get(c.id) || 0) > 0 ? "text-destructive" : "text-muted-foreground")}>
                                                    {formatCurrency(customerBalances.get(c.id) || 0)}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            {selectedCustomer ? (
                                <>
                                    <CardTitle className="font-headline flex items-center gap-2"><User /> {selectedCustomer.name}'s Ledger</CardTitle>
                                    <CardDescription>Outstanding Balance: <span className="font-bold text-foreground">{formatCurrency(customerBalances.get(selectedCustomer.id) || 0)}</span></CardDescription>
                                </>
                            ) : (
                                <CardTitle className="font-headline flex items-center gap-2"><Users /> Customer Ledger</CardTitle>
                            )}
                        </CardHeader>
                        <CardContent>
                            {selectedCustomer ? (
                                selectedCustomerHistory.length > 0 ? (
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Details</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {selectedCustomerHistory.map(tx => (
                                                <TableRow key={tx.id}>
                                                    <TableCell>{format(parseISO(tx.date), 'dd MMM yyyy')}</TableCell>
                                                    <TableCell><Badge variant={tx.type === 'given' ? 'destructive' : 'default'}>{tx.type === 'given' ? 'Given' : 'Repaid'}</Badge></TableCell>
                                                    <TableCell>{tx.type === 'repaid' ? `To ${tx.repaymentDestination === 'cash' ? 'Cash' : bankAccounts.find(a => a.id === tx.repaymentDestination)?.name}` : 'Credit Sale'}</TableCell>
                                                    <TableCell className={cn("text-right font-semibold", tx.type === 'given' ? 'text-destructive' : 'text-primary')}>{formatCurrency(tx.amount)}</TableCell>
                                                    <TableCell>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader><AlertDialogTitle>Delete Entry?</AlertDialogTitle><AlertDialogDescription>This action will permanently delete this credit record. Associated bank or cash transactions will also be removed.</AlertDialogDescription></AlertDialogHeader>
                                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(tx)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="h-60 flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                                        <p>No transactions recorded for {selectedCustomer.name} yet.</p>
                                        <Button variant="link" onClick={() => setIsAddTxDialogOpen(true)}>Add first transaction</Button>
                                    </div>
                                )
                            ) : (
                                <div className="h-60 flex flex-col items-center justify-center text-center text-muted-foreground p-4">
                                    <p>Select a customer from the list to see their transaction history.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            
            <AddTransactionDialog 
                open={isAddTxDialogOpen}
                setOpen={setIsAddTxDialogOpen}
                customers={customers}
                bankAccounts={bankAccounts}
                selectedCustomer={selectedCustomer?.id}
                onTransactionAdded={() => {
                    // This is a bit of a hack to re-trigger the memo, but it works
                    setSelectedCustomer(c => c ? {...c} : null); 
                }}
            />
        </AppLayout>
    );
}
