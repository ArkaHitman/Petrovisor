'use client';
import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Eye, PlusCircle, Trash2, Pencil } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WeeklyReport } from '@/lib/types';
import ReportDetails from '@/components/report-details';

export default function ReportsPage() {
  const { settings, deleteWeeklyReport } = useAppState();
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = React.useState<WeeklyReport | null>(null);

  const handleDelete = (reportId: string) => {
    deleteWeeklyReport(reportId);
    toast({ title: 'Success', description: 'Weekly report has been deleted.' });
  };
  
  return (
    <AppLayout>
      <PageHeader
        title="Weekly Reports"
        description="Manage and view your weekly sales and performance reports."
      >
        <Button asChild className="bg-accent hover:bg-accent/90">
          <Link href="/reports/add">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Report
          </Link>
        </Button>
      </PageHeader>
      <div className="p-4 md:p-8">
        <Card>
            <CardHeader>
                <CardTitle>Reports History</CardTitle>
                <CardDescription>A list of all your past weekly reports.</CardDescription>
            </CardHeader>
            <CardContent>
                 {settings?.weeklyReports && settings.weeklyReports.length > 0 ? (
                   <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Week Ending</TableHead>
                          <TableHead>Total Sales</TableHead>
                          <TableHead>Est. Profit</TableHead>
                          <TableHead>Net Cash</TableHead>
                          <TableHead className="w-[120px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {settings.weeklyReports.map(report => (
                          <TableRow key={report.id}>
                            <TableCell className="font-medium">{format(parseISO(report.endDate), 'dd MMM yyyy')}</TableCell>
                            <TableCell>{formatCurrency(report.totalSales)}</TableCell>
                            <TableCell>{formatCurrency(report.estProfit)}</TableCell>
                            <TableCell>{formatCurrency(report.netCash)}</TableCell>
                            <TableCell className="flex gap-1">
                               <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedReport(report)}>
                                 <Eye className="h-4 w-4" />
                               </Button>
                               <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                  <Link href={`/reports/add?id=${report.id}`}>
                                      <Pencil className="h-4 w-4" />
                                  </Link>
                               </Button>
                               <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Report?</AlertDialogTitle>
                                      <AlertDialogDescription>This will permanently delete this report and any associated bank deposits. This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(report.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                   </Table>
                 ) : (
                     <div className="border rounded-lg p-8 text-center">
                        <p className="text-muted-foreground">No reports have been added yet.</p>
                        <Button asChild variant="link">
                          <Link href="/reports/add">Create your first report</Link>
                        </Button>
                    </div>
                 )}
            </CardContent>
        </Card>
      </div>
       {selectedReport && (
        <ReportDetails
          report={selectedReport}
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </AppLayout>
  );
}
