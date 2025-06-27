
'use client';
import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, cn } from '@/lib/utils';
import React, { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { HandCoins, Landmark, ArrowLeftRight } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { format, parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const giveCreditSchema = z.object({
    amount: z.coerce.number().positive("Amount must be positive"),
});

const receiveRepaymentSchema = z.object({
    amount: z.coerce.number().positive("Amount must be positive"),
    destination: z.string().min(1), // 'cash' or a bank account ID
});

export default function CreditPage() {
    const { settings, addCreditGiven, addCreditRepayment } = useAppState();
    const { toast } = useToast();

    const bankAccounts = settings?.bankAccounts || [];

    const creditHistory = useMemo(() => {
        return [...(settings?.creditHistory || [])].sort((a, b) => b.date.localeCompare(a.date));
    }, [settings?.creditHistory]);

    const currentOutstandingCredit = useMemo(() => {
        return creditHistory.reduce((acc, tx) => {
            if (tx.type === 'given') return acc + tx.amount;
            if (tx.type === 'repaid') return acc - tx.amount;
            return acc;
        }, 0);
    }, [creditHistory]);

    const giveCreditForm = useForm<z.infer<typeof giveCreditSchema>>({
        resolver: zodResolver(giveCreditSchema),
        defaultValues: { amount: 0 },
    });

    const receiveRepaymentForm = useForm<z.infer<typeof receiveRepaymentSchema>>({
        resolver: zodResolver(receiveRepaymentSchema),
        defaultValues: { amount: 0, destination: 'cash' },
    });

    const onGiveCredit = (values: z.infer<typeof giveCreditSchema>) => {
        addCreditGiven(values.amount);
        toast({ title: "Success", description: "Credit has been recorded." });
        giveCreditForm.reset();
    };

    const onReceiveRepayment = (values: z.infer<typeof receiveRepaymentSchema>) => {
        addCreditRepayment(values.amount, values.destination);
        toast({ title: "Success", description: "Credit repayment has been recorded." });
        receiveRepaymentForm.reset();
    };
    
    return (
        <AppLayout>
            <PageHeader title="Overall Credit" description="Manage a running total of credit given and received." />
            <div className="p-4 md:p-8 grid gap-8 md:grid-cols-2">
                <div className="space-y-6">
                    <Card><CardHeader><CardTitle className="font-headline">Current Outstanding Credit</CardTitle><CardDescription>The total amount of money owed to you.</CardDescription></CardHeader><CardContent><p className="text-3xl font-bold font-headline text-primary">{formatCurrency(currentOutstandingCredit)}</p></CardContent></Card>
                    <Card>
                        <CardHeader><CardTitle className="font-headline flex items-center gap-2"><ArrowLeftRight/>New Transaction</CardTitle><CardDescription>Record new credit given out or a repayment received.</CardDescription></CardHeader>
                        <CardContent>
                            <Tabs defaultValue="give">
                                <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="give">Give Credit</TabsTrigger><TabsTrigger value="receive">Receive Repayment</TabsTrigger></TabsList>
                                <TabsContent value="give" className="pt-4">
                                     <Form {...giveCreditForm}><form onSubmit={giveCreditForm.handleSubmit(onGiveCredit)} className="space-y-4"><FormField control={giveCreditForm.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount to Give</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} /><Button type="submit" className="w-full">Record Credit Given</Button></form></Form>
                                </TabsContent>
                                <TabsContent value="receive" className="pt-4">
                                     <Form {...receiveRepaymentForm}>
                                        <form onSubmit={receiveRepaymentForm.handleSubmit(onReceiveRepayment)} className="space-y-4">
                                             <FormField control={receiveRepaymentForm.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount Received</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                             <FormField control={receiveRepaymentForm.control} name="destination" render={({ field }) => (
                                                <FormItem className="space-y-2"><FormLabel>Repayment Destination</FormLabel>
                                                    <FormControl>
                                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-4">
                                                            <Label className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><RadioGroupItem value="cash" className="sr-only" /><HandCoins className="mb-3 h-6 w-6" />Add to Cash</Label>
                                                            {bankAccounts.map(acc => (
                                                                <Label key={acc.id} className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"><RadioGroupItem value={acc.id} className="sr-only" /><Landmark className="mb-3 h-6 w-6" />{acc.name}</Label>
                                                            ))}
                                                        </RadioGroup>
                                                    </FormControl><FormMessage />
                                                </FormItem>
                                            )} />
                                            <Button type="submit" className="w-full">Record Repayment</Button>
                                        </form>
                                    </Form>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
                 <Card>
                    <CardHeader><CardTitle className="font-headline">Credit History</CardTitle><CardDescription>A log of all credit transactions.</CardDescription></CardHeader>
                    <CardContent>
                         {creditHistory.length === 0 ? (
                             <div className="border rounded-lg p-8 text-center"><p className="text-muted-foreground">No credit transactions have been recorded yet.</p></div>
                         ) : (
                           <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4">
                            {creditHistory.map(tx => (
                               <div key={tx.id} className="flex items-center">
                                 <div className={cn("flex h-8 w-8 items-center justify-center rounded-full mr-4", tx.type === 'given' ? 'bg-destructive/10' : 'bg-primary/10')}><ArrowLeftRight className={cn("h-4 w-4", tx.type === 'given' ? 'text-destructive' : 'text-primary')}/></div>
                                 <div className="flex-1">
                                    <p className="font-medium">{tx.type === 'given' ? 'Credit Given' : `Repayment to ${tx.repaymentDestination === 'cash' ? 'Cash' : bankAccounts.find(a => a.id === tx.repaymentDestination)?.name}`}</p>
                                    <p className="text-sm text-muted-foreground">{formatCurrency(tx.amount)} on {format(parseISO(tx.date), 'dd MMM yyyy')}</p>
                                 </div>
                               </div>
                            ))}
                           </div>
                         )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
