'use client';
import AppLayout from '@/components/layout/app-layout';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/app-state-provider';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Customer } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

const customerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    contactNumber: z.string().optional(),
    address: z.string().optional(),
});

function CustomerDialog({ open, setOpen, customer, onSave }: { open: boolean; setOpen: (open: boolean) => void; customer?: Customer | null; onSave: (data: z.infer<typeof customerSchema>, id?: string) => void; }) {
    const form = useForm<z.infer<typeof customerSchema>>({
        resolver: zodResolver(customerSchema),
        defaultValues: customer || { name: '', contactNumber: '', address: '' },
    });

    React.useEffect(() => {
        form.reset(customer || { name: '', contactNumber: '', address: '' });
    }, [customer, form]);

    const onSubmit = (values: z.infer<typeof customerSchema>) => {
        onSave(values, customer?.id);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{customer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
                    <DialogDescription>Enter the details for the credit customer.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name / Company Name</FormLabel><FormControl><Input placeholder="e.g., ABC Constructions" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="contactNumber" render={({ field }) => (<FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input placeholder="e.g., 9876543210" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Textarea placeholder="Enter customer's address" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Save Customer</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default function CustomersPage() {
    const { settings, addCustomer, updateCustomer, deleteCustomer } = useAppState();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const customerBalances = React.useMemo(() => {
        const balances = new Map<string, number>();
        (settings?.customers || []).forEach(c => balances.set(c.id, 0));
        (settings?.creditHistory || []).forEach(tx => {
            const currentBalance = balances.get(tx.customerId) || 0;
            if (tx.type === 'given') {
                balances.set(tx.customerId, currentBalance + tx.amount);
            } else if (tx.type === 'repaid') {
                balances.set(tx.customerId, currentBalance - tx.amount);
            }
        });
        return balances;
    }, [settings?.customers, settings?.creditHistory]);
    
    const handleSave = (data: z.infer<typeof customerSchema>, id?: string) => {
        if (id) {
            updateCustomer({ ...data, id, createdAt: settings?.customers.find(e=>e.id === id)?.createdAt || '' });
            toast({ title: "Success", description: "Customer details updated." });
        } else {
            addCustomer(data);
            toast({ title: "Success", description: "New customer added." });
        }
    };
    
    const openDialog = (customer: Customer | null = null) => {
        setSelectedCustomer(customer);
        setIsDialogOpen(true);
    };
    
    const customers = settings?.customers || [];

    return (
        <AppLayout>
            <PageHeader title="Customer Management" description="Add, edit, or remove credit customers.">
                <Button onClick={() => openDialog()}><PlusCircle className="mr-2 h-4 w-4" /> Add Customer</Button>
            </PageHeader>
            <div className="p-4 md:p-8">
                <Card>
                    <CardHeader><CardTitle>Customer List</CardTitle><CardDescription>A list of all credit customers and their outstanding balances.</CardDescription></CardHeader>
                    <CardContent>
                        {customers.length === 0 ? (
                            <div className="border rounded-lg p-8 text-center"><p className="text-muted-foreground">No customers have been added yet.</p></div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Address</TableHead>
                                        <TableHead className="text-right">Balance</TableHead>
                                        <TableHead className="w-[120px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {customers.map(c => (
                                        <TableRow key={c.id}>
                                            <TableCell className="font-medium">{c.name}</TableCell>
                                            <TableCell>{c.contactNumber}</TableCell>
                                            <TableCell>{c.address}</TableCell>
                                            <TableCell className="text-right font-semibold">{formatCurrency(customerBalances.get(c.id) || 0)}</TableCell>
                                            <TableCell className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(c)}><Edit className="h-4 w-4" /></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Delete Customer?</AlertDialogTitle><AlertDialogDescription>This action will permanently delete {c.name} and all associated credit history. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteCustomer(c.id)}>Delete</AlertDialogAction></AlertDialogFooter>
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
            <CustomerDialog open={isDialogOpen} setOpen={setIsDialogOpen} customer={selectedCustomer} onSave={handleSave} />
        </AppLayout>
    );
}
