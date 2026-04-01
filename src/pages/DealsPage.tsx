import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useSalon } from '@/context/SalonContext';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, ToggleLeft } from 'lucide-react';

const DealsPage = () => {
  const salon = useSalon();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', discountedPrice: '', serviceIds: [] as string[] });

  const resetForm = () => { setForm({ name: '', discountedPrice: '', serviceIds: [] }); setEditId(null); };

  const toggleService = (id: string) => {
    setForm(prev => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(id) ? prev.serviceIds.filter(s => s !== id) : [...prev.serviceIds, id]
    }));
  };

  const handleSubmit = () => {
    if (!form.name || !form.discountedPrice || form.serviceIds.length === 0) {
      toast({ title: 'Missing fields', description: 'Fill all fields and select services.', variant: 'destructive' }); return;
    }
    if (editId) {
      salon.updateDeal(editId, { name: form.name, discountedPrice: Number(form.discountedPrice), serviceIds: form.serviceIds });
      toast({ title: 'Deal updated' });
    } else {
      salon.addDeal({ name: form.name, discountedPrice: Number(form.discountedPrice), serviceIds: form.serviceIds, status: 'active' });
      toast({ title: 'Deal created' });
    }
    resetForm(); setOpen(false);
  };

  const startEdit = (d: typeof salon.deals[0]) => {
    setForm({ name: d.name, discountedPrice: String(d.discountedPrice), serviceIds: d.serviceIds });
    setEditId(d.id); setOpen(true);
  };

  const totalOriginal = form.serviceIds.reduce((sum, id) => {
    const svc = salon.getServiceById(id);
    return sum + (svc?.price || 0);
  }, 0);

  const totalDuration = form.serviceIds.reduce((sum, id) => {
    const svc = salon.getServiceById(id);
    return sum + (svc?.duration || 0);
  }, 0);

  return (
    <AdminLayout title="Deals">
      <div className="flex flex-wrap gap-3 mb-6">
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button onClick={resetForm}><Plus className="w-4 h-4 mr-2" />Create Deal</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-heading">{editId ? 'Edit' : 'Create'} Deal</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Deal Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div>
                <Label>Select Services</Label>
                <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto">
                  {salon.services.filter(s => s.status === 'active').map(s => (
                    <button key={s.id} type="button" onClick={() => toggleService(s.id)}
                      className={`p-2 rounded-lg border text-left text-sm transition-colors ${form.serviceIds.includes(s.id) ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:bg-muted'}`}>
                      <span className="font-medium">{s.name}</span>
                      <span className="block text-xs text-muted-foreground">${s.price} · {s.duration}min</span>
                    </button>
                  ))}
                </div>
              </div>
              {form.serviceIds.length > 0 && (
                <div className="p-3 rounded-lg bg-muted text-sm">
                  <p>Original total: <strong>${totalOriginal}</strong></p>
                  <p>Total duration: <strong>{totalDuration} min</strong></p>
                </div>
              )}
              <div><Label>Discounted Price ($)</Label><Input type="number" value={form.discountedPrice} onChange={e => setForm(p => ({ ...p, discountedPrice: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleSubmit}>{editId ? 'Update' : 'Create'} Deal</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {salon.deals.map(d => {
          const dealServices = d.serviceIds.map(id => salon.getServiceById(id)).filter(Boolean);
          return (
            <div key={d.id} className="bg-card rounded-xl border p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <h3 className="font-heading font-semibold text-foreground">{d.name}</h3>
                <StatusBadge status={d.status} />
              </div>
              <div className="flex flex-wrap gap-1">
                {dealServices.map(s => s && <span key={s.id} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{s.name}</span>)}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-primary">${d.discountedPrice}</span>
                <span className="text-muted-foreground">{d.totalDuration} min</span>
              </div>
              <div className="flex gap-1 mt-auto">
                <Button variant="ghost" size="sm" onClick={() => startEdit(d)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="sm" onClick={() => salon.toggleDealStatus(d.id)}><ToggleLeft className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => salon.deleteDeal(d.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          );
        })}
        {salon.deals.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">No deals yet. Create your first deal!</p>}
      </div>
    </AdminLayout>
  );
};

export default DealsPage;
