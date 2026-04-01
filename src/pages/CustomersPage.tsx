import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useSalon } from '@/context/SalonContext';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, ToggleLeft } from 'lucide-react';

const CustomersPage = () => {
  const salon = useSalon();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });

  const resetForm = () => { setForm({ name: '', phone: '', email: '', address: '' }); setEditId(null); };

  const handleSubmit = () => {
    if (!form.name || !form.phone) { toast({ title: 'Name and phone required', variant: 'destructive' }); return; }
    if (editId) {
      salon.updateCustomer(editId, form);
      toast({ title: 'Customer updated' });
    } else {
      salon.addCustomer({ ...form, status: 'active' });
      toast({ title: 'Customer added' });
    }
    resetForm(); setOpen(false);
  };

  const startEdit = (c: typeof salon.customers[0]) => {
    setForm({ name: c.name, phone: c.phone, email: c.email || '', address: c.address || '' });
    setEditId(c.id); setOpen(true);
  };

  const filtered = salon.customers.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search));

  return (
    <AdminLayout title="Customers">
      <div className="flex flex-wrap gap-3 mb-6">
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button onClick={resetForm}><Plus className="w-4 h-4 mr-2" />Add Customer</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">{editId ? 'Edit' : 'Add'} Customer</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Phone *</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleSubmit}>{editId ? 'Update' : 'Add'} Customer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.phone}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.email || '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-4 py-3 flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => salon.toggleCustomerStatus(c.id)}><ToggleLeft className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => salon.deleteCustomer(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default CustomersPage;
