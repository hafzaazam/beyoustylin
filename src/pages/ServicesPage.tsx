import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useSalon } from '@/context/SalonContext';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Pencil, Trash2, ToggleLeft } from 'lucide-react';
import { SERVICE_CATEGORIES } from '@/types/salon';

const ServicesPage = () => {
  const salon = useSalon();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', category: '', price: '', duration: '' });

  const resetForm = () => { setForm({ name: '', category: '', price: '', duration: '' }); setEditId(null); };

  const handleSubmit = () => {
    if (!form.name || !form.category || !form.price || !form.duration) {
      toast({ title: 'Missing fields', variant: 'destructive' }); return;
    }
    if (editId) {
      salon.updateService(editId, { name: form.name, category: form.category, price: Number(form.price), duration: Number(form.duration) });
      toast({ title: 'Service updated' });
    } else {
      salon.addService({ name: form.name, category: form.category, price: Number(form.price), duration: Number(form.duration), status: 'active' });
      toast({ title: 'Service added' });
    }
    resetForm(); setOpen(false);
  };

  const startEdit = (s: typeof salon.services[0]) => {
    setForm({ name: s.name, category: s.category, price: String(s.price), duration: String(s.duration) });
    setEditId(s.id); setOpen(true);
  };

  const filtered = salon.services.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout title="Services">
      <div className="flex flex-wrap gap-3 mb-6">
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button onClick={resetForm}><Plus className="w-4 h-4 mr-2" />Add Service</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">{editId ? 'Edit' : 'Add'} Service</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{SERVICE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price ($)</Label><Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></div>
                <div><Label>Duration (min)</Label><Input type="number" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} /></div>
              </div>
              <Button className="w-full" onClick={handleSubmit}>{editId ? 'Update' : 'Add'} Service</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search services..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(s => (
          <div key={s.id} className="group relative bg-card rounded-2xl border border-border/70 p-5 flex flex-col gap-3 shadow-[0_1px_2px_hsl(335_40%_20%/0.04),0_8px_24px_-14px_hsl(334_32%_42%/0.15)] hover:shadow-[0_12px_32px_-12px_hsl(334_32%_42%/0.28)] hover:-translate-y-0.5 hover:border-primary/30 transition-all duration-300">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-heading font-semibold text-foreground truncate">{s.name}</h3>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{s.category}</p>
              </div>
              <StatusBadge status={s.status} />
            </div>
            <div className="flex items-baseline gap-3 text-sm">
              <span className="font-heading text-xl font-semibold text-primary">{s.price > 0 ? `Rs. ${s.price.toLocaleString()}` : 'On Request'}</span>
              <span className="text-xs text-muted-foreground">· {s.duration} min</span>
            </div>
            <div className="mt-auto pt-3 border-t border-border/60 flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => startEdit(s)}
                aria-label="Edit service"
                title="Edit"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => salon.toggleServiceStatus(s.id)}
                aria-label={s.status === 'active' ? 'Deactivate service' : 'Activate service'}
                title={s.status === 'active' ? 'Deactivate' : 'Activate'}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-info/10 hover:text-info transition-colors"
              >
                <ToggleLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => salon.deleteService(s.id)}
                aria-label="Delete service"
                title="Delete"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default ServicesPage;
