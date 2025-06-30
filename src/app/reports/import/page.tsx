'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { FileUp, Loader2, Bot } from 'lucide-react';
import React, { useState } from 'react';
import { analyzeMonthlyReport } from '@/ai/flows/analyze-monthly-report-flow';
import { useRouter } from 'next/navigation';

export default function ImportMonthlyReportPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleAnalyze = async () => {
        if (!file) { setError("Please select a file first."); return; }
        setIsAnalyzing(true); setError(null);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async (e) => {
                const reportDataUri = e.target?.result as string;
                if (!reportDataUri) { setError("Could not read the file."); setIsAnalyzing(false); return; }

                const result = await analyzeMonthlyReport({ reportDataUri });
                
                // Encode result and pass as query param
                const encodedResult = btoa(JSON.stringify(result));
                router.push(`/reports/add?importData=${encodedResult}`);
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

    return (
        <AppLayout>
            <PageHeader
                title="AI Monthly Report Import"
                description="Upload a sales report (PDF or Excel) to pre-fill a new monthly report."
            />
            <div className="p-4 md:p-8">
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle className="font-headline">1. Upload Report</CardTitle>
                        <CardDescription>Select the monthly report file from your device.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <Label htmlFor="report-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <FileUp className="w-10 h-10 mb-4 text-muted-foreground" />
                                {file ? (<p className="font-semibold text-primary">{file.name}</p>) : (<p className="text-sm text-muted-foreground">Click or drag and drop to upload</p>)}
                            </div>
                            <Input id="report-upload" type="file" className="hidden" onChange={handleFileChange} accept="application/pdf,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" />
                        </Label>
                        {error && <p className="text-sm text-destructive text-center">{error}</p>}
                        <Button onClick={handleAnalyze} disabled={!file || isAnalyzing} className="w-full">
                            {isAnalyzing ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>) : (<><Bot className="mr-2 h-4 w-4" /> Analyze and Continue</>)}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
