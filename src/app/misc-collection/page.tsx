'use client';
import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';

export default function MiscCollectionPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Miscellaneous Collections"
        description="Record other cash inflows."
      >
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Collection
        </Button>
      </PageHeader>
      <div className="p-4 md:p-8">
        <Card>
            <CardHeader>
                <CardTitle>Collection History</CardTitle>
                <CardDescription>A complete log of all miscellaneous collections.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-lg p-8 text-center">
                    <p className="text-muted-foreground">No collections have been recorded yet.</p>
                </div>
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
