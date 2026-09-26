import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, Power, Sparkles, Loader2 } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useConfirm } from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSalon } from '@/context/SalonContext';
import { useAuth } from '@/hooks/useAuth';
import { Staff, STAFF_ROLES } from '@/types/salon';
import { firstError, staffSchema } from '@/lib/validation';

const emptyForm = { name: '', role: '', phone: '' };

const StaffPage = () => {
  const salon = useSalon();
  const { canManage } = useAuth();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setForm(emptyForm); setEditId(null); setOpen(true); };
  const startEdit = (s: Staff) => { setForm({ name: s.name, role: s.role, phone: s.phone }); setEditId(s.id); setOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = staffSchema.safeParse(form);
    const problem = firstError(parsed);
    if (problem || !parsed.success) { toast.error(problem); return; }
    setSaving(true);
    const values = { name: parsed.data.name, role: parsed.data.role, phone: parsed.data.phone };
    const ok = editId ? await salon.updateStaff(editId, values) : await salon.addStaff({ ...values, status: 'active' });
    setSaving(false);
    if (ok) { toast.success(editId ? 'Staff updated' : 'Staff added'); setOpen(false); }
  };

  const remove = (s: Staff) => confirm({
    title: `Delete ${s.name}?`,
    description: 'Staff with booking history cannot be deleted — disable them instead so their past work stays on record.',
    confirmLabel: 'Delete',
    destructive: true,
    onConfirm: async () => { if (await salon.deleteStaff(s.id)) toast.success('Staff deleted'); },
  });

  const q = search.trim().toLowerCase();
  const filtered = salon.staff.filter(s => !q || s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || s.phone.includes(q));
  const upcomingCount = (staffId: string) =>
    salon.bookings.filter(b => b.staffId === staffId && ['pending', 'confirmed'].includes(b.status) && new Date(b.startTime) > new Date()).length;

  return (
    <AdminLayout title="Staff" actions={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add staff</Button>}>
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search name, role or phone" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={salon.staff.length === 0 ? 'No staff yet' : 'No staff match'}
          description={salon.staff.length === 0 ? 'Add your stylists and artists so bookings can be assigned to them.' : undefined}
          action={salon.staff.length === 0 && <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add staff</Button>}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Phone</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Upcoming</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.role}</td>
                    <td className="px-4 py-3"><a href={`tel:${s.phone}`} className="hover:text-primary">{s.phone}</a></td>
                    <td className="px-4 py-3 tabular-nums">{upcomingCount(s.id)}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(s)} aria-label={`Edit ${s.name}`} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => salon.toggleStaffStatus(s.id)} aria-label={s.status === 'active' ? 'Disable' : 'Enable'} title={s.status === 'active' ? 'Disable' : 'Enable'}><Power className="w-3.5 h-3.5" /></Button>
                        {canManage && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(s)} aria-label={`Delete ${s.name}`} title="Delete"><Trash2 className="w-3.5 h-3.5" /></Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={v => { if (!saving) setOpen(v); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">{editId ? 'Edit' : 'Add'} staff</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="st-name">Name</Label><Input id="st-name" value={form.name} maxLength={100} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
            <div className="space-y-1.5"><Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>{STAFF_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="st-phone">Phone</Label><Input id="st-phone" type="tel" value={form.phone} maxLength={20} placeholder="03XX XXXXXXX" onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editId ? 'Save changes' : 'Add staff'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </AdminLayout>
  );
};

export default StaffPage;
