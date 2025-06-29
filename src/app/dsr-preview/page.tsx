'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DsrPreviewPage() {
  const { settings } = useAppState();

  const shiftReports = React.useMemo(() => {
    return settings?.shiftReports?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];
  }, [settings?.shiftReports]);

  const getEmployeeName = (id: string) => {
    return settings?.employees.find(e => e.id === id)?.name || 'Unknown Employee';
  };

  return (
    <AppLayout>
      <PageHeader
        title="DSR Preview"
        description="A recorded preview of all submitted shift reports."
      />
      <div className="p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Shift Report History</CardTitle>
            <CardDescription>
              Here is a complete log of all shift reports submitted by your employees.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {shiftReports.length === 0 ? (
              <div className="border rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No shift reports have been submitted yet.</p>
                <Button asChild variant="link">
                  <Link href="/shift-report">Submit your first shift report</Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Total Sales</TableHead>
                    <TableHead className="text-right">Credit Sales</TableHead>
                    <TableHead className="text-right">Online Payments</TableHead>
                    <TableHead className="text-right">Cash In Hand</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftReports.map(report => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">{format(parseISO(report.date), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <Badge variant={report.shiftType === 'day' ? 'default' : 'secondary'} className="capitalize">
                          {report.shiftType}
                        </Badge>
                      </TableCell>
                      <TableCell>{getEmployeeName(report.employeeId)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(report.totalSales)}</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(report.creditSales)}</TableCell>
                      <TableCell className="text-right text-blue-600">{formatCurrency(report.onlinePayments)}</TableCell>
                      <TableCell className="text-right font-semibold text-primary">{formatCurrency(report.cashInHand)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
