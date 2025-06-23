'use client';
import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';

export default function ReportsPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Weekly Reports"
        description="Manage and view your weekly sales and performance reports."
      >
        <Button className="bg-accent hover:bg-accent/90">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New Report
        </Button>
      </PageHeader>
      <div className="p-4 md:p-8">
        <Card>
            <CardHeader>
                <CardTitle>Reports History</CardTitle>
                <CardDescription>A list of all your past weekly reports.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="border rounded-lg p-8 text-center">
                    <p className="text-muted-foreground">No reports have been added yet.</p>
                </div>
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
