'use client';
import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useAppState } from '@/contexts/app-state-provider';
import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const purchaseSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  tankId: z.string().min(1, 'Tank selection is required'),
  quantity: z.coerce.number().positive('Quantity must be positive'),
  amount: z.coerce.number().positive('Amount must be positive'),
  invoiceNumber: z.string().optional(),
});

function AddPurchaseDialog({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
    const { settings, addFuelPurchase } = useAppState();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof purchaseSchema>>({
        resolver: zodResolver(purchaseSchema),
        defaultValues: {
            date: format(new Date(), 'yyyy-MM-dd'),
            tankId: '',
            quantity: 0,
            amount: 0,
            invoiceNumber: '',
        }
    });

    const onSubmit = (values: z.infer<typeof purchaseSchema>) => {
        const tank = settings?.tanks.find(t => t.id === values.tankId);
        if (!tank) {
            toast({ title: "Error", description: "Selected tank not found.", variant: 'destructive' });
            return;
        }

        addFuelPurchase({
            ...values,
            fuelId: tank.fuelId,
        });

        toast({ title: "Success", description: "Fuel purchase added successfully." });
        form.reset();
        setOpen(false);
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Fuel Purchase</DialogTitle>
                    <DialogDescription>Record a new fuel delivery from a supplier.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="date" render={({ field }) => (
                            <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        
                        <FormField control={form.control} name="tankId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tank</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a tank" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {settings?.tanks.map(tank => {
                                          const fuel = settings.fuels.find(f => f.id === tank.fuelId);
                                          return <SelectItem key={tank.id} value={tank.id}>{tank.name} ({fuel?.name})</SelectItem>
                                        })}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="quantity" render={({ field }) => (
                            <FormItem><FormLabel>Quantity (Ltrs)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        
                        <FormField control={form.control} name="amount" render={({ field }) => (
                            <FormItem><FormLabel>Total Amount Paid</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />

                        <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
                            <FormItem><FormLabel>Invoice Number (Optional)</FormLabel><FormControl><Input placeholder="e.g., INV-12345" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit">Add Purchase</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default function PurchasesPage() {
  const { settings, deleteFuelPurchase } = useAppState();
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);

  const purchases = useMemo(() => settings?.purchases || [], [settings]);

  return (
    <AppLayout>
      <PageHeader
        title="Fuel Purchases"
        description="Record new fuel deliveries and track your purchase history."
      >
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Purchase
        </Button>
      </PageHeader>
      <div className="p-4 md:p-8">
        <Card>
            <CardHeader>
                <CardTitle>Purchase History</CardTitle>
                <CardDescription>A list of all fuel purchase transactions.</CardDescription>
            </CardHeader>
            <CardContent>
                {purchases.length === 0 ? (
                  <div className="border rounded-lg p-8 text-center">
                      <p className="text-muted-foreground">No fuel purchases have been recorded yet.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Fuel</TableHead>
                        <TableHead>Invoice #</TableHead>
                        <TableHead className="text-right">Quantity (L)</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases.map(p => {
                        const fuel = settings?.fuels.find(f => f.id === p.fuelId);
                        return (
                          <TableRow key={p.id}>
                            <TableCell>{format(parseISO(p.date), 'dd MMM yyyy')}</TableCell>
                            <TableCell>{fuel?.name || 'N/A'}</TableCell>
                            <TableCell>{p.invoiceNumber || '-'}</TableCell>
                            <TableCell className="text-right">{p.quantity.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
                            <TableCell>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Purchase?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete this purchase record. It will also remove the associated bank debit and reduce the stock from the tank. This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteFuelPurchase(p.id)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
            </CardContent>
        </Card>
      </div>
      <AddPurchaseDialog open={isAddDialogOpen} setOpen={setIsAddDialogOpen} />
    </AppLayout>
  );
}
