import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';
import { AlertTriangle, Loader2, Package, PackagePlus, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useConfirm } from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSalon } from '@/context/SalonContext';
import { useAuth } from '@/hooks/useAuth';
import { Product, PRODUCT_CATEGORIES } from '@/types/salon';
import { firstError } from '@/lib/validation';
import { formatPKR } from '@/lib/format';

const optionalNumber = (label: string) => z.preprocess(
  v => (v === '' || v === undefined || v === null ? undefined : v),
  z.coerce.number({ invalid_type_error: `${label} must be a number` }).min(0, `${label} cannot be negative`).optional(),
);

const productSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  brand: z.string().trim().max(60).optional(),
  category: z.string().min(1, 'Choose a category'),
  sku: z.string().trim().max(40).optional(),
  description: z.string().trim().max(500).optional(),
  price: z.coerce.number({ invalid_type_error: 'Price must be a number' }).min(0, 'Price cannot be negative'),
  cost: optionalNumber('Cost'),
  stock: z.coerce.number().int('Stock must be a whole number').min(0, 'Stock cannot be negative'),
  lowStockAt: z.coerce.number().int('Low-stock level must be a whole number').min(0),
});

const emptyForm = { name: '', brand: '', category: '', sku: '', description: '', price: '', cost: '', stock: '0', lowStockAt: '3' };

const stockTone = (p: Product) =>
  p.stock === 0 ? 'bg-destructive/10 text-destructive ring-destructive/20'
    : p.stock <= p.lowStockAt ? 'bg-warning/10 text-warning ring-warning/20'
      : 'bg-muted text-foreground ring-border';

