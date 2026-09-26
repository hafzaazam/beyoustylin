import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Search, Pencil, Trash2, Power, HeartHandshake, Link2, Link2Off, Loader2, UserCheck } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useConfirm } from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import Pager, { usePaged } from '@/components/Pager';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSalon } from '@/context/SalonContext';
import { useAuth } from '@/hooks/useAuth';
import { Customer } from '@/types/salon';
import { customerSchema, firstError } from '@/lib/validation';
import { normalizePhone } from '@/lib/booking';
import { formatDate, formatPKR } from '@/lib/format';

const emptyForm = { name: '', phone: '', email: '', address: '' };

const CustomersPage = () => {
  const salon = useSalon();
  const { canManage } = useAuth();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState<Customer | null>(null);
  const [linkEmail, setLinkEmail] = useState('');

  const openNew = () => { setForm(emptyForm); setEditId(null); setOpen(true); };
  const startEdit = (c: Customer) => {
    setForm({ name: c.name, phone: c.phone, email: c.email || '', address: c.address || '' });
    setEditId(c.id); setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = customerSchema.safeParse(form);
    const problem = firstError(parsed);
    if (problem || !parsed.success) { toast.error(problem); return; }
    const duplicate = salon.customers.find(c => c.id !== editId && normalizePhone(c.phone) === normalizePhone(parsed.data.phone));
    if (duplicate) { toast.error(`${duplicate.name} already uses this phone number.`); return; }
    setSaving(true);
    const values = { name: parsed.data.name, phone: parsed.data.phone, email: parsed.data.email ?? '', address: parsed.data.address ?? '' };
    const ok = editId ? await salon.updateCustomer(editId, values) : !!(await salon.addCustomer({ ...values, status: 'active' }));
    setSaving(false);
    if (ok) { toast.success(editId ? 'Customer updated' : 'Customer added'); setOpen(false); }
  };

  const remove = (c: Customer) => confirm({
    title: `Delete ${c.name}?`,
    description: 'Customers with bookings or invoices cannot be deleted — disable them instead to keep their history.',
    confirmLabel: 'Delete',
    destructive: true,
    onConfirm: async () => { if (await salon.deleteCustomer(c.id)) toast.success('Customer deleted'); },
  });

  const submitLink = async () => {
    if (!linking) return;
    setSaving(true);
    const ok = await salon.linkCustomerAccount(linking.id, linkEmail.trim());
    setSaving(false);
    if (ok) { toast.success(`${linking.name} can now see their bookings in My Account`); setLinking(null); }
  };

  const unlink = (c: Customer) => confirm({
    title: `Unlink ${c.name}'s online account?`,
    description: 'They will no longer see these bookings and invoices when signed in.',
    confirmLabel: 'Unlink',
    onConfirm: async () => { if (await salon.linkCustomerAccount(c.id, null)) toast.success('Account unlinked'); },
  });

  // Visit stats per customer
  const stats = useMemo(() => {
    const map = new Map<string, { visits: number; spent: number; last?: string }>();
    salon.bookings.forEach(b => {
      if (b.status !== 'completed') return;
      const s = map.get(b.customerId) ?? { visits: 0, spent: 0 };
      s.visits += 1;
      if (!s.last || b.startTime > s.last) s.last = b.startTime;
      map.set(b.customerId, s);
    });
    salon.invoices.forEach(i => {
      if (i.status !== 'paid') return;
      const s = map.get(i.customerId) ?? { visits: 0, spent: 0 };
      s.spent += i.totalAmount;
      map.set(i.customerId, s);
    });
    return map;
  }, [salon.bookings, salon.invoices]);

  const q = search.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, '');
  const filtered = salon.customers.filter(c =>
    !q || c.name.toLowerCase().includes(q) || (c.email ?? '').toLowerCase().includes(q)
    || (qDigits.length >= 3 && normalizePhone(c.phone).includes(qDigits)));
  const paged = usePaged(filtered, 25, search);

  return (
    <AdminLayout title="Customers" actions={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add customer</Button>}>
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search name, phone or email" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title={salon.customers.length === 0 ? 'No customers yet' : 'No customers match'}
          description={salon.customers.length === 0 ? 'Customers are also added automatically when you book a new walk-in or convert an online request.' : undefined}
          action={salon.customers.length === 0 && <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add customer</Button>}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Contact</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Visits</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Paid</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr></thead>
              <tbody>
                {paged.pageItems.map(c => {
                  const s = stats.get(c.id);
                  return (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium flex items-center gap-1.5">
                          {c.name}
                          {c.userId && <span title="Has an online account"><UserCheck className="w-3.5 h-3.5 text-success" aria-label="Has an online account" /></span>}
                        </div>
                        {c.address && <div className="text-xs text-muted-foreground truncate max-w-[14rem]">{c.address}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <a href={`tel:${c.phone}`} className="hover:text-primary">{c.phone}</a>
                        <div className="text-xs text-muted-foreground">{c.email || '—'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="tabular-nums">{s?.visits ?? 0}</span>
                        {s?.last && <div className="text-xs text-muted-foreground">last {formatDate(s.last)}</div>}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{formatPKR(s?.spent ?? 0)}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(c)} aria-label={`Edit ${c.name}`} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
                          {c.userId ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => unlink(c)} aria-label="Unlink online account" title="Unlink online account"><Link2Off className="w-3.5 h-3.5" /></Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setLinkEmail(c.email ?? ''); setLinking(c); }} aria-label="Link online account" title="Link online account"><Link2 className="w-3.5 h-3.5" /></Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => salon.toggleCustomerStatus(c.id)} aria-label={c.status === 'active' ? 'Disable' : 'Enable'} title={c.status === 'active' ? 'Disable' : 'Enable'}><Power className="w-3.5 h-3.5" /></Button>
                          {canManage && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(c)} aria-label={`Delete ${c.name}`} title="Delete"><Trash2 className="w-3.5 h-3.5" /></Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pager {...paged} />
        </div>
      )}

      <Dialog open={open} onOpenChange={v => { if (!saving) setOpen(v); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">{editId ? 'Edit' : 'Add'} customer</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="cu-name">Name *</Label><Input id="cu-name" value={form.name} maxLength={100} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
            <div className="space-y-1.5"><Label htmlFor="cu-phone">Phone *</Label><Input id="cu-phone" type="tel" value={form.phone} maxLength={20} placeholder="03XX XXXXXXX" onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label htmlFor="cu-email">Email</Label><Input id="cu-email" type="email" value={form.email} maxLength={255} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label htmlFor="cu-address">Address</Label><Input id="cu-address" value={form.address} maxLength={300} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editId ? 'Save changes' : 'Add customer'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!linking} onOpenChange={v => { if (!v && !saving) setLinking(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Link online account</DialogTitle>
            <DialogDescription>
              Enter the email {linking?.name} used to sign up on the website. Their bookings, invoices and loyalty points will then appear in My Account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="link-email">Account email</Label>
            <Input id="link-email" type="email" value={linkEmail} onChange={e => setLinkEmail(e.target.value)} placeholder="customer@email.com" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinking(null)} disabled={saving}>Cancel</Button>
            <Button onClick={submitLink} disabled={saving || !linkEmail.trim()}>Link account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </AdminLayout>
  );
};

export default CustomersPage;
