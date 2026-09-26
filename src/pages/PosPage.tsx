import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle, Check, ChevronsUpDown, Copy, Download, Gift, Loader2, Minus, Package, Plus, Printer,
  Search, ShoppingBag, Trash2, UserPlus, Users, X,
} from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import EmptyState from '@/components/EmptyState';
import GiftVoucherDialog, { VoucherLineInput } from '@/components/pos/GiftVoucherDialog';
import { receiptExtras } from '@/components/pos/receipt';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useSalon } from '@/context/SalonContext';
import { CartLine, PAYMENT_METHODS, Product, Sale } from '@/types/salon';
import { downloadSalePdf, printSalePdf } from '@/lib/salePdf';
import { formatDate, formatPKR } from '@/lib/format';
import { cn } from '@/lib/utils';

type Line =
  | { key: string; kind: 'product'; productId: string; quantity: number }
  | ({ key: string; kind: 'voucher' } & VoucherLineInput);

const PAYMENT_KEY = 'bys.pos.paymentMethod';
const readLastMethod = () => {
  try { return localStorage.getItem(PAYMENT_KEY) || PAYMENT_METHODS[0]; } catch { return PAYMENT_METHODS[0]; }
};
const saveLastMethod = (m: string) => { try { localStorage.setItem(PAYMENT_KEY, m); } catch { /* private mode */ } };

let keySeq = 0;
const nextKey = () => `l${++keySeq}`;

