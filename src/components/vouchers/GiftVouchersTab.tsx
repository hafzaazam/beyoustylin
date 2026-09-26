import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Copy, FileSpreadsheet, Gift, Loader2, Pencil, ScanSearch, Search, ShoppingBag } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import Pager, { usePaged } from '@/components/Pager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSalon } from '@/context/SalonContext';
import { EntityStatus, GiftVoucher } from '@/types/salon';
import { formatDate, formatPKR, toLocalDateKey } from '@/lib/format';
import { downloadCsv, toCsv } from '@/lib/csv';
import { STATE_CLASS, STATE_LABEL, VoucherState, copyToClipboard, voucherState } from './voucherUtils';

type Filter = 'all' | VoucherState;
const FILTERS: Filter[] = ['all', 'active', 'partly_used', 'used_up', 'expired', 'disabled'];

const normalizeCode = (s: string) => s.trim().toUpperCase().replace(/\s+/g, '');

const BalanceBar = ({ v }: { v: GiftVoucher }) => {
  const pct = v.initialValue > 0 ? Math.round((v.balance / v.initialValue) * 100) : 0;
  return (
    <div className="min-w-[7rem]">
      <div className="flex justify-between text-xs tabular-nums">
        <span className="font-semibold">{formatPKR(v.balance)}</span>
        <span className="text-muted-foreground">of {formatPKR(v.initialValue)}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Balance left">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const GiftVouchersTab = () => {
  const salon = useSalon();
  const navigate = useNavigate();
  const [lookup, setLookup] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<GiftVoucher | null>(null);
  const [form, setForm] = useState({ recipientName: '', recipientPhone: '', expiresOn: '', notes: '', status: 'active' as EntityStatus });
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const monthStart = toLocalDateKey(new Date(now.getFullYear(), now.getMonth(), 1));

  const summary = useMemo(() => {
    let outstanding = 0, soldThisMonth = 0, redeemed = 0;
    for (const v of salon.giftVouchers) {
      const st = voucherState(v);
      if (st === 'active' || st === 'partly_used') outstanding += v.balance;
      if (toLocalDateKey(new Date(v.createdAt)) >= monthStart) soldThisMonth += v.initialValue;
      // Disabled vouchers from voided sales have balance 0 but were never spent.
      if (!(v.status === 'disabled' && v.balance === 0)) redeemed += v.initialValue - v.balance;
    }
    return { outstanding, soldThisMonth, redeemed };
  }, [salon.giftVouchers, monthStart]);

  const lookupKey = normalizeCode(lookup);
  const found = lookupKey.length >= 4
    ? salon.giftVouchers.find(v => v.code === lookupKey || v.code.replace(/-/g, '') === lookupKey.replace(/-/g, ''))
    : undefined;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return salon.giftVouchers.filter(v => {
      if (filter !== 'all' && voucherState(v) !== filter) return false;
      if (!q) return true;
      return v.code.toLowerCase().includes(q) || (v.recipientName ?? '').toLowerCase().includes(q) || (v.recipientPhone ?? '').includes(q);
    });
  }, [salon.giftVouchers, search, filter]);
  const paged = usePaged(filtered, 25, `${search}|${filter}`);

  const buyer = (v: GiftVoucher) => (v.purchaserCustomerId ? salon.getCustomerById(v.purchaserCustomerId)?.name : undefined);
  const saleNumber = (v: GiftVoucher) => (v.saleId ? salon.sales.find(s => s.id === v.saleId)?.saleNumber : undefined);

  const copy = async (code: string) => {
    if (await copyToClipboard(code)) toast.success(`Copied ${code}`);
    else toast.error('Could not copy — select the code and copy it manually.');
  };

  const startEdit = (v: GiftVoucher) => {
    setForm({ recipientName: v.recipientName ?? '', recipientPhone: v.recipientPhone ?? '', expiresOn: v.expiresOn ?? '', notes: v.notes ?? '', status: v.status });
    setEditing(v);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (form.recipientPhone.trim() && !/^[+\d][\d\s-]{6,19}$/.test(form.recipientPhone.trim())) {
      toast.error('Enter a valid phone number'); return;
    }
    setSaving(true);
    const ok = await salon.updateGiftVoucher(editing.id, {
      recipientName: form.recipientName.trim(), recipientPhone: form.recipientPhone.trim(),
      expiresOn: form.expiresOn, notes: form.notes.trim(), status: form.status,
    });
    setSaving(false);
    if (ok) { toast.success('Voucher updated'); setEditing(null); }
  };

  const exportCsv = () => downloadCsv('gift-vouchers.csv', toCsv(
    ['Code', 'Recipient', 'Phone', 'Bought by', 'Value (PKR)', 'Balance (PKR)', 'Expires', 'State', 'Sold on', 'Sale'],
    salon.giftVouchers.map(v => [
      v.code, v.recipientName ?? '', v.recipientPhone ?? '', buyer(v) ?? '', v.initialValue, v.balance,
      v.expiresOn ?? '', STATE_LABEL[voucherState(v)], formatDate(v.createdAt), saleNumber(v) ?? '',
    ]),
  ));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Outstanding balance</p>
          <p className="text-2xl font-heading font-bold tabular-nums">{formatPKR(summary.outstanding)}</p>
          <p className="text-xs text-muted-foreground">Still to be redeemed on usable vouchers</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Sold this month</p>
          <p className="text-2xl font-heading font-bold text-success tabular-nums">{formatPKR(summary.soldThisMonth)}</p>
          <p className="text-xs text-muted-foreground">{now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Redeemed</p>
          <p className="text-2xl font-heading font-bold tabular-nums">{formatPKR(summary.redeemed)}</p>
          <p className="text-xs text-muted-foreground">Spent on services and products</p>
        </div>
      </div>

      {/* Lookup */}
      <div className="rounded-2xl border bg-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="gv-lookup" className="flex items-center gap-2"><ScanSearch className="w-4 h-4 text-primary" />Check a voucher code</Label>
            <Input
              id="gv-lookup" value={lookup} onChange={e => setLookup(e.target.value)} placeholder="GV-XXXXX-XXXXX"
              className="font-mono uppercase tracking-wider" autoComplete="off"
            />
          </div>
          <Button onClick={() => navigate('/admin/pos?sell=voucher')} className="sm:w-auto">
            <ShoppingBag className="w-4 h-4 mr-2" />Sell a gift voucher
          </Button>
        </div>
        {lookupKey.length >= 4 && (
          <div className="mt-4" aria-live="polite">
            {found ? (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-muted/50 p-3 text-sm">
                <span className="font-mono font-semibold">{found.code}</span>
                <span className={`status-badge ${STATE_CLASS[voucherState(found)]}`}>{STATE_LABEL[voucherState(found)]}</span>
                <span>Balance <strong className="tabular-nums">{formatPKR(found.balance)}</strong> of {formatPKR(found.initialValue)}</span>
                <span className="text-muted-foreground">{found.expiresOn ? `Expires ${formatDate(found.expiresOn)}` : 'No expiry'}</span>
                {found.recipientName && <span className="text-muted-foreground">For {found.recipientName}</span>}
              </div>
            ) : (
              <p className="text-sm text-destructive">No gift voucher with that code.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Code, recipient or phone" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filter} onValueChange={v => setFilter(v as Filter)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FILTERS.map(f => <SelectItem key={f} value={f}>{f === 'all' ? 'All vouchers' : STATE_LABEL[f]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" className="ml-auto" onClick={exportCsv} disabled={salon.giftVouchers.length === 0}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />CSV
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Gift}
          title={salon.giftVouchers.length === 0 ? 'No gift vouchers sold yet' : 'No vouchers match'}
          description={salon.giftVouchers.length === 0 ? 'Gift vouchers are sold at the point of sale so the payment is recorded. Each one gets a unique code.' : undefined}
          action={salon.giftVouchers.length === 0 && (
            <Button onClick={() => navigate('/admin/pos?sell=voucher')}><ShoppingBag className="w-4 h-4 mr-2" />Sell a gift voucher</Button>
          )}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Code</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Recipient</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Balance</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Expires</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">State</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Sold</th>
                  <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {paged.pageItems.map(v => {
                  const st = voucherState(v);
                  const sale = saleNumber(v);
                  return (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30 align-top">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button onClick={() => copy(v.code)} className="group inline-flex items-center gap-1.5 font-mono text-xs font-semibold hover:text-primary" title="Copy code">
                          {v.code}<Copy className="w-3 h-3 opacity-40 group-hover:opacity-100" aria-hidden />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{v.recipientName || '—'}</div>
                        <div className="text-xs text-muted-foreground">{v.recipientPhone || (buyer(v) ? `Bought by ${buyer(v)}` : '')}</div>
                      </td>
                      <td className="px-4 py-3"><BalanceBar v={v} /></td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">{v.expiresOn ? formatDate(v.expiresOn) : 'No expiry'}</td>
                      <td className="px-4 py-3"><span className={`status-badge ${STATE_CLASS[st]}`}>{STATE_LABEL[st]}</span></td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        <div>{formatDate(v.createdAt)}</div>
                        {sale && <Link to={`/admin/sales?q=${encodeURIComponent(sale)}`} className="font-mono text-primary hover:underline">{sale}</Link>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(v)} aria-label={`Edit ${v.code}`} title="Edit details">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
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

      <Dialog open={!!editing} onOpenChange={o => { if (!o && !saving) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Voucher {editing?.code}</DialogTitle>
            <DialogDescription>
              Balance {editing && formatPKR(editing.balance)} of {editing && formatPKR(editing.initialValue)}. The balance only changes when the voucher is used or its sale is voided.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="gv-name">Recipient</Label>
                <Input id="gv-name" value={form.recipientName} maxLength={100} onChange={e => setForm(p => ({ ...p, recipientName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gv-phone">Recipient phone</Label>
                <Input id="gv-phone" type="tel" value={form.recipientPhone} maxLength={20} onChange={e => setForm(p => ({ ...p, recipientPhone: e.target.value }))} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="gv-exp">Expires</Label>
                <Input id="gv-exp" type="date" value={form.expiresOn} onChange={e => setForm(p => ({ ...p, expiresOn: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as EntityStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="disabled">Disabled (can't be used)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gv-notes">Notes</Label>
              <Textarea id="gv-notes" rows={2} maxLength={500} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GiftVouchersTab;
