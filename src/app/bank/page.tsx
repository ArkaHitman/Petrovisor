'use client';
import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency, cn } from '@/lib/utils';
import { Banknote, Landmark, PlusCircle, Trash2, FileUp, Loader2 } from 'lucide-react';
import React, { useMemo } from 'react';
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
import { analyzeBankStatement } from '@/ai/flows/analyze-bank-statement-flow';

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

function AnalyzeStatementDialog({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
    const { addBankTransaction } = useAppState();
    const { toast } = useToast();
    const [file, setFile] = React.useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleAnalyze = async () => {
        if (!file) {
            setError("Please select a file first.");
            return;
        }

        setIsAnalyzing(true);
        setError(null);

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async (e) => {
                const statementDataUri = e.target?.result as string;
                if (!statementDataUri) {
                    setError("Could not read the file.");
                    setIsAnalyzing(false);
                    return;
                }

                const analyzedTransactions = await analyzeBankStatement({ statementDataUri });
                
                if (analyzedTransactions.length === 0) {
                    toast({ title: "Analysis Complete", description: "No new transactions were found in the statement.", variant: 'default' });
                } else {
                    analyzedTransactions.forEach(tx => {
                        addBankTransaction({ ...tx, source: 'statement_import' });
                    });
                    toast({ title: "Success", description: `Successfully added ${analyzedTransactions.length} transactions from the statement.` });
                }
                
                setFile(null);
                setOpen(false);
            };
            reader.onerror = () => {
                setError("Failed to read file.");
                setIsAnalyzing(false);
            };
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred during analysis.";
            setError(errorMessage);
            toast({ title: "Analysis Failed", description: errorMessage, variant: 'destructive' });
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    React.useEffect(() => {
        if (!open) {
            setFile(null);
            setError(null);
            setIsAnalyzing(false);
        }
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Analyze Bank Statement</DialogTitle>
                    <DialogDescription>Upload an image or PDF of your bank statement, and the AI will automatically extract and record the transactions for you.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <Label htmlFor="statement-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <FileUp className="w-8 h-8 mb-4 text-muted-foreground" />
                            {file ? (
                                <p className="font-semibold text-primary">{file.name}</p>
                            ) : (
                                <>
                                  <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                  <p className="text-xs text-muted-foreground">PNG, JPG, or PDF file</p>
                                </>
                            )}
                        </div>
                        <Input id="statement-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/png, image/jpeg, application/pdf" />
                    </Label>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isAnalyzing}>Cancel</Button>
                    <Button onClick={handleAnalyze} disabled={!file || isAnalyzing}>
                        {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isAnalyzing ? 'Analyzing...' : 'Analyze Statement'}
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
    const { toast } = useToast();

    const bankLedger = settings?.bankLedger || [];
    const initialBalance = settings?.initialBankBalance || 0;

    const currentBalance = useMemo(() => {
        return bankLedger.reduce((acc, tx) => {
            if (tx.type === 'credit') return acc + tx.amount;
            if (tx.type === 'debit') return acc - tx.amount;
            return acc;
        }, initialBalance);
    }, [bankLedger, initialBalance]);

    const canDeleteTransaction = (source?: string) => {
        const nonDeletableSources = ['credit_repayment', 'monthly_report_deposit', 'fuel_purchase'];
        if (!source) return true;
        return !nonDeletableSources.includes(source);
    };

    const handleClearManualTransactions = () => {
        clearManualBankTransactions();
        toast({ title: 'Success', description: 'Manually added transactions have been cleared.' });
    };
    
    return (
        <AppLayout>
            <PageHeader
                title="Bank Ledger"
                description="Track all your bank transactions and view your current balance."
            >
                <div className="flex gap-2 flex-wrap">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={bankLedger.filter(tx => canDeleteTransaction(tx.source)).length === 0}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Clear Manual Entries
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Clear All Manual Transactions?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action will permanently delete all transactions added manually or via statement import.
                                    System-generated transactions (from fuel purchases, reports, etc.) will not be affected. This cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClearManualTransactions}>Clear Entries</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button variant="outline" onClick={() => setIsAnalyzeDialogOpen(true)}>
                        <FileUp className="mr-2 h-4 w-4" />
                        Analyze Statement
                    </Button>
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Transaction
                    </Button>
                </div>
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
                                                <Badge variant={tx.type === 'credit' ? 'default' : 'destructive'} className="capitalize">
                                                    {tx.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={cn("text-right font-semibold", tx.type === 'credit' ? 'text-primary' : 'text-destructive')}>
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
                                                            This will permanently delete this transaction. This action cannot be undone.
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
            <AnalyzeStatementDialog open={isAnalyzeDialogOpen} setOpen={setIsAnalyzeDialogOpen} />
        </AppLayout>
    );
}
