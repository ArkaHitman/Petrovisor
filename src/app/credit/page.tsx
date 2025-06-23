'use client';
import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';

export default function CreditPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Overall Credit"
        description="Manage credit given and received."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Credit Transaction
        </Button>
      </PageHeader>
      <div className="p-4 md:p-8">
        <Card>
            <CardHeader>
                <CardTitle>Credit History</CardTitle>
                <CardDescription>A complete log of all credit transactions.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg p-8 text-center">
                    <p className="text-muted-foreground">No credit transactions have been recorded yet.</p>
                </div>
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
