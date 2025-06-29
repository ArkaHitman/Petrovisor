
'use client';
import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, cn } from '@/lib/utils';
import { Banknote, Landmark, PlusCircle, Trash2, FileUp, Loader2 } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { analyzeBankStatement } from '@/ai/flows/analyze-bank-statement-flow';
import type { BankAccount } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const transactionSchema = z.object({
    accountId: z.string().min(1, 'Please select a bank account.'),
    date: z.string().min(1, 'Date is required'),
    description: z.string().min(1, 'Description is required'),
    type: z.enum(['credit', 'debit']),
    amount: z.coerce.number().positive('Amount must be positive'),
});

function AddTransactionDialog({ open, setOpen, bankAccounts }: { open: boolean; setOpen: (open: boolean) => void, bankAccounts: BankAccount[] }) {
    const { addBankTransaction } = useAppState();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof transactionSchema>>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            accountId: bankAccounts.find(acc => acc.isOverdraft)?.id || bankAccounts[0]?.id || '',
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
                <DialogHeader><DialogTitle>Add Bank Transaction</DialogTitle><DialogDescription>Record a new deposit or withdrawal for a specific account.</DialogDescription></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="accountId" render={({ field }) => (
                            <FormItem><FormLabel>Account</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select an account" /></SelectTrigger></FormControl>
                                    <SelectContent>{bankAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent>
                                </Select><FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="e.g., Cash Deposit" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="type" render={({ field }) => (
                            <FormItem className="space-y-3"><FormLabel>Transaction Type</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex space-x-4">
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="credit" /></FormControl><FormLabel className="font-normal">Credit (Deposit)</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="debit" /></FormControl><FormLabel className="font-normal">Debit (Withdrawal)</FormLabel></FormItem>
                                    </RadioGroup>
                                </FormControl><FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Add Transaction</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

function AnalyzeStatementDialog({ open, setOpen, bankAccounts }: { open: boolean; setOpen: (open: boolean) => void; bankAccounts: BankAccount[] }) {
    const { addBankTransaction } = useAppState();
    const { toast } = useToast();
    const [file, setFile] = React.useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [selectedAccountId, setSelectedAccountId] = React.useState<string>(bankAccounts[0]?.id || '');
    
    const handleAnalyze = async () => {
        if (!file) { setError("Please select a file first."); return; }
        if (!selectedAccountId) { setError("Please select a bank account."); return; }
        setIsAnalyzing(true);
        setError(null);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async (e) => {
                const statementDataUri = e.target?.result as string;
                if (!statementDataUri) { setError("Could not read the file."); setIsAnalyzing(false); return; }
                const analyzedTransactions = await analyzeBankStatement({ statementDataUri });
                if (analyzedTransactions.length === 0) {
                    toast({ title: "Analysis Complete", description: "No new transactions were found." });
                } else {
                    analyzedTransactions.forEach(tx => {
                        addBankTransaction({ ...tx, accountId: selectedAccountId, source: 'statement_import' });
                    });
                    toast({ title: "Success", description: `Added ${analyzedTransactions.length} transactions.` });
                }
                setFile(null);
                setOpen(false);
            };
            reader.onerror = () => { setError("Failed to read file."); setIsAnalyzing(false); };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(errorMessage);
            toast({ title: "Analysis Failed", description: errorMessage, variant: 'destructive' });
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    React.useEffect(() => { if (!open) { setFile(null); setError(null); setIsAnalyzing(false); }}, [open]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Analyze Bank Statement</DialogTitle><DialogDescription>Upload a statement, and the AI will extract transactions for the selected account.</DialogDescription></DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="space-y-2">
                        <Label htmlFor="account-select">Target Bank Account</Label>
                        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                            <SelectTrigger id="account-select"><SelectValue placeholder="Select an account" /></SelectTrigger>
                            <SelectContent>{bankAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <Label htmlFor="statement-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <FileUp className="w-8 h-8 mb-4 text-muted-foreground" />
                            {file ? <p className="font-semibold text-primary">{file.name}</p> : <p className="text-sm text-muted-foreground">Click or drag to upload</p>}
                        </div>
                        <Input id="statement-upload" type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} accept="image/png, image/jpeg, application/pdf" />
                    </Label>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isAnalyzing}>Cancel</Button>
                    <Button onClick={handleAnalyze} disabled={!file || !selectedAccountId || isAnalyzing}>
                        {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Analyze
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function BankPage() {
    const { settings, deleteBankTransaction, clearManualBankTransactions } = useAppState();
    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
    const [isAnalyzeDialogOpen, setIsAnalyzeDialogOpen] = React.useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState('all');
    const { toast } = useToast();

    const bankAccounts = settings?.bankAccounts || [];
    const bankLedger = settings?.bankLedger || [];

    const accountBalances = useMemo(() => {
        const balances = new Map<string, { account: BankAccount; balance: number }>();
        bankAccounts.forEach(account => {
            const transactionsForAccount = bankLedger.filter(tx => tx.accountId === account.id);
            const balance = transactionsForAccount.reduce((acc, tx) => {
                if (tx.type === 'credit') return acc + tx.amount;
                if (tx.type === 'debit') return acc - tx.amount;
                return acc;
            }, account.initialBalance);
            balances.set(account.id, { account, balance });
        });
        return balances;
    }, [bankAccounts, bankLedger]);

    const filteredLedger = useMemo(() => {
        if (selectedAccountId === 'all') {
            return bankLedger;
        }
        return bankLedger.filter(tx => tx.accountId === selectedAccountId);
    }, [bankLedger, selectedAccountId]);

    const canDeleteTransaction = (source?: string) => {
        const nonDeletableSources = ['credit_repayment', 'monthly_report_deposit', 'fuel_purchase', 'daily_report', 'shift_report', 'supplier_payment', 'journal_entry'];
        return !source || !nonDeletableSources.includes(source);
    };

    const handleClearManualTransactions = () => {
        clearManualBankTransactions();
        toast({ title: 'Success', description: 'Manually added transactions cleared.' });
    };
    
    return (
        <AppLayout>
            <PageHeader title="Bank Ledger" description="Track transactions across all your bank accounts.">
                <div className="flex gap-2 flex-wrap">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={bankLedger.filter(tx => canDeleteTransaction(tx.source)).length === 0}>
                                <Trash2 className="mr-2 h-4 w-4" /> Clear Manual
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Clear All Manual Transactions?</AlertDialogTitle><AlertDialogDescription>This action will permanently delete all transactions added manually or via statement import. System-generated entries are not affected.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleClearManualTransactions}>Clear Entries</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="outline" onClick={() => setIsAnalyzeDialogOpen(true)}><FileUp className="mr-2 h-4 w-4" /> Analyze Statement</Button>
                    <Button onClick={() => setIsAddDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Add Transaction</Button>
                </div>
            </PageHeader>
            <div className="p-4 md:p-8 space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from(accountBalances.values()).map(({ account, balance }) => (
                         <Card key={account.id}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{account.name}</CardTitle>
                                <Landmark className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold font-headline">{formatCurrency(balance)}</div>
                                <p className="text-xs text-muted-foreground">{account.accountNumber}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <Card>
                    <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div>
                            <CardTitle>Transaction History</CardTitle>
                            <CardDescription>A complete log of all credits and debits.</CardDescription>
                        </div>
                        <div className="w-full sm:w-auto sm:min-w-[250px]">
                             <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by account" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Accounts</SelectItem>
                                    {bankAccounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {filteredLedger.length === 0 ? (
                            <div className="border rounded-lg p-8 text-center"><p className="text-muted-foreground">No bank transactions found for the selected filter.</p></div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Account</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLedger.map(tx => (
                                        <TableRow key={tx.id}>
                                            <TableCell>{format(parseISO(tx.date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell className="font-medium">{tx.description}</TableCell>
                                            <TableCell><Badge variant="secondary">{accountBalances.get(tx.accountId)?.account.name || 'N/A'}</Badge></TableCell>
                                            <TableCell><Badge variant={tx.type === 'credit' ? 'default' : 'destructive'} className="capitalize">{tx.type}</Badge></TableCell>
                                            <TableCell className={cn("text-right font-semibold", tx.type === 'credit' ? 'text-primary' : 'text-destructive')}>
                                                {tx.type === 'credit' ? '+' : '-'} {formatCurrency(tx.amount)}
                                            </TableCell>
                                            <TableCell>
                                                {canDeleteTransaction(tx.source) && (
                                                    <AlertDialog>
                                                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                                      <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Delete Transaction?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteBankTransaction(tx.id)}>Delete</AlertDialogAction></AlertDialogFooter>
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
            {isAddDialogOpen && <AddTransactionDialog open={isAddDialogOpen} setOpen={setIsAddDialogOpen} bankAccounts={bankAccounts} />}
            {isAnalyzeDialogOpen && <AnalyzeStatementDialog open={isAnalyzeDialogOpen} setOpen={setIsAnalyzeDialogOpen} bankAccounts={bankAccounts} />}
        </AppLayout>
    );
}
