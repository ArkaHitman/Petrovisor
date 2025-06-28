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
import type { Employee } from '@/lib/types';

const employeeSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    role: z.string().min(1, 'Role is required'),
    contactNumber: z.string().optional(),
});

function EmployeeDialog({ open, setOpen, employee, onSave }: { open: boolean; setOpen: (open: boolean) => void; employee?: Employee | null; onSave: (data: z.infer<typeof employeeSchema>, id?: string) => void; }) {
    const form = useForm<z.infer<typeof employeeSchema>>({
        resolver: zodResolver(employeeSchema),
        defaultValues: employee || { name: '', role: '', contactNumber: '' },
    });

    React.useEffect(() => {
        form.reset(employee || { name: '', role: '', contactNumber: '' });
    }, [employee, form]);

    const onSubmit = (values: z.infer<typeof employeeSchema>) => {
        onSave(values, employee?.id);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{employee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
                    <DialogDescription>Enter the details for the employee.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="role" render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><FormControl><Input placeholder="e.g., Nozzle Operator" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="contactNumber" render={({ field }) => (<FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input placeholder="e.g., 9876543210" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Save Employee</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default function EmployeesPage() {
    const { settings, addEmployee, updateEmployee, deleteEmployee } = useAppState();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    const handleSave = (data: z.infer<typeof employeeSchema>, id?: string) => {
        if (id) {
            updateEmployee({ ...data, id, createdAt: settings?.employees.find(e=>e.id === id)?.createdAt || '' });
            toast({ title: "Success", description: "Employee details updated." });
        } else {
            addEmployee(data);
            toast({ title: "Success", description: "New employee added." });
        }
    };
    
    const openDialog = (employee: Employee | null = null) => {
        setSelectedEmployee(employee);
        setIsDialogOpen(true);
    };
    
    const employees = settings?.employees || [];

    return (
        <AppLayout>
            <PageHeader title="Employee Management" description="Add, edit, or remove staff members.">
                <Button onClick={() => openDialog()}><PlusCircle className="mr-2 h-4 w-4" /> Add Employee</Button>
            </PageHeader>
            <div className="p-4 md:p-8">
                <Card>
                    <CardHeader><CardTitle>Employee List</CardTitle><CardDescription>A list of all staff members.</CardDescription></CardHeader>
                    <CardContent>
                        {employees.length === 0 ? (
                            <div className="border rounded-lg p-8 text-center"><p className="text-muted-foreground">No employees have been added yet.</p></div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Contact Number</TableHead>
                                        <TableHead className="w-[120px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employees.map(e => (
                                        <TableRow key={e.id}>
                                            <TableCell className="font-medium">{e.name}</TableCell>
                                            <TableCell>{e.role}</TableCell>
                                            <TableCell>{e.contactNumber}</TableCell>
                                            <TableCell className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(e)}><Edit className="h-4 w-4" /></Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader><AlertDialogTitle>Delete Employee?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. Are you sure you want to delete {e.name}?</AlertDialogDescription></AlertDialogHeader>
                                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteEmployee(e.id)}>Delete</AlertDialogAction></AlertDialogFooter>
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
            <EmployeeDialog open={isDialogOpen} setOpen={setIsDialogOpen} employee={selectedEmployee} onSave={handleSave} />
        </AppLayout>
    );
}
