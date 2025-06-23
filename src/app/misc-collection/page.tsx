'use client';
import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/app-state-provider';
import { formatCurrency } from '@/lib/utils';
import { PlusCircle, Trash2 } from 'lucide-react';
import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { HandCoins } from 'lucide-react';

const collectionSchema = z.object({
    date: z.string().min(1, 'Date is required'),
    description: z.string().min(1, 'Description is required'),
    amount: z.coerce.number().positive('Amount must be positive'),
});

function AddCollectionDialog({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
    const { addMiscCollection } = useAppState();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof collectionSchema>>({
        resolver: zodResolver(collectionSchema),
        defaultValues: {
            date: format(new Date(), 'yyyy-MM-dd'),
            description: '',
            amount: 0,
        }
    });

    const onSubmit = (values: z.infer<typeof collectionSchema>) => {
        addMiscCollection(values);
        toast({ title: "Success", description: "Collection added successfully." });
        form.reset();
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Miscellaneous Collection</DialogTitle>
                    <DialogDescription>Record a new cash inflow that is not from direct sales.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="date" render={({ field }) => (
                            <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="e.g., Scrap Sale" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="amount" render={({ field }) => (
                            <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit">Add Collection</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default function MiscCollectionPage() {
    const { settings, deleteMiscCollection } = useAppState();
    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);

    const miscCollections = settings?.miscCollections || [];

    const totalCollection = useMemo(() => {
        return miscCollections.reduce((acc, c) => acc + c.amount, 0);
    }, [miscCollections]);

    return (
        <AppLayout>
            <PageHeader
                title="Miscellaneous Collections"
                description="Record other cash inflows like debt recovery or scrap sales."
            >
                <Button onClick={() => setIsAddDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Collection
                </Button>
            </PageHeader>
            <div className="p-4 md:p-8 space-y-6">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Miscellaneous Collections</CardTitle>
                        <HandCoins className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-headline">{formatCurrency(totalCollection)}</div>
                        <p className="text-xs text-muted-foreground">This cash is added to your total cash in hand.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline">Collection History</CardTitle>
                        <CardDescription>A complete log of all miscellaneous collections.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {miscCollections.length === 0 ? (
                            <div className="border rounded-lg p-8 text-center">
                                <p className="text-muted-foreground">No collections have been recorded yet.</p>
                            </div>
                        ) : (
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                        <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {miscCollections.map(c => (
                                        <TableRow key={c.id}>
                                            <TableCell>{format(parseISO(c.date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>{c.description}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(c.amount)}</TableCell>
                                            <TableCell>
                                                 <AlertDialog>
                                                  <AlertDialogTrigger asChild>
                                                     <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                  </AlertDialogTrigger>
                                                  <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                      <AlertDialogTitle>Delete Collection?</AlertDialogTitle>
                                                      <AlertDialogDescription>
                                                        This will permanently delete this record. This action cannot be undone.
                                                      </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                      <AlertDialogAction onClick={() => deleteMiscCollection(c.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                  </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
            <AddCollectionDialog open={isAddDialogOpen} setOpen={setIsAddDialogOpen} />
        </AppLayout>
    );
}