const ProductsPage = () => {
  const salon = useSalon();
  const { canManage } = useAuth();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [lowOnly, setLowOnly] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [restocking, setRestocking] = useState<Product | null>(null);
  const [delta, setDelta] = useState('');

  const openNew = () => { setForm(emptyForm); setEditId(null); setOpen(true); };
  const startEdit = (p: Product) => {
    setForm({
      name: p.name, brand: p.brand ?? '', category: p.category, sku: p.sku ?? '', description: p.description ?? '',
      price: String(p.price), cost: p.cost !== undefined ? String(p.cost) : '', stock: String(p.stock), lowStockAt: String(p.lowStockAt),
    });
    setEditId(p.id); setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = productSchema.safeParse(form);
    const problem = firstError(parsed);
    if (problem || !parsed.success) { toast.error(problem); return; }
    const d = parsed.data;
    const values = {
      name: d.name, brand: d.brand ?? '', category: d.category, sku: d.sku ?? '', description: d.description ?? '',
      price: d.price, cost: d.cost, lowStockAt: d.lowStockAt,
    };
    setSaving(true);
    // On edit, an emptied cost field must clear the stored cost: the data layer
    // treats `undefined` as "leave unchanged" and `null` as "clear".
    const clearedCost = (d.cost ?? null) as number | undefined;
    const ok = editId
      ? await salon.updateProduct(editId, { ...values, cost: clearedCost })
      : await salon.addProduct({ ...values, stock: d.stock, status: 'active' });
    setSaving(false);
    if (ok) { toast.success(editId ? 'Product updated' : 'Product added'); setOpen(false); }
  };

  const submitRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restocking) return;
    const n = Number(delta);
    if (!Number.isInteger(n) || n === 0) { toast.error('Enter a whole number, e.g. 12 to add or -2 to remove.'); return; }
    setSaving(true);
    const ok = await salon.adjustStock(restocking.id, n);
    setSaving(false);
    if (ok) { toast.success(`${restocking.name}: stock ${n > 0 ? 'added' : 'removed'}`); setRestocking(null); }
  };

  const remove = (p: Product) => confirm({
    title: `Delete ${p.name}?`,
    description: 'Products that have been sold cannot be deleted — disable them instead to hide them from the point of sale.',
    confirmLabel: 'Delete',
    destructive: true,
    onConfirm: async () => { if (await salon.deleteProduct(p.id)) toast.success('Product deleted'); },
  });

  const categories = useMemo(() => Array.from(new Set(salon.products.map(p => p.category))).sort(), [salon.products]);
  const q = search.trim().toLowerCase();
  const filtered = salon.products.filter(p =>
    (category === 'all' || p.category === category)
    && (!lowOnly || p.stock <= p.lowStockAt)
    && (!q || p.name.toLowerCase().includes(q) || (p.brand ?? '').toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q)));

  const lowCount = salon.products.filter(p => p.status === 'active' && p.stock <= p.lowStockAt).length;
  const stockValue = salon.products.reduce((s, p) => s + (p.cost !== undefined ? p.cost * p.stock : 0), 0);
  const missingCost = salon.products.some(p => p.cost === undefined && p.stock > 0);

  return (
    <AdminLayout title="Products" actions={<Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add product</Button>}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Products</p>
          <p className="text-2xl font-heading font-bold tabular-nums">{salon.products.length}</p>
          <p className="text-xs text-muted-foreground">{salon.products.filter(p => p.status === 'active').length} active</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Stock value (at cost)</p>
          <p className="text-2xl font-heading font-bold tabular-nums">{formatPKR(stockValue)}</p>
          <p className="text-xs text-muted-foreground">{missingCost ? 'Some products have no cost price' : 'All products costed'}</p>
        </div>
        <button type="button" onClick={() => setLowOnly(v => !v)} className="stat-card text-left" aria-pressed={lowOnly}>
          <p className="text-sm text-muted-foreground">Low stock</p>
          <p className={`text-2xl font-heading font-bold tabular-nums ${lowCount ? 'text-warning' : ''}`}>{lowCount}</p>
          <p className="text-xs text-muted-foreground">{lowOnly ? 'Showing low stock only — tap to show all' : 'Tap to show only these'}</p>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search name, brand or SKU" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant={lowOnly ? 'default' : 'outline'} size="sm" onClick={() => setLowOnly(v => !v)}>
          <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />Low stock
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={salon.products.length === 0 ? 'No products yet' : 'No products match'}
          description={salon.products.length === 0 ? 'Add the retail items you sell — shampoos, serums, lipsticks — to sell them at the point of sale and track stock.' : 'Try another search or clear the filters.'}
          action={salon.products.length === 0 && <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Add product</Button>}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Product</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Category</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Price</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Cost · margin</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Stock</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const margin = p.cost !== undefined && p.price > 0 ? Math.round(((p.price - p.cost) / p.price) * 100) : undefined;
                  return (
                    <tr key={p.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${p.status === 'disabled' ? 'opacity-70' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{[p.brand, p.sku && `SKU ${p.sku}`].filter(Boolean).join(' · ') || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{p.category}</td>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap font-medium">{formatPKR(p.price)}</td>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                        {p.cost !== undefined ? (
                          <>
                            <div>{formatPKR(p.cost)}</div>
                            {margin !== undefined && <div className={`text-xs ${margin < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{margin}% margin</div>}
                          </>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`status-badge tabular-nums ${stockTone(p)}`}>
                          {p.stock === 0 ? 'Out of stock' : `${p.stock} in stock`}
                        </span>
                        {p.stock > 0 && p.stock <= p.lowStockAt && <div className="text-[11px] text-warning mt-1">Low (≤ {p.lowStockAt})</div>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setDelta(''); setRestocking(p); }} aria-label={`Restock ${p.name}`} title="Restock"><PackagePlus className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(p)} aria-label={`Edit ${p.name}`} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => salon.toggleProductStatus(p.id)} aria-label={p.status === 'active' ? 'Disable' : 'Enable'} title={p.status === 'active' ? 'Disable' : 'Enable'}><Power className="w-3.5 h-3.5" /></Button>
                          {canManage && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(p)} aria-label={`Delete ${p.name}`} title="Delete"><Trash2 className="w-3.5 h-3.5" /></Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / edit */}
      <Dialog open={open} onOpenChange={v => { if (!saving) setOpen(v); }}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">{editId ? 'Edit' : 'Add'} product</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="pr-name">Name</Label><Input id="pr-name" value={form.name} maxLength={100} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus /></div>
              <div className="space-y-1.5"><Label htmlFor="pr-brand">Brand</Label><Input id="pr-brand" value={form.brand} maxLength={60} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label htmlFor="pr-sku">SKU / barcode</Label><Input id="pr-sku" value={form.sku} maxLength={40} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label htmlFor="pr-price">Selling price (Rs.)</Label><Input id="pr-price" type="number" min={0} inputMode="numeric" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label htmlFor="pr-cost">Cost price (Rs.)</Label><Input id="pr-cost" type="number" min={0} inputMode="numeric" placeholder="Optional" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} /></div>
              {!editId && (
                <div className="space-y-1.5"><Label htmlFor="pr-stock">Opening stock</Label><Input id="pr-stock" type="number" min={0} step={1} inputMode="numeric" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} /></div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="pr-low">Warn when stock is at or below</Label>
                <Input id="pr-low" type="number" min={0} step={1} inputMode="numeric" value={form.lowStockAt} onChange={e => setForm(p => ({ ...p, lowStockAt: e.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="pr-desc">Description</Label><Textarea id="pr-desc" rows={2} maxLength={500} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            </div>
            {editId && <p className="text-xs text-muted-foreground">To change stock, use Restock so sales made at the same time aren't overwritten.</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editId ? 'Save changes' : 'Add product'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Restock */}
      <Dialog open={!!restocking} onOpenChange={v => { if (!v && !saving) setRestocking(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Adjust stock</DialogTitle>
            <DialogDescription>{restocking?.name} · currently {restocking?.stock} in stock</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitRestock} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="restock-delta">Quantity to add</Label>
              <Input id="restock-delta" type="number" step={1} inputMode="numeric" autoFocus value={delta} onChange={e => setDelta(e.target.value)} placeholder="e.g. 12, or -2 for damaged items" />
              {delta !== '' && Number.isInteger(Number(delta)) && restocking && (
                <p className="text-xs text-muted-foreground">New stock: {restocking.stock + Number(delta)}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRestocking(null)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Update stock</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </AdminLayout>
  );
};

export default ProductsPage;
