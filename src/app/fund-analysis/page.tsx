
'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FileUp, Loader2, Bot, AlertTriangle, Spline, Trash2, PlusCircle } from 'lucide-react';
import React, { useState } from 'react';
import { analyzeFunds } from '@/ai/flows/fund-analysis-flow';
import { formatCurrency, cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';

type FundAnalysisOutput = Awaited<ReturnType<typeof analyzeFunds>>;

const analysisFormSchema = z.object({
    yourInitialCapital: z.coerce.number().positive("Your capital must be a positive number."),
    managerInitialCapital: z.coerce.number().positive("Manager's capital must be a positive number."),
});

const TransactionTable = ({ transactions }: { transactions: FundAnalysisOutput['categorizedTransactions']['identifiedPurchases'] }) => {
    const { toast } = useToast();

    if (!transactions || transactions.length === 0) {
        return <p className="text-sm text-muted-foreground px-4 py-2">No transactions found in this category.</p>
    }

    const handleAdjust = () => {
        toast({ title: "Action Queued", description: "These transactions will be processed and adjusted in your portfolio soon." });
    };

    return (
        <div className="space-y-4">
            <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Fund Source</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                    {transactions.map((tx, index) => (
                        <TableRow key={index}>
                            <TableCell>{tx.date}</TableCell>
                            <TableCell className="font-medium">{tx.description}</TableCell>
                            <TableCell><Badge variant={tx.fundSource === 'Manager Fund' ? 'destructive' : 'default'}>{tx.fundSource}</Badge></TableCell>
                            <TableCell className="text-right">{formatCurrency(tx.amount)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <div className="px-4"><Button size="sm" variant="outline" onClick={handleAdjust}><PlusCircle className="mr-2 h-4 w-4" />Adjust in Portfolio</Button></div>
        </div>
    );
};


export default function FundAnalysisPage() {
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<FundAnalysisOutput | null>(null);
    const [error, setError] = useState<string | null>(null);

    const form = useForm<z.infer<typeof analysisFormSchema>>({
        resolver: zodResolver(analysisFormSchema),
        defaultValues: { yourInitialCapital: 5540000, managerInitialCapital: 1500000 }
    });

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) { setFile(selectedFile); setError(null); setAnalysisResult(null); }
    };

    const handleAnalyze = async (values: z.infer<typeof analysisFormSchema>) => {
        if (!file) { setError("Please select a bank statement file first."); return; }
        setIsAnalyzing(true); setError(null); setAnalysisResult(null);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async (e) => {
                const statementDataUri = e.target?.result as string;
                if (!statementDataUri) { setError("Could not read the file."); setIsAnalyzing(false); return; }
                const result = await analyzeFunds({ statementDataUri, ...values });
                setAnalysisResult(result);
                toast({ title: "Analysis Complete", description: "Review the fund breakdown below." });
            };
            reader.onerror = () => { setError("Failed to read file."); };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(errorMessage);
            toast({ title: "Analysis Failed", description: errorMessage, variant: 'destructive' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleReset = () => { setAnalysisResult(null); setFile(null); setError(null); form.reset(); };
    
  return (
    <AppLayout>
      <PageHeader title="Fund Analysis" description="Untangle merged funds to understand your true capital position."/>
      <div className="p-4 md:p-8">
        <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-6">
                <Card><CardHeader><CardTitle className="font-headline">The Challenge: Merged Funds</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-muted-foreground"><p>When your personal capital and the manager's investment are mixed in a single overdraft account, it becomes impossible to know whose money is being used for what.</p><p className="font-semibold text-foreground">This tool helps you solve that by reverse-engineering your bank statement to tag every transaction by its source, giving you clarity on your financial standing.</p></CardContent></Card>
                <Card>
                    <CardHeader><CardTitle className="font-headline">1. Provide Details & Upload Statement</CardTitle><CardDescription>Enter capital amounts and upload the bank statement to analyze.</CardDescription></CardHeader>
                    <CardContent className="space-y-4">
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleAnalyze)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="yourInitialCapital" render={({ field }) => (<FormItem><FormLabel>Your Initial Capital</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="managerInitialCapital" render={({ field }) => (<FormItem><FormLabel>Manager's Initial Capital</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <Label htmlFor="statement-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <FileUp className="w-8 h-8 mb-4 text-muted-foreground" />
                                        {file ? <p className="font-semibold text-primary">{file.name}</p> : <><p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p><p className="text-xs text-muted-foreground">Bank Statement (PDF, CSV, XLS)</p></>}
                                    </div>
                                    <Input id="statement-upload" type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
                                </Label>
                                {error && <p className="text-sm text-destructive text-center">{error}</p>}
                                <Button type="submit" disabled={!file || isAnalyzing} className="w-full">{isAnalyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : <><Spline className="mr-2 h-4 w-4" /> Analyze Statement</>}</Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                <Card className={!isAnalyzing && !analysisResult ? 'bg-muted/50' : ''}>
                    <CardHeader><CardTitle className="font-headline">2. Analysis Results</CardTitle><CardDescription>A breakdown of fund usage based on the AI analysis.</CardDescription></CardHeader>
                    <CardContent className="space-y-6">
                        {isAnalyzing ? <div className="flex flex-col items-center justify-center h-96 text-muted-foreground"><Loader2 className="w-8 h-8 animate-spin mb-4"/><p>AI is analyzing your statement...</p></div> : 
                        analysisResult ? (
                            <div className="space-y-6">
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Final Summary</CardTitle></CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Manager Fund Used</span><span className="font-semibold text-destructive">{formatCurrency(analysisResult.finalSummary.totalManagerFundUsed)}</span></div>
                                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Your Fund in Rotation</span><span className="font-semibold text-blue-600">{formatCurrency(analysisResult.finalSummary.yourFundInRotation)}</span></div>
                                        <div className="flex justify-between items-center"><span className="text-muted-foreground">Capital Returned to You</span><span className="font-semibold text-green-600">{formatCurrency(analysisResult.finalSummary.totalCapitalReturned)}</span></div>
                                        <div className="flex justify-between items-center pt-2 border-t"><span className="font-bold">Net Worth in Business</span><span className="font-bold text-lg">{formatCurrency(analysisResult.finalSummary.netWorthInBusiness)}</span></div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Detailed Transaction Breakdown</CardTitle><CardDescription>Review transactions categorized by the AI.</CardDescription></CardHeader>
                                    <CardContent>
                                        <Accordion type="multiple" defaultValue={['purchases']} className="w-full">
                                            <AccordionItem value="purchases"><AccordionTrigger><div className="flex items-center gap-2"><span>Identified Purchases</span><Badge variant="secondary">{analysisResult.categorizedTransactions.identifiedPurchases.length}</Badge></div></AccordionTrigger><AccordionContent><TransactionTable transactions={analysisResult.categorizedTransactions.identifiedPurchases} /></AccordionContent></AccordionItem>
                                            <AccordionItem value="manager"><AccordionTrigger><div className="flex items-center gap-2"><span>Manager Payments</span><Badge variant="secondary">{analysisResult.categorizedTransactions.managerPayments.length}</Badge></div></AccordionTrigger><AccordionContent><TransactionTable transactions={analysisResult.categorizedTransactions.managerPayments} /></AccordionContent></AccordionItem>
                                            <AccordionItem value="credit"><AccordionTrigger><div className="flex items-center gap-2"><span>Credit Payoffs</span><Badge variant="secondary">{analysisResult.categorizedTransactions.creditPayoffs.length}</Badge></div></AccordionTrigger><AccordionContent><TransactionTable transactions={analysisResult.categorizedTransactions.creditPayoffs} /></AccordionContent></AccordionItem>
                                            <AccordionItem value="unidentified"><AccordionTrigger><div className="flex items-center gap-2"><span>Unidentified Debits</span><Badge variant="destructive">{analysisResult.categorizedTransactions.unidentifiedDebits.length}</Badge></div></AccordionTrigger><AccordionContent><TransactionTable transactions={analysisResult.categorizedTransactions.unidentifiedDebits} /></AccordionContent></AccordionItem>
                                        </Accordion>
                                    </CardContent>
                                </Card>
                                <Button variant="outline" onClick={handleReset}><Trash2 className="mr-2 h-4 w-4" /> Reset & Start Over</Button>
                            </div>
                        ) : <div className="flex flex-col items-center justify-center h-96 text-muted-foreground"><AlertTriangle className="w-8 h-8 mb-4"/><p>Awaiting analysis results...</p></div>}
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </AppLayout>
  );
}
