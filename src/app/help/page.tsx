'use client';

import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardPenLine, Landmark, Spline, Settings, CircleHelp } from 'lucide-react';

const featureList = [
    {
        category: 'Core Operations',
        icon: ClipboardPenLine,
        features: [
            {
                title: 'Shift Report',
                description: 'Record daily sales from each shift. The system automatically calculates fuel sales based on meter readings, updates tank stock, and handles cash, credit, and online payments. Opening meter readings are pre-filled from the previous shift to save time.'
            },
            {
                title: 'DIP Entry & Stock Variation',
                description: 'Update physical tank stock using DIP readings. The Stock Variation page then compares this physical stock against the calculated "book stock" (purchases minus sales) to highlight any gains or losses, helping you identify issues quickly.'
            },
        ]
    },
    {
        category: 'Financial Management',
        icon: Landmark,
        features: [
            {
                title: 'Bank Ledger',
                description: 'A centralized log of all transactions across your bank accounts. Entries are automatically created from various modules like supplier payments, credit repayments, and monthly report deposits.'
            },
            {
                title: 'Supplier Ledger',
                description: 'Manage your accounts payable with fuel suppliers. Record deliveries (manually or via AI Challan Analysis) and track payments. The live summary always shows your due or advance balance.'
            },
            {
                title: 'Credit Customers',
                description: 'Manage a list of credit customers, record credit sales, and log repayments. The system automatically tracks each customer\'s outstanding balance and updates your main financial dashboard.'
            },
             {
                title: 'Manager Ledger',
                description: 'Keep a clear record of all financial transactions with the station manager, including investments, salary payments, and reimbursements.'
            },
        ]
    },
    {
        category: 'AI & Data Tools',
        icon: Spline,
        features: [
            {
                title: 'AI Challan Analysis',
                description: 'Eliminate manual data entry for fuel purchases. Simply upload a photo or PDF of a delivery challan, and the AI will extract all details, including quantity and rate conversions. Just review and confirm to update your stock and supplier ledger.'
            },
            {
                title: 'AI DSR Analysis',
                description: 'Automate the creation of monthly reports. Upload your Monthly Sales Report (DSR) PDF, and the AI will analyze it to populate fuel sales, collections, and other key financial data, creating a complete report in seconds.'
            },
            {
                title: 'AI Fund Analysis',
                description: 'Untangle complex financial situations where personal and business funds are mixed in one account. The AI analyzes your bank statement to tag transactions and determine the true capital position of each party.'
            }
        ]
    },
    {
        category: 'Settings & Data',
        icon: Settings,
        features: [
            {
                title: 'Initial Setup',
                description: 'The setup wizard guides you through configuring your station, including fuels, tanks, and bank accounts. You can change these details anytime in the Settings page.'
            },
            {
                title: 'Data Management',
                description: 'Use the "Import Data" and "Export Data" buttons in Settings to create backups of your entire application state. This is useful for migrating to a new device or recovering from data loss. You can also export a complete transaction log as a CSV file for external analysis.'
            }
        ]
    }
];

export default function HelpPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Help & Support"
        description="Your guide to using PetroVisor effectively."
      >
        <div className="flex items-center gap-2 rounded-full border bg-accent/50 px-3 py-1 text-sm text-accent-foreground">
            <CircleHelp className="h-4 w-4" />
            <span>Getting Started Guide</span>
        </div>
      </PageHeader>
      <div className="p-4 md:p-8 space-y-6">
        {featureList.map((category, index) => (
            <Card key={index}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 font-headline">
                        <category.icon className="h-6 w-6 text-primary" />
                        {category.category}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        {category.features.map((feature, featureIndex) => (
                             <AccordionItem value={`item-${index}-${featureIndex}`} key={featureIndex}>
                                <AccordionTrigger className="text-base font-semibold">{feature.title}</AccordionTrigger>
                                <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                                    {feature.description}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
            </Card>
        ))}
        <Card className="mt-8 text-center bg-muted/50">
            <CardHeader>
                <CardTitle>Need More Help?</CardTitle>
                <CardDescription>If you encounter issues or have suggestions, please contact our support team at support@petrovisor.com.</CardDescription>
            </CardHeader>
        </Card>
      </div>
    </AppLayout>
  );
}
