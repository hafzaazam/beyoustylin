import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, Power, Scissors, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useConfirm } from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSalon } from '@/context/SalonContext';
import { useAuth } from '@/hooks/useAuth';
import { Service, SERVICE_CATEGORIES } from '@/types/salon';
import { firstError, serviceSchema } from '@/lib/validation';
import { formatDuration, formatPKR } from '@/lib/format';

const emptyForm = { name: '', category: '', description: '', price: '', duration: '' };

const ServicesPage = () => {
  const salon = useSalon();
  const { canManage } = useAuth();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setForm(emptyForm); setEditId(null); setOpen(true); };
  const startEdit = (s: Service) => {
    setForm({ name: s.name, category: s.category, description: s.description ?? '', price: String(s.price), duration: String(s.duration) });
    setEditId(s.id); setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = serviceSchema.safeParse(form);
    const problem = firstError(parsed);
    if (problem || !parsed.success) { toast.error(problem); return; }
    const values = {
      name: parsed.data.name, category: parsed.data.category, description: parsed.data.description ?? '',
      price: parsed.data.price, duration: parsed.data.duration,
    };
    setSaving(true);
    const ok = editId ? await salon.updateService(editId, values) : await salon.addService({ ...values, status: 'active' });
    setSaving(false);
    if (ok) { toast.success(editId ? 'Service updated' : 'Service added'); setOpen(false); }
  };

  const remove = (s: Service) => confirm({
    title: `Delete "${s.name}"?`,
    description: 'Services used in a package or with booking history cannot be deleted — disable them to hide them from the website instead.',
    confirmLabel: 'Delete',
    destructive: true,
    onConfirm: async () => { if (await salon.deleteService(s.id)) toast.success('Service deleted'); },
  });

  const categories = Array.from(new Set(salon.services.map(s => s.category))).sort();
  const q = search.trim().toLowerCase();
  const filtered = salon.services.filter(s =>
    (category === 'all' || s.category === category)
    && (!q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)));

  return (
    <AdminLayout title="Services" actions={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add service</Button>}>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search services" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['all', ...categories].map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${category === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground hover:text-foreground'}`}
            >
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Scissors}
          title={salon.services.length === 0 ? 'No services yet' : 'No services match'}
          description={salon.services.length === 0 ? 'Services appear on the public website and in the booking form.' : undefined}
          action={salon.services.length === 0 && <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add service</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div key={s.id} className={`group relative bg-card rounded-2xl border border-border/70 p-5 flex flex-col gap-3 shadow-[var(--shadow-soft)] hover:border-primary/30 transition-all duration-300 ${s.status === 'disabled' ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-foreground truncate">{s.name}</h3>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{s.category}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>
              {s.description && <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>}
              <div className="flex items-baseline gap-3 text-sm">
                <span className="font-heading text-xl font-semibold text-primary">{s.price > 0 ? formatPKR(s.price) : 'On request'}</span>
                <span className="text-xs text-muted-foreground">· {formatDuration(s.duration)}</span>
              </div>
              <div className="mt-auto pt-3 border-t border-border/60 flex items-center justify-end gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(s)} aria-label={`Edit ${s.name}`} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => salon.toggleServiceStatus(s.id)} aria-label={s.status === 'active' ? 'Disable' : 'Enable'} title={s.status === 'active' ? 'Disable (hide from website)' : 'Enable'}><Power className="w-3.5 h-3.5" /></Button>
                {canManage && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(s)} aria-label={`Delete ${s.name}`} title="Delete"><Trash2 className="w-3.5 h-3.5" /></Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={v => { if (!saving) setOpen(v); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">{editId ? 'Edit' : 'Add'} service</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="sv-name">Name</Label><Input id="sv-name" value={form.name} maxLength={100} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
            <div className="space-y-1.5"><Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>{SERVICE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sv-desc">Description</Label>
              <Textarea id="sv-desc" rows={3} maxLength={1000} value={form.description} placeholder="Shown on the service page of the website" onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sv-price">Price (Rs.)</Label>
                <Input id="sv-price" type="number" min={0} inputMode="numeric" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
                <p className="text-[11px] text-muted-foreground">0 shows "On request".</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sv-duration">Duration (min)</Label>
                <Input id="sv-duration" type="number" min={5} step={5} inputMode="numeric" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editId ? 'Save changes' : 'Add service'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </AdminLayout>
  );
};

export default ServicesPage;
