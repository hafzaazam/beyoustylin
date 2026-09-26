import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Power, Crown, Check, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useConfirm } from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSalon } from '@/context/SalonContext';
import { useAuth } from '@/hooks/useAuth';
import { Deal } from '@/types/salon';
import { dealSchema, firstError } from '@/lib/validation';
import { formatDuration, formatPKR } from '@/lib/format';
import { cn } from '@/lib/utils';

const emptyForm = { name: '', discountedPrice: '', serviceIds: [] as string[] };

const DealsPage = () => {
  const salon = useSalon();
  const { canManage } = useAuth();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setForm(emptyForm); setEditId(null); setOpen(true); };
  const startEdit = (d: Deal) => {
    setForm({ name: d.name, discountedPrice: String(d.discountedPrice), serviceIds: d.serviceIds });
    setEditId(d.id); setOpen(true);
  };

  const toggleService = (id: string) => setForm(prev => ({
    ...prev,
    serviceIds: prev.serviceIds.includes(id) ? prev.serviceIds.filter(s => s !== id) : [...prev.serviceIds, id],
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = dealSchema.safeParse(form);
    const problem = firstError(parsed);
    if (problem || !parsed.success) { toast.error(problem); return; }
    const values = { name: parsed.data.name, discountedPrice: parsed.data.discountedPrice, serviceIds: parsed.data.serviceIds };
    setSaving(true);
    const ok = editId ? await salon.updateDeal(editId, values) : await salon.addDeal({ ...values, status: 'active' });
    setSaving(false);
    if (ok) { toast.success(editId ? 'Package updated' : 'Package created'); setOpen(false); }
  };

  const remove = (d: Deal) => confirm({
    title: `Delete "${d.name}"?`,
    description: 'Packages with booking history cannot be deleted — disable them to hide them from the website instead.',
    confirmLabel: 'Delete',
    destructive: true,
    onConfirm: async () => { if (await salon.deleteDeal(d.id)) toast.success('Package deleted'); },
  });

  const selected = form.serviceIds.map(id => salon.getServiceById(id)).filter(Boolean);
  const totalOriginal = selected.reduce((sum, s) => sum + (s?.price || 0), 0);
  const totalDuration = selected.reduce((sum, s) => sum + (s?.duration || 0), 0);
  const priceNum = Number(form.discountedPrice);
  const pickable = salon.services.filter(s => s.status === 'active' || form.serviceIds.includes(s.id));

  return (
    <AdminLayout title="Deals & Packages" actions={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Create package</Button>}>
      {salon.deals.length === 0 ? (
        <EmptyState
          icon={Crown}
          title="No packages yet"
          description="Bundle services at a special price — e.g. a bridal package. Packages appear on the website's Packages page."
          action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Create package</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {salon.deals.map(d => {
            const dealServices = d.serviceIds.map(id => salon.getServiceById(id)).filter(Boolean);
            const originalTotal = dealServices.reduce((sum, s) => sum + (s?.price || 0), 0);
            const savings = originalTotal - d.discountedPrice;
            return (
              <div key={d.id} className={`group relative bg-card rounded-2xl border border-border/70 p-5 flex flex-col gap-3 shadow-[var(--shadow-soft)] hover:border-primary/30 transition-all duration-300 ${d.status === 'disabled' ? 'opacity-70' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-heading font-semibold text-foreground truncate">{d.name}</h3>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">Bundle · {dealServices.length} services · {formatDuration(d.totalDuration)}</p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
                <div className="flex flex-wrap gap-1">
                  {dealServices.map(s => s && (
                    <span key={s.id} className="text-[11px] bg-secondary/60 px-2 py-0.5 rounded-full text-secondary-foreground ring-1 ring-inset ring-border/60">{s.name}</span>
                  ))}
                </div>
                <div className="flex items-baseline gap-3 text-sm">
                  <span className="font-heading text-xl font-semibold text-primary">{formatPKR(d.discountedPrice)}</span>
                  {savings > 0 && <span className="text-xs text-muted-foreground line-through">{formatPKR(originalTotal)}</span>}
                </div>
                {savings > 0 && (
                  <span className="inline-flex self-start text-[11px] font-semibold px-2 py-0.5 rounded-full bg-success/10 text-success ring-1 ring-inset ring-success/20">
                    Save {formatPKR(savings)}
                  </span>
                )}
                <div className="mt-auto pt-3 border-t border-border/60 flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(d)} aria-label={`Edit ${d.name}`} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => salon.toggleDealStatus(d.id)} aria-label={d.status === 'active' ? 'Disable' : 'Enable'} title={d.status === 'active' ? 'Disable (hide from website)' : 'Enable'}><Power className="w-3.5 h-3.5" /></Button>
                  {canManage && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(d)} aria-label={`Delete ${d.name}`} title="Delete"><Trash2 className="w-3.5 h-3.5" /></Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={v => { if (!saving) setOpen(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">{editId ? 'Edit' : 'Create'} package</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="dl-name">Package name</Label><Input id="dl-name" value={form.name} maxLength={100} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
            <div className="space-y-1.5">
              <Label>Services ({form.serviceIds.length} selected)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {pickable.map(s => {
                  const on = form.serviceIds.includes(s.id);
                  return (
                    <button key={s.id} type="button" onClick={() => toggleService(s.id)} aria-pressed={on}
                      className={cn('p-2.5 rounded-lg border text-left text-sm transition-colors flex gap-2', on ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted')}>
                      <span className={cn('mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0', on ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40')}>
                        {on && <Check className="w-3 h-3" />}
                      </span>
                      <span className="min-w-0">
                        <span className="font-medium block truncate">{s.name}</span>
                        <span className="block text-xs text-muted-foreground">{s.price > 0 ? formatPKR(s.price) : 'On request'} · {formatDuration(s.duration)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {form.serviceIds.length > 0 && (
              <div className="p-3 rounded-lg bg-muted text-sm grid grid-cols-2 gap-1">
                <span className="text-muted-foreground">Separate prices</span><strong className="text-right tabular-nums">{formatPKR(totalOriginal)}</strong>
                <span className="text-muted-foreground">Total duration</span><strong className="text-right">{formatDuration(totalDuration)}</strong>
                {form.discountedPrice !== '' && !Number.isNaN(priceNum) && totalOriginal > 0 && (
                  <>
                    <span className="text-muted-foreground">Customer saves</span>
                    <strong className={`text-right tabular-nums ${priceNum > totalOriginal ? 'text-warning' : 'text-success'}`}>
                      {priceNum > totalOriginal ? 'costs more than separately' : formatPKR(totalOriginal - priceNum)}
                    </strong>
                  </>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="dl-price">Package price (Rs.)</Label>
              <Input id="dl-price" type="number" min={0} inputMode="numeric" value={form.discountedPrice} onChange={e => setForm(p => ({ ...p, discountedPrice: e.target.value }))} />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editId ? 'Save changes' : 'Create package'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </AdminLayout>
  );
};

export default DealsPage;
