
'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FileUp, Loader2, Bot, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import React, { useState } from 'react';
import { analyzeDsr, type AnalyzeDsrOutput } from '@/ai/flows/analyze-dsr-flow';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export default function DsrPage() {
    const { settings, processDsrData } = useAppState();
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalyzeDsrOutput | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
            setAnalysisResult(null);
        }
    };

    const handleExportFormat = () => {
        if (!settings) {
            toast({ title: 'Error', description: 'Settings not loaded yet.', variant: 'destructive' });
            return;
        }

        const csvSafe = (field: any) => {
            const str = String(field ?? '');
            return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
        };

        const headers = ['Date'];
        settings.fuels.forEach(fuel => {
            const nozzleCount = settings.nozzlesPerFuel[fuel.id] || 0;
            for (let i = 1; i <= nozzleCount; i++) {
                headers.push(csvSafe(`Opening - ${fuel.name} Nozzle ${i}`));
                headers.push(csvSafe(`Closing - ${fuel.name} Nozzle ${i}`));
            }
        });
        headers.push('Lubricant', 'Credit', 'Phonepe', 'Cash');

        const today = new Date();
        const daysInMonth = eachDayOfInterval({
            start: startOfMonth(today),
            end: endOfMonth(today),
        });

        const rows = daysInMonth.map(day => {
            const row = [format(day, 'dd.MM.yyyy')];
            // Add empty placeholders for all other columns
            for (let i = 1; i < headers.length; i++) {
                row.push('');
            }
            return row.join(',');
        });

        let csvContent = headers.join(',') + '\n' + rows.join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'DSR_Daily_Format.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({ title: "Format Exported", description: "DSR_Daily_Format.csv has been downloaded." });
    };

    const handleAnalyze = async () => {
        if (!file) {
            setError("Please select a file first.");
            return;
        }

        setIsAnalyzing(true);
        setError(null);
        setAnalysisResult(null);

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async (e) => {
                const dsrDataUri = e.target?.result as string;
                if (!dsrDataUri) {
                    setError("Could not read the file.");
                    setIsAnalyzing(false);
                    return;
                }
                
                if (!file.type.includes('pdf') && !file.name.endsWith('.csv')) {
                    setError("Please upload a PDF or CSV file.");
                    setIsAnalyzing(false);
                    return;
                }

                const result = await analyzeDsr({ dsrDataUri });
                setAnalysisResult(result);
                toast({ title: "Analysis Complete", description: "Please review the extracted data below." });
            };
            reader.onerror = () => {
                setError("Failed to read file.");
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
    
    const handleConfirmAndSave = () => {
        if (!analysisResult) {
            toast({ title: "Error", description: "No analysis data to save.", variant: 'destructive' });
            return;
        }
        try {
            processDsrData(analysisResult);
            toast({ title: "Success!", description: "Monthly report data has been successfully saved and applied." });
            setFile(null);
            setAnalysisResult(null);
        } catch (e) {
             const errorMessage = e instanceof Error ? e.message : "An unknown error occurred while saving.";
             toast({ title: "Save Failed", description: errorMessage, variant: 'destructive' });
        }
    }

  return (
    <AppLayout>
      <PageHeader
        title="Monthly Report Analysis"
        description="Upload a Report PDF or a filled CSV to automatically create your monthly summary."
      >
        <Button onClick={handleExportFormat} variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Export DSR Format
        </Button>
      </PageHeader>
      <div className="p-4 md:p-8 grid gap-8 md:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">1. Upload Report</CardTitle>
                <CardDescription>Select the report file (PDF or filled CSV) from your device.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <Label htmlFor="dsr-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FileUp className="w-10 h-10 mb-4 text-muted-foreground" />
                        {file ? (
                            <p className="font-semibold text-primary">{file.name}</p>
                        ) : (
                            <>
                                <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-muted-foreground">PDF or CSV file of your Monthly Sales Report</p>
                            </>
                        )}
                    </div>
                    <Input id="dsr-upload" type="file" className="hidden" onChange={handleFileChange} accept="application/pdf,.csv" />
                </Label>
                {error && <p className="text-sm text-destructive text-center">{error}</p>}

                 <Button onClick={handleAnalyze} disabled={!file || isAnalyzing} className="w-full">
                    {isAnalyzing ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                    ) : (
                        <><Bot className="mr-2 h-4 w-4" /> Analyze Report</>
                    )}
                </Button>
            </CardContent>
        </Card>
        <Card className={!isAnalyzing && !analysisResult ? 'bg-muted/50' : ''}>
             <CardHeader>
                <CardTitle className="font-headline">2. Review & Confirm</CardTitle>
                <CardDescription>Check the data extracted by the AI before saving.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin mb-4"/>
                        <p>AI is reading your report...</p>
                    </div>
                ) : analysisResult ? (
                    <div className="space-y-4">
                        <div className="p-3 rounded-md border bg-background space-y-2 text-sm">
                            <p className="font-semibold">Report End Date: <span className="font-normal">{format(parseISO(analysisResult.reportDate), 'dd MMM yyyy')}</span></p>
                            <p className="font-semibold">Total Fuel Sales: <span className="font-normal">{formatCurrency(analysisResult.fuelSales.reduce((acc, s) => acc + (s.closingReading - s.openingReading - s.testing) * s.pricePerLitre, 0))}</span></p>
                            <p className="font-semibold">Lube Sales: <span className="font-normal">{formatCurrency(analysisResult.lubricantSales)}</span></p>
                            <p className="font-semibold">Credit Sales: <span className="font-normal">{formatCurrency(analysisResult.creditSales)}</span></p>
                            <p className="font-semibold">PhonePe Sales: <span className="font-normal">{formatCurrency(analysisResult.phonepeSales)}</span></p>
                            <p className="font-semibold">Total Cash Deposits: <span className="font-normal">{analysisResult.bankDeposits.length > 0 ? formatCurrency(analysisResult.bankDeposits.reduce((acc, d) => acc + d.amount, 0)) : formatCurrency(0)}</span></p>
                             <p className="font-semibold">Net Cash in Hand: <span className="font-normal">{formatCurrency(analysisResult.cashInHand)}</span></p>
                        </div>
                        <div className="flex items-center gap-2 p-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-md">
                           <CheckCircle className="h-4 w-4"/>
                           <p>Data looks good? Click below to save it to your records.</p>
                        </div>
                        <Button onClick={handleConfirmAndSave} className="w-full bg-accent hover:bg-accent/90">Confirm and Save Data</Button>
                    </div>
                ) : (
                     <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                        <AlertTriangle className="w-8 h-8 mb-4"/>
                        <p>Awaiting analysis results...</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
