import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Ban, Download, FileSpreadsheet, Gift, Loader2, Printer, Search, ShoppingBag } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import EmptyState from '@/components/EmptyState';
import Pager, { usePaged } from '@/components/Pager';
import { receiptExtras } from '@/components/pos/receipt';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSalon } from '@/context/SalonContext';
import { useAuth } from '@/hooks/useAuth';
import { Sale } from '@/types/salon';
import { downloadSalePdf, printSalePdf } from '@/lib/salePdf';
import { formatDate, formatDateTime, formatPKR, formatTime, toLocalDateKey } from '@/lib/format';
import { downloadCsv, toCsv } from '@/lib/csv';

const itemsSummary = (s: Sale) => {
  const first = s.items.slice(0, 2).map(i => (i.quantity > 1 ? `${i.quantity}× ${i.name}` : i.name)).join(', ');
  return s.items.length > 2 ? `${first} +${s.items.length - 2} more` : first;
};

const SalesPage = () => {
  const salon = useSalon();
  const { canManage } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'paid' | 'void'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [busy, setBusy] = useState(false);

  const selected = selectedId ? salon.sales.find(s => s.id === selectedId) ?? null : null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTs = from ? new Date(`${from}T00:00`).getTime() : -Infinity;
    const toTs = to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity;
    return salon.sales.filter(s => {
      if (status !== 'all' && s.status !== status) return false;
      const ts = new Date(s.createdAt).getTime();
      if (ts < fromTs || ts > toTs) return false;
      if (!q) return true;
      return s.saleNumber.toLowerCase().includes(q)
        || (s.customerName ?? '').toLowerCase().includes(q)
        || s.items.some(i => i.name.toLowerCase().includes(q));
    });
  }, [salon.sales, search, status, from, to]);

  const summary = useMemo(() => {
    const paid = filtered.filter(s => s.status === 'paid');
    return {
      count: paid.length,
      products: paid.reduce((sum, s) => sum + s.items.filter(i => i.kind === 'product').reduce((a, i) => a + i.lineTotal, 0), 0),
      vouchers: paid.reduce((sum, s) => sum + s.items.filter(i => i.kind === 'voucher').reduce((a, i) => a + i.lineTotal, 0), 0),
      discounts: paid.reduce((sum, s) => sum + s.discountAmount, 0),
      collected: paid.reduce((sum, s) => sum + Math.max(0, s.total - s.voucherAmount), 0),
    };
  }, [filtered]);

  const paged = usePaged(filtered, 25, `${search}|${status}|${from}|${to}`);

  const setPreset = (preset: 'today' | 'month' | 'all') => {
    const now = new Date();
    if (preset === 'all') { setFrom(''); setTo(''); return; }
    setFrom(toLocalDateKey(preset === 'today' ? now : new Date(now.getFullYear(), now.getMonth(), 1)));
    setTo(toLocalDateKey(now));
  };

  const exportCsv = () => {
    const csv = toCsv(
      ['Sale', 'Date', 'Customer', 'Sold by', 'Items', 'Subtotal', 'Discount code', 'Discount', 'Total', 'Gift voucher paid', 'Collected', 'Payment method', 'Status'],
      filtered.map(s => [
        s.saleNumber, formatDateTime(s.createdAt), s.customerName ?? '', s.staffId ? salon.getStaffById(s.staffId)?.name ?? '' : '',
        s.items.map(i => `${i.quantity}x ${i.name}`).join('; '), s.subtotal, s.discountCode ?? '', s.discountAmount,
        s.total, s.voucherAmount, Math.max(0, s.total - s.voucherAmount), s.paymentMethod ?? '', s.status,
      ]),
    );
    downloadCsv(`sales-${from || 'all'}-${to || toLocalDateKey(new Date())}.csv`, csv);
  };

  const confirmVoid = async () => {
    if (!selected) return;
    setBusy(true);
    const ok = await salon.voidSale(selected.id, voidReason);
    setBusy(false);
    if (ok) { toast.success(`${selected.saleNumber} voided — stock returned`); setVoiding(false); }
  };

  const extras = selected ? receiptExtras(selected, salon) : undefined;

  return (
    <AdminLayout
      title="Sales history"
      actions={
        <>
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}><FileSpreadsheet className="w-4 h-4 mr-2" />Export CSV</Button>
          <Button asChild><Link to="/admin/pos"><ShoppingBag className="w-4 h-4 mr-2" />New sale</Link></Button>
        </>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Sales</p>
          <p className="text-2xl font-heading font-bold tabular-nums">{summary.count}</p>
          <p className="text-xs text-muted-foreground">{formatPKR(summary.collected)} collected</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Products sold</p>
          <p className="text-2xl font-heading font-bold tabular-nums">{formatPKR(summary.products)}</p>
          <p className="text-xs text-muted-foreground">before discounts</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Gift vouchers sold</p>
          <p className="text-2xl font-heading font-bold tabular-nums">{formatPKR(summary.vouchers)}</p>
          <p className="text-xs text-muted-foreground">counted when sold</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Discounts given</p>
          <p className="text-2xl font-heading font-bold tabular-nums">{formatPKR(summary.discounts)}</p>
          <p className="text-xs text-muted-foreground">on product sales</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Sale #, customer or item" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={v => setStatus(v as 'all' | 'paid' | 'void')}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="sl-from" className="text-xs text-muted-foreground">From</Label>
            <Input id="sl-from" type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} className="h-10 w-40" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sl-to" className="text-xs text-muted-foreground">To</Label>
            <Input id="sl-to" type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} className="h-10 w-40" />
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setPreset('today')}>Today</Button>
          <Button variant="ghost" size="sm" onClick={() => setPreset('month')}>This month</Button>
          <Button variant="ghost" size="sm" onClick={() => setPreset('all')}>All time</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={salon.sales.length === 0 ? 'No sales yet' : 'No sales match'}
          description={salon.sales.length === 0 ? 'Product and gift voucher sales from the point of sale appear here.' : 'Try another date range or clear the filters.'}
          action={salon.sales.length === 0 && <Button asChild><Link to="/admin/pos">Open point of sale</Link></Button>}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Sale</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Items</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Paid by</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {paged.pageItems.map(s => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(s.id); } }}
                    tabIndex={0}
                    className={`border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:bg-muted/40 ${s.status === 'void' ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-mono text-xs font-medium">{s.saleNumber}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(s.createdAt)} · {formatTime(s.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3">{s.customerName || <span className="text-muted-foreground">Walk-in</span>}</td>
                    <td className="px-4 py-3 max-w-[18rem]">
                      <div className="truncate flex items-center gap-1.5" title={itemsSummary(s)}>
                        {s.items.some(i => i.kind === 'voucher') && <Gift className="w-3.5 h-3.5 text-primary shrink-0" aria-label="Includes a gift voucher" />}
                        <span className="truncate">{itemsSummary(s)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap">{formatPKR(s.total)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {s.paymentMethod ?? '—'}
                      {s.voucherAmount > 0 && s.paymentMethod !== 'Gift voucher' && <span className="text-xs"> + voucher</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager {...paged} />
        </div>
      )}

      {/* Sale detail */}
      <Dialog open={!!selected && !voiding} onOpenChange={o => { if (!o) setSelectedId(null); }}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading flex items-center gap-3">
                  <span className="font-mono text-lg">{selected.saleNumber}</span>
                  <StatusBadge status={selected.status} />
                </DialogTitle>
                <DialogDescription>
                  {formatDateTime(selected.createdAt)} · {selected.customerName || 'Walk-in'}
                  {selected.staffId && ` · sold by ${salon.getStaffById(selected.staffId)?.name ?? '—'}`}
                </DialogDescription>
              </DialogHeader>

              <ul className="divide-y rounded-xl border">
                {selected.items.map(i => {
                  const v = i.giftVoucherId ? salon.getGiftVoucherById(i.giftVoucherId) : undefined;
                  return (
                    <li key={i.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium">{i.name}</p>
                        <p className="text-xs text-muted-foreground tabular-nums">
                          {i.quantity} × {formatPKR(i.unitPrice)}
                          {v && ` · balance ${formatPKR(v.balance)}${v.expiresOn ? ` · valid until ${formatDate(v.expiresOn)}` : ''}`}
                        </p>
                      </div>
                      <span className="font-semibold tabular-nums whitespace-nowrap">{formatPKR(i.lineTotal)}</span>
                    </li>
                  );
                })}
              </ul>

              <div className="rounded-xl bg-muted/50 p-4 text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{formatPKR(selected.subtotal)}</span></div>
                {selected.discountAmount > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Discount {selected.discountCode && `(${selected.discountCode})`}</span><span className="tabular-nums">− {formatPKR(selected.discountAmount)}</span></div>
                )}
                <div className="flex justify-between font-medium"><span>Total</span><span className="tabular-nums">{formatPKR(selected.total)}</span></div>
                {selected.voucherAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gift voucher {extras?.paidWithVoucherCode}</span>
                    <span className="tabular-nums">− {formatPKR(selected.voucherAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1.5 border-t border-border/60 font-medium">
                  <span>Collected{selected.paymentMethod ? ` · ${selected.paymentMethod}` : ''}</span>
                  <span className="tabular-nums">{formatPKR(Math.max(0, selected.total - selected.voucherAmount))}</span>
                </div>
              </div>

              {selected.notes && <p className="text-sm bg-muted/40 rounded-lg p-3 whitespace-pre-wrap">{selected.notes}</p>}
              {selected.status === 'void' && (
                <p className="text-sm text-destructive">
                  Voided {selected.voidedAt && formatDateTime(selected.voidedAt)}{selected.voidReason && ` — ${selected.voidReason}`}
                </p>
              )}

              <DialogFooter className="gap-2 sm:gap-2">
                {canManage && selected.status === 'paid' && (
                  <Button variant="outline" className="text-destructive sm:mr-auto" onClick={() => { setVoidReason(''); setVoiding(true); }}>
                    <Ban className="w-4 h-4 mr-2" />Void sale
                  </Button>
                )}
                {extras && (
                  <>
                    <Button variant="outline" onClick={() => printSalePdf(selected, extras)}><Printer className="w-4 h-4 mr-2" />Print</Button>
                    <Button onClick={() => downloadSalePdf(selected, extras)}><Download className="w-4 h-4 mr-2" />Receipt</Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Void */}
      <Dialog open={voiding} onOpenChange={o => { if (!o && !busy) setVoiding(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Void {selected?.saleNumber}?</DialogTitle>
            <DialogDescription>
              Products go back into stock, gift vouchers sold in this sale are cancelled, and any voucher used to pay is refunded.
              This can't be undone. A sale whose gift voucher has already been used can't be voided.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="void-reason">Reason (optional)</Label>
            <Textarea id="void-reason" rows={2} maxLength={300} value={voidReason} onChange={e => setVoidReason(e.target.value)} placeholder="e.g. returned unopened" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoiding(false)} disabled={busy}>Keep sale</Button>
            <Button variant="destructive" onClick={confirmVoid} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Void sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default SalesPage;
