import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Armchair, Loader2, Pencil, Plus, ToggleLeft, Trash2 } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useSalon } from '@/context/SalonContext';
import { useAuth } from '@/hooks/useAuth';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useConfirm } from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import { chairSchema, firstError } from '@/lib/validation';
import { formatTime } from '@/lib/format';
import { Booking, Chair } from '@/types/salon';

const isOngoing = (b: Booking, now: number) => {
  if (b.status === 'started') return true;
  if (b.status !== 'pending' && b.status !== 'confirmed') return false;
  return new Date(b.startTime).getTime() <= now && new Date(b.endTime).getTime() > now;
};

const ChairsPage = () => {
  const salon = useSalon();
  const { canManage } = useAuth();
  const { confirm, dialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Chair | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const usage = useMemo(() => {
    const now = Date.now();
    const today = new Date().toDateString();
    const map = new Map<string, { current?: Booking; today: number }>();
    for (const b of salon.bookings) {
      if (b.status === 'canceled') continue;
      const entry = map.get(b.chairId) ?? { today: 0 };
      if (new Date(b.startTime).toDateString() === today) entry.today += 1;
      if (!entry.current && isOngoing(b, now)) entry.current = b;
      map.set(b.chairId, entry);
    }
    return map;
  }, [salon.bookings]);

  const openAdd = () => { setEditing(null); setName(''); setError(null); setOpen(true); };
  const openEdit = (c: Chair) => { setEditing(c); setName(c.name); setError(null); setOpen(true); };

  const save = async () => {
    const parsed = chairSchema.safeParse({ name });
    const problem = firstError(parsed);
    if (problem || !parsed.success) return setError(problem);
    const duplicate = salon.chairs.some(c => c.id !== editing?.id && c.name.trim().toLowerCase() === parsed.data.name.toLowerCase());
    if (duplicate) return setError('A chair with this name already exists.');
    setSaving(true);
    const ok = editing
      ? await salon.updateChair(editing.id, { name: parsed.data.name })
      : await salon.addChair({ name: parsed.data.name, status: 'active' });
    setSaving(false);
    if (ok) {
      toast.success(editing ? 'Chair updated' : 'Chair added');
      setOpen(false);
    }
  };

  const remove = (c: Chair) => confirm({
    title: `Delete ${c.name}?`,
    description: 'Chairs that have bookings cannot be deleted — disable them instead so they stop appearing in new bookings.',
    confirmLabel: 'Delete chair',
    destructive: true,
    onConfirm: async () => { if (await salon.deleteChair(c.id)) toast.success('Chair deleted'); },
  });

  const addButton = <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add chair</Button>;

  return (
    <AdminLayout title="Chairs" actions={salon.chairs.length > 0 ? addButton : undefined}>
      {salon.chairs.length === 0 ? (
        <EmptyState
          icon={Armchair}
          title="No chairs yet"
          description="Every booking is assigned to a chair or station so two customers are never booked into the same seat. Add your chairs, beds and stations to start taking bookings."
          action={<Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add your first chair</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {salon.chairs.map(c => {
            const u = usage.get(c.id);
            const current = u?.current;
            const customer = current ? salon.getCustomerById(current.customerId) : undefined;
            return (
              <div key={c.id} className="group bg-card rounded-2xl border border-border/70 p-5 flex flex-col gap-3 shadow-[0_1px_2px_hsl(335_40%_20%/0.04),0_8px_24px_-14px_hsl(334_32%_42%/0.15)] hover:border-primary/30 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Armchair className="w-5 h-5" />
                    </div>
                    <h3 className="font-heading text-lg font-semibold truncate">{c.name}</h3>
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                <div className="text-sm space-y-1">
                  {current ? (
                    <p className="flex items-center gap-2 text-primary font-medium">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      In use{customer ? ` · ${customer.name}` : ''} until {formatTime(current.endTime)}
                    </p>
                  ) : (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-success" />
                      {c.status === 'active' ? 'Free right now' : 'Not in service'}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{u?.today ?? 0} booking{(u?.today ?? 0) === 1 ? '' : 's'} today</p>
                </div>

                <div className="mt-auto pt-3 border-t border-border/60 flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)} aria-label={`Rename ${c.name}`} title="Rename">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8"
                    onClick={async () => { if (await salon.toggleChairStatus(c.id)) toast.success(c.status === 'active' ? 'Chair disabled' : 'Chair enabled'); }}
                    aria-label={c.status === 'active' ? `Disable ${c.name}` : `Enable ${c.name}`}
                    title={c.status === 'active' ? 'Disable' : 'Enable'}
                  >
                    <ToggleLeft className="w-4 h-4" />
                  </Button>
                  {canManage && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => remove(c)} aria-label={`Delete ${c.name}`} title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={o => { if (!saving) setOpen(o); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? 'Rename chair' : 'Add chair'}</DialogTitle>
            <DialogDescription>For example "Chair 1", "Bridal Suite" or "Facial Bed".</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="chair-name">Name</Label>
              <Input id="chair-name" autoFocus value={name} maxLength={50} onChange={e => { setName(e.target.value); setError(null); }} />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editing ? 'Save' : 'Add chair'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      {dialog}
    </AdminLayout>
  );
};

export default ChairsPage;
