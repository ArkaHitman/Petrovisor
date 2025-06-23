'use client';
import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, cn } from '@/lib/utils';
import { PlusCircle, Trash2 } from 'lucide-react';
import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
    type: z.enum(['payment_to_manager', 'payment_from_manager']),
    amount: z.coerce.number().positive('Amount must be positive'),
});

function AddTransactionDialog({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
    const { addManagerTransaction } = useAppState();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof transactionSchema>>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            date: format(new Date(), 'yyyy-MM-dd'),
            description: '',
            type: 'payment_to_manager',
            amount: 0,
        }
    });

    const onSubmit = (values: z.infer<typeof transactionSchema>) => {
        addManagerTransaction(values);
        toast({ title: "Success", description: "Transaction added successfully." });
        form.reset();
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Manager Transaction</DialogTitle>
                    <DialogDescription>Record a new payment to or from the manager.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="date" render={({ field }) => (
                            <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="e.g., Salary for May" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="amount" render={({ field }) => (
                            <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="type" render={({ field }) => (
                            <FormItem className="space-y-3"><FormLabel>Transaction Type</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="payment_to_manager" /></FormControl>
                                            <FormLabel className="font-normal">Payment to Manager</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl><RadioGroupItem value="payment_from_manager" /></FormControl>
                                            <FormLabel className="font-normal">Payment from Manager</FormLabel>
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

export default function ManagerLedgerPage() {
    const { settings, deleteManagerTransaction } = useAppState();
    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);

    const managerLedger = settings?.managerLedger || [];
    const initialBalance = settings?.managerInitialBalance || 0;

    const netBalance = useMemo(() => {
        const balance = managerLedger.reduce((acc, tx) => {
            if (tx.type === 'payment_from_manager') {
                return acc + tx.amount;
            } else {
                return acc - tx.amount;
            }
        }, initialBalance);
        return balance;
    }, [managerLedger, initialBalance]);
    
    const balanceStatus = netBalance > 0 ? "Manager Owes You" : netBalance < 0 ? "You Owe Manager" : "Settled";
    const balanceColor = netBalance > 0 ? "text-chart-2" : netBalance < 0 ? "text-destructive" : "text-muted-foreground";

    return (
        <AppLayout>
            <PageHeader
                title="Manager Ledger"
                description="Track financial dealings with the manager."
            >
                <Button onClick={() => setIsAddDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Transaction
                </Button>
            </PageHeader>
            <div className="p-4 md:p-8 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Net Manager Balance</CardTitle>
                        <CardDescription>The current financial position with the manager.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className={cn("text-3xl font-bold font-headline", balanceColor)}>{formatCurrency(Math.abs(netBalance))}</p>
                        <p className="text-sm text-muted-foreground">{balanceStatus}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Transaction History</CardTitle>
                        <CardDescription>A complete log of all manager transactions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {managerLedger.length === 0 ? (
                             <div className="border rounded-lg p-8 text-center">
                                <p className="text-muted-foreground">No manager transactions have been recorded yet.</p>
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
                                    {managerLedger.map(tx => (
                                        <TableRow key={tx.id}>
                                            <TableCell>{format(parseISO(tx.date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>{tx.description}</TableCell>
                                            <TableCell>
                                                <Badge variant={tx.type === 'payment_from_manager' ? 'default' : 'destructive'} className="capitalize">
                                                    {tx.type.replace(/_/g, ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(tx.amount)}</TableCell>
                                            <TableCell>
                                                <AlertDialog>
                                                  <AlertDialogTrigger asChild>
                                                     <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                  </AlertDialogTrigger>
                                                  <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                      <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                                                      <AlertDialogDescription>
                                                        This will permanently delete the transaction. This action cannot be undone.
                                                      </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                      <AlertDialogAction onClick={() => deleteManagerTransaction(tx.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                  </AlertDialogContent>
                                                </AlertDialog>
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
