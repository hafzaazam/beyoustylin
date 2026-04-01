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
import { STAFF_ROLES } from '@/types/salon';

const StaffPage = () => {
  const salon = useSalon();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', role: '', phone: '' });

  const resetForm = () => { setForm({ name: '', role: '', phone: '' }); setEditId(null); };

  const handleSubmit = () => {
    if (!form.name || !form.role || !form.phone) { toast({ title: 'Missing fields', variant: 'destructive' }); return; }
    if (editId) {
      salon.updateStaff(editId, form);
      toast({ title: 'Staff updated' });
    } else {
      salon.addStaff({ ...form, status: 'active' });
      toast({ title: 'Staff added' });
    }
    resetForm(); setOpen(false);
  };

  const startEdit = (s: typeof salon.staff[0]) => {
    setForm({ name: s.name, role: s.role, phone: s.phone });
    setEditId(s.id); setOpen(true);
  };

  const filtered = salon.staff.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <AdminLayout title="Staff">
      <div className="flex flex-wrap gap-3 mb-6">
        <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild><Button onClick={resetForm}><Plus className="w-4 h-4 mr-2" />Add Staff</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">{editId ? 'Edit' : 'Add'} Staff</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Role</Label>
                <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>{STAFF_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <Button className="w-full" onClick={handleSubmit}>{editId ? 'Update' : 'Add'} Staff</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Phone</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{s.role}</td>
                <td className="px-4 py-3">{s.phone}</td>
                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-4 py-3 flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => salon.toggleStaffStatus(s.id)}><ToggleLeft className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => salon.deleteStaff(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
};

export default StaffPage;