const PosPage = () => {
  const salon = useSalon();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [lines, setLines] = useState<Line[]>([]);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [customerMode, setCustomerMode] = useState<'existing' | 'walkin'>('walkin');
  const [customerId, setCustomerId] = useState('');
  const [walkInName, setWalkInName] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [staffId, setStaffId] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>(readLastMethod);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Sale | null>(null);
  const cartRef = useRef<HTMLDivElement>(null);

  const activeProducts = salon.products.filter(p => p.status === 'active');
  const categories = useMemo(() => Array.from(new Set(activeProducts.map(p => p.category))).sort(), [activeProducts]);
  const q = search.trim().toLowerCase();
  const visible = activeProducts.filter(p =>
    (category === 'all' || p.category === category)
    && (!q || p.name.toLowerCase().includes(q) || (p.brand ?? '').toLowerCase().includes(q) || (p.sku ?? '').toLowerCase() === q));

  const inCart = (productId: string) =>
    lines.reduce((n, l) => n + (l.kind === 'product' && l.productId === productId ? l.quantity : 0), 0);

  const addProduct = (p: Product) => {
    setError(null);
    if (inCart(p.id) >= p.stock) { toast.error(`Only ${p.stock} of ${p.name} in stock.`); return; }
    setLines(prev => {
      const existing = prev.find(l => l.kind === 'product' && l.productId === p.id);
      if (existing) return prev.map(l => (l === existing && l.kind === 'product' ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { key: nextKey(), kind: 'product', productId: p.id, quantity: 1 }];
    });
  };

  const setQty = (key: string, qty: number) => setLines(prev => prev.flatMap(l => {
    if (l.key !== key || l.kind !== 'product') return [l];
    if (qty <= 0) return [];
    const stock = salon.getProductById(l.productId)?.stock ?? 0;
    return [{ ...l, quantity: Math.min(qty, stock) }];
  }));

  const removeLine = (key: string) => setLines(prev => prev.filter(l => l.key !== key));

  const productSubtotal = lines.reduce((s, l) => s + (l.kind === 'product' ? (salon.getProductById(l.productId)?.price ?? 0) * l.quantity : 0), 0);
  const voucherSubtotal = lines.reduce((s, l) => s + (l.kind === 'voucher' ? l.value : 0), 0);
  const total = productSubtotal + voucherSubtotal;
  const itemCount = lines.reduce((n, l) => n + (l.kind === 'product' ? l.quantity : 1), 0);
  const selectedCustomer = salon.getCustomerById(customerId);

  const reset = () => {
    setLines([]); setCustomerMode('walkin'); setCustomerId(''); setWalkInName(''); setStaffId('');
    setDiscountCode(''); setVoucherCode(''); setNotes(''); setError(null); setSearch('');
  };

  const complete = async () => {
    setError(null);
    if (lines.length === 0) return setError('Add at least one item.');
    if (customerMode === 'existing' && !customerId) return setError('Choose a customer, or switch to walk-in.');
    if (discountCode.trim() && productSubtotal === 0) return setError('Discount codes apply to products, not to gift vouchers.');
    if (voucherCode.trim() && productSubtotal === 0) return setError('A gift voucher can pay for products, not for other gift vouchers.');
    setSaving(true);
    const items: CartLine[] = lines.map(l => l.kind === 'product'
      ? { kind: 'product', productId: l.productId, quantity: l.quantity }
      : { kind: 'voucher', value: l.value, recipientName: l.recipientName, recipientPhone: l.recipientPhone, expiresOn: l.expiresOn });
    const result = await salon.createSale({
      items,
      customerId: customerMode === 'existing' ? customerId : undefined,
      customerName: customerMode === 'walkin' ? walkInName : undefined,
      staffId: staffId || undefined,
      discountCode: discountCode || undefined,
      giftVoucherCode: voucherCode || undefined,
      paymentMethod,
      notes,
    });
    setSaving(false);
    if (typeof result === 'string') { setError(result); return; }
    saveLastMethod(paymentMethod);
    setCompleted(result);
    reset();
  };

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const exactSku = activeProducts.find(p => p.sku && p.sku.toLowerCase() === q);
    const target = exactSku ?? (visible.length === 1 ? visible[0] : undefined);
    if (target && target.stock > 0) { addProduct(target); setSearch(''); }
  };

  // New voucher codes: from the reloaded vouchers list, falling back to the line names.
  const completedVouchers = completed
    ? completed.items.filter(i => i.kind === 'voucher').map(i => {
      const v = i.giftVoucherId ? salon.getGiftVoucherById(i.giftVoucherId) : undefined;
      return { code: v?.code ?? i.name.replace(/^Gift voucher\s*/, ''), value: i.lineTotal, expiresOn: v?.expiresOn, recipient: v?.recipientName };
    })
    : [];
  const extras = completed ? receiptExtras(completed, salon) : undefined;

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${text} copied`); } catch { toast.error('Could not copy — select the code and copy it manually.'); }
  };

  const cartPanel = (
    <div ref={cartRef} id="pos-cart" className="bg-card rounded-2xl border shadow-[var(--shadow-soft)] flex flex-col lg:sticky lg:top-24 lg:max-h-[calc(100vh-7.5rem)]">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <h3 className="font-heading text-lg font-semibold">Current sale</h3>
        {lines.length > 0 && (
          <button type="button" onClick={() => { setLines([]); setError(null); }} className="text-xs text-muted-foreground hover:text-destructive">Clear</button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 min-h-[6rem]">
        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Tap a product or sell a gift voucher to start.</p>
        ) : lines.map(l => {
          if (l.kind === 'voucher') {
            return (
              <div key={l.key} className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 p-3">
                <Gift className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Gift voucher</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[l.recipientName && `For ${l.recipientName}`, l.expiresOn && `valid until ${formatDate(l.expiresOn)}`].filter(Boolean).join(' · ') || 'Code issued at checkout'}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{formatPKR(l.value)}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeLine(l.key)} aria-label="Remove gift voucher"><X className="w-4 h-4" /></Button>
              </div>
            );
          }
          const p = salon.getProductById(l.productId);
          if (!p) return null;
          return (
            <div key={l.key} className="flex items-center gap-2 rounded-xl border p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{formatPKR(p.price)} each</p>
              </div>
              <div className="flex items-center rounded-lg border">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-r-none" onClick={() => setQty(l.key, l.quantity - 1)} aria-label={`One less ${p.name}`}><Minus className="w-3.5 h-3.5" /></Button>
                <span className="w-8 text-center text-sm font-semibold tabular-nums" aria-live="polite">{l.quantity}</span>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-l-none" onClick={() => setQty(l.key, l.quantity + 1)} disabled={l.quantity >= p.stock} aria-label={`One more ${p.name}`}><Plus className="w-3.5 h-3.5" /></Button>
              </div>
              <span className="w-20 text-right text-sm font-semibold tabular-nums">{formatPKR(p.price * l.quantity)}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => removeLine(l.key)} aria-label={`Remove ${p.name}`}><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          );
        })}
      </div>

      <div className="border-t px-5 py-4 space-y-3 overflow-y-auto">
        {/* Customer */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Customer</Label>
            <button
              type="button"
              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
              onClick={() => setCustomerMode(m => (m === 'walkin' ? 'existing' : 'walkin'))}
            >
              {customerMode === 'walkin' ? <><Users className="w-3.5 h-3.5" />Choose customer</> : <><UserPlus className="w-3.5 h-3.5" />Walk-in</>}
            </button>
          </div>
          {customerMode === 'walkin' ? (
            <Input placeholder="Walk-in name (optional)" value={walkInName} maxLength={100} onChange={e => setWalkInName(e.target.value)} />
          ) : (
            <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={customerOpen} className="w-full justify-between font-normal">
                  {selectedCustomer ? `${selectedCustomer.name} · ${selectedCustomer.phone}` : <span className="text-muted-foreground">Search by name or phone…</span>}
                  <ChevronsUpDown className="w-4 h-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                <Command filter={(value, s) => (value.toLowerCase().includes(s.toLowerCase()) ? 1 : 0)}>
                  <CommandInput placeholder="Name or phone…" />
                  <CommandList>
                    <CommandEmpty>No customer found.</CommandEmpty>
                    <CommandGroup>
                      {salon.customers.filter(c => c.status === 'active').map(c => (
                        <CommandItem key={c.id} value={`${c.name} ${c.phone} ${c.id}`} onSelect={() => { setCustomerId(c.id); setCustomerOpen(false); }}>
                          <Check className={cn('w-4 h-4 mr-2', customerId === c.id ? 'opacity-100' : 'opacity-0')} />
                          <span className="flex-1">{c.name}</span>
                          <span className="text-xs text-muted-foreground">{c.phone}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Sold by</Label>
            <Select value={staffId || 'none'} onValueChange={v => setStaffId(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {salon.staff.filter(s => s.status === 'active').map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Payment</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="pos-discount">Discount code</Label>
            <Input id="pos-discount" value={discountCode} onChange={e => setDiscountCode(e.target.value.toUpperCase())} placeholder="e.g. EID20" className="uppercase" maxLength={30} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pos-voucher">Pay with voucher</Label>
            <Input id="pos-voucher" value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())} placeholder="GV-XXXXX-XXXXX" className="uppercase font-mono text-xs" maxLength={20} />
          </div>
        </div>
        {(discountCode || voucherCode) && (
          <p className="text-[11px] text-muted-foreground">Codes are checked when you complete the sale and apply to products only, not to gift vouchers.</p>
        )}

        <Textarea rows={2} maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" />

        {/* Totals */}
        <div className="rounded-xl bg-muted/50 p-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Products</span><span className="tabular-nums">{formatPKR(productSubtotal)}</span></div>
          {voucherSubtotal > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Gift vouchers</span><span className="tabular-nums">{formatPKR(voucherSubtotal)}</span></div>}
          {(discountCode || voucherCode) && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Discount / voucher</span><span className="text-muted-foreground">applied at checkout</span></div>}
          <div className="flex justify-between items-baseline pt-1 border-t border-border/60">
            <span className="font-medium">Total</span>
            <span className="font-heading text-2xl font-semibold tabular-nums">{formatPKR(total)}</span>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive font-medium flex gap-2" role="alert">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}
          </p>
        )}

        <Button className="w-full h-12 text-base" onClick={complete} disabled={saving || lines.length === 0}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
          Complete sale
        </Button>
      </div>
    </div>
  );

  return (
    <AdminLayout
      title="Point of sale"
      actions={<Button variant="outline" asChild><Link to="/admin/sales">Sales history</Link></Button>}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] pb-20 lg:pb-0">
        {/* Catalogue */}
        <section aria-label="Products" className="min-w-0">
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search or scan SKU — Enter adds a single match"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={onSearchKey}
                className="pl-9 h-11"
                autoFocus
              />
            </div>
            <Button variant="outline" className="h-11" onClick={() => setVoucherOpen(true)}>
              <Gift className="w-4 h-4 mr-2 text-primary" />Sell gift voucher
            </Button>
          </div>
          {categories.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 -mx-1 px-1">
              {['all', ...categories].map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors',
                    category === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground hover:text-foreground')}
                >
                  {c === 'all' ? 'All' : c}
                </button>
              ))}
            </div>
          )}

          {activeProducts.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products to sell yet"
              description="Add retail products to sell them here. You can still sell gift vouchers."
              action={<Button asChild><Link to="/admin/products"><Plus className="w-4 h-4 mr-2" />Add products</Link></Button>}
            />
          ) : visible.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">No products match “{search}”.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {visible.map(p => {
                const left = p.stock - inCart(p.id);
                const out = left <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProduct(p)}
                    disabled={out}
                    className={cn(
                      'text-left rounded-2xl border bg-card p-4 min-h-[112px] flex flex-col transition-all',
                      'hover:border-primary/40 hover:shadow-[var(--shadow-soft)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      out && 'opacity-50 cursor-not-allowed hover:border-border hover:shadow-none active:scale-100',
                    )}
                  >
                    <span className="text-sm font-medium leading-snug line-clamp-2">{p.name}</span>
                    {p.brand && <span className="text-[11px] text-muted-foreground truncate">{p.brand}</span>}
                    <span className="mt-auto pt-2 flex items-end justify-between gap-2">
                      <span className="font-heading text-lg font-semibold text-primary tabular-nums">{formatPKR(p.price)}</span>
                      <span className={cn('text-[11px] tabular-nums', out ? 'text-destructive' : left <= p.lowStockAt ? 'text-warning' : 'text-muted-foreground')}>
                        {out ? 'Out' : `${left} left`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Cart */}
        <aside aria-label="Current sale">{cartPanel}</aside>
      </div>

      {/* Mobile summary bar */}
      {lines.length > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t bg-card/95 backdrop-blur px-4 py-3 flex items-center gap-3">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <div className="flex-1 text-sm">
            <span className="font-semibold">{itemCount} item{itemCount === 1 ? '' : 's'}</span>
            <span className="text-muted-foreground"> · {formatPKR(total)}</span>
          </div>
          <Button size="sm" onClick={() => cartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Checkout</Button>
        </div>
      )}

      <GiftVoucherDialog
        open={voucherOpen}
        onOpenChange={setVoucherOpen}
        onAdd={v => { setError(null); setLines(prev => [...prev, { key: nextKey(), kind: 'voucher', ...v }]); }}
      />

      {/* Sale complete */}
      <Dialog open={!!completed} onOpenChange={o => { if (!o) setCompleted(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-success/15 text-success flex items-center justify-center"><Check className="w-4 h-4" /></span>
              Sale complete
            </DialogTitle>
            <DialogDescription className="font-mono">{completed?.saleNumber}</DialogDescription>
          </DialogHeader>
          {completed && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/50 p-4 text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{formatPKR(completed.subtotal)}</span></div>
                {completed.discountAmount > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Discount {completed.discountCode && `(${completed.discountCode})`}</span><span className="tabular-nums text-success">− {formatPKR(completed.discountAmount)}</span></div>
                )}
                <div className="flex justify-between font-medium"><span>Total</span><span className="tabular-nums">{formatPKR(completed.total)}</span></div>
                {completed.voucherAmount > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Paid by gift voucher</span><span className="tabular-nums">− {formatPKR(completed.voucherAmount)}</span></div>
                )}
                <div className="flex justify-between items-baseline pt-1.5 border-t border-border/60">
                  <span className="font-medium">Collected{completed.paymentMethod ? ` · ${completed.paymentMethod}` : ''}</span>
                  <span className="font-heading text-2xl font-semibold tabular-nums">{formatPKR(Math.max(0, completed.total - completed.voucherAmount))}</span>
                </div>
              </div>

              {completedVouchers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">New gift voucher{completedVouchers.length > 1 ? 's' : ''} — give the code to the customer</p>
                  {completedVouchers.map(v => (
                    <div key={v.code} className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-3 flex items-center gap-3">
                      <Gift className="w-5 h-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-lg font-bold tracking-wider">{v.code}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPKR(v.value)}{v.recipient && ` · for ${v.recipient}`}{v.expiresOn && ` · valid until ${formatDate(v.expiresOn)}`}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => copy(v.code)} aria-label={`Copy ${v.code}`}><Copy className="w-4 h-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            {completed && extras && (
              <>
                <Button variant="outline" onClick={() => printSalePdf(completed, extras)}><Printer className="w-4 h-4 mr-2" />Print</Button>
                <Button variant="outline" onClick={() => downloadSalePdf(completed, extras)}><Download className="w-4 h-4 mr-2" />Receipt</Button>
              </>
            )}
            <Button onClick={() => setCompleted(null)}><Plus className="w-4 h-4 mr-2" />New sale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default PosPage;
