'use client';

import PageHeader from './page-header';
import StatCard from './stat-card';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency } from '@/lib/utils';
import { AreaChart, BarChart3, Banknote, Droplets, Wallet } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Progress } from './ui/progress';

export default function Dashboard() {
  const { settings } = useAppState();

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <PageHeader
        title={`Welcome to ${settings?.pumpName || 'Dashboard'}`}
        description="Here's a snapshot of your operations."
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Weekly Sales" value={formatCurrency(75231)} description="+20.1% from last week" icon={AreaChart} />
        <StatCard title="Weekly Profit" value={formatCurrency(12350)} description="+15.3% from last week" icon={BarChart3} />
        <StatCard title="Net Cash" value={formatCurrency(50120)} description="From last report" icon={Banknote} />
        <StatCard title="Total Litres Sold" value="7,580 L" description="Weekly total" icon={Droplets} />
      </div>
      
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="lg:col-span-4">
            <CardHeader>
                <CardTitle className="font-headline">Financial Snapshot</CardTitle>
                <CardDescription>An overview of your current financial position.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Sanctioned Amt.</p>
                    <p className="font-headline text-lg font-semibold">{formatCurrency(500000)}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Stock Value</p>
                    <p className="font-headline text-lg font-semibold">{formatCurrency(250000)}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Total Credit</p>
                    <p className="font-headline text-lg font-semibold">{formatCurrency(85000)}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Bank Balance</p>
                    <p className="font-headline text-lg font-semibold">{formatCurrency(120000)}</p>
                </div>
                 <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Remaining Limit</p>
                    <p className="font-headline text-lg font-semibold">{formatCurrency(45000)}</p>
                </div>
                 <div className="p-4 rounded-lg bg-primary/10 text-primary-foreground">
                    <p className="text-sm text-primary/80">Net Worth</p>
                    <p className="font-headline text-lg font-semibold text-primary">{formatCurrency(335000)}</p>
                </div>
            </CardContent>
        </Card>

        <Card className="lg:col-span-3">
             <CardHeader>
                <CardTitle className="font-headline">Tank Stock Overview</CardTitle>
                 <CardDescription>Live estimated stock in your tanks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Petrol</span>
                        <span className="text-sm text-muted-foreground">7,500 / 10,000 L</span>
                    </div>
                    <Progress value={75} />
                </div>
                 <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Diesel</span>
                        <span className="text-sm text-muted-foreground">4,200 / 10,000 L</span>
                    </div>
                    <Progress value={42} />
                </div>
                 <div>
                    <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Power</span>
                        <span className="text-sm text-muted-foreground">1,800 / 5,000 L</span>
                    </div>
                    <Progress value={36} />
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
