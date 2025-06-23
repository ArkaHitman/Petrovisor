'use client';
import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function TanksPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Live Tank Status"
        description="Real-time display of tank levels, capacity, and stock value."
      />
      <div className="p-4 md:p-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
            <CardHeader>
                <CardTitle>Petrol Tank 1</CardTitle>
                <CardDescription>Current estimated stock.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <Progress value={75} aria-label="75% full" />
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>7,500 L</span>
                    <span>10,000 L</span>
                </div>
                 <p className="text-sm font-medium">Est. Value: <span className="font-headline font-semibold">₹712,500</span></p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle>Diesel Tank 1</CardTitle>
                <CardDescription>Current estimated stock.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <Progress value={42} aria-label="42% full" />
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>4,200 L</span>
                    <span>10,000 L</span>
                </div>
                 <p className="text-sm font-medium">Est. Value: <span className="font-headline font-semibold">₹399,000</span></p>
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle>Power Tank</CardTitle>
                <CardDescription>Current estimated stock.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <Progress value={36} aria-label="36% full" />
                <div className="flex justify-between text-sm text-muted-foreground">
                    <span>1,800 L</span>
                    <span>5,000 L</span>
                </div>
                 <p className="text-sm font-medium">Est. Value: <span className="font-headline font-semibold">₹198,000</span></p>
            </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
