import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Copy, Dices, FileSpreadsheet, Loader2, Pencil, Plus, Power, Search, TicketPercent, Trash2 } from 'lucide-react';
import { useConfirm } from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSalon } from '@/context/SalonContext';
import { useAuth } from '@/hooks/useAuth';
import { DiscountCode } from '@/types/salon';
import { firstError } from '@/lib/validation';
import { formatDate, formatPKR } from '@/lib/format';
import { downloadCsv, toCsv } from '@/lib/csv';
import {
  APPLIES_TO_LABEL, STATE_CLASS, STATE_LABEL, copyToClipboard, discountCodeSchema, discountLabel, discountState, randomCode,
} from './voucherUtils';

interface FormState {
  code: string; description: string; kind: 'percent' | 'fixed'; value: string;
  appliesTo: 'all' | 'services' | 'products'; minSpend: string; startsOn: string; endsOn: string; maxUses: string;
}

const emptyForm = (): FormState => ({
  code: '', description: '', kind: 'percent', value: '', appliesTo: 'all', minSpend: '0', startsOn: '', endsOn: '', maxUses: '',
});

const validity = (d: DiscountCode) => {
  if (d.startsOn && d.endsOn) return `${formatDate(d.startsOn)} – ${formatDate(d.endsOn)}`;
  if (d.endsOn) return `Until ${formatDate(d.endsOn)}`;
  if (d.startsOn) return `From ${formatDate(d.startsOn)}`;
  return 'No end date';
};

const DiscountCodesTab = () => {
  const salon = useSalon();
  const { canManage } = useAuth();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => { setForm(emptyForm()); setEditId(null); setOpen(true); };
  const startEdit = (d: DiscountCode) => {
    setForm({
      code: d.code, description: d.description ?? '', kind: d.kind, value: String(d.value), appliesTo: d.appliesTo,
      minSpend: String(d.minSpend), startsOn: d.startsOn ?? '', endsOn: d.endsOn ?? '', maxUses: d.maxUses ? String(d.maxUses) : '',
    });
    setEditId(d.id);
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = discountCodeSchema.safeParse(form);
    const problem = firstError(parsed);
    if (problem || !parsed.success) { toast.error(problem); return; }
    const v = parsed.data;
    const values = {
      code: v.code, description: v.description ?? '', kind: v.kind, value: v.value, appliesTo: v.appliesTo,
      minSpend: v.minSpend, startsOn: v.startsOn || '', endsOn: v.endsOn || '',
      maxUses: v.maxUses === '' || v.maxUses === undefined ? undefined : v.maxUses,
    };
    setSaving(true);
    const ok = editId
      // maxUses 0 → cleared (the context turns falsy values into NULL)
      ? await salon.updateDiscountCode(editId, { ...values, maxUses: values.maxUses ?? 0 })
      : await salon.addDiscountCode({ ...values, status: 'active' });
    setSaving(false);
    if (ok) { toast.success(editId ? 'Discount code updated' : `Discount code ${v.code} created`); setOpen(false); }
  };

  const remove = (d: DiscountCode) => confirm({
    title: `Delete ${d.code}?`,
    description: 'Invoices and sales that already used this code keep their discount. To stop new use but keep the history, disable it instead.',
    confirmLabel: 'Delete',
    destructive: true,
    onConfirm: async () => { if (await salon.deleteDiscountCode(d.id)) toast.success('Discount code deleted'); },
  });

  const copy = async (code: string) => {
    if (await copyToClipboard(code)) toast.success(`Copied ${code}`);
    else toast.error('Could not copy — select the code and copy it manually.');
  };

  const q = search.trim().toUpperCase();
  const codes = useMemo(
    () => salon.discountCodes.filter(d => !q || d.code.includes(q) || (d.description ?? '').toUpperCase().includes(q)),
    [salon.discountCodes, q],
  );

  const exportCsv = () => downloadCsv('discount-codes.csv', toCsv(
    ['Code', 'Description', 'Discount', 'Applies to', 'Min spend (PKR)', 'Starts', 'Ends', 'Uses', 'Max uses', 'State'],
    salon.discountCodes.map(d => [
      d.code, d.description ?? '', discountLabel(d), APPLIES_TO_LABEL[d.appliesTo], d.minSpend,
      d.startsOn ?? '', d.endsOn ?? '', d.uses, d.maxUses ?? '', STATE_LABEL[discountState(d)],
    ]),
  ));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search codes" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" onClick={exportCsv} disabled={salon.discountCodes.length === 0}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />CSV
          </Button>
          <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />New code</Button>
        </div>
      </div>

      {codes.length === 0 ? (
        <EmptyState
          icon={TicketPercent}
          title={salon.discountCodes.length === 0 ? 'No discount codes yet' : 'No codes match'}
          description={salon.discountCodes.length === 0 ? 'Create codes like EID20 for festive offers. Staff apply them on invoices and at the point of sale.' : undefined}
          action={salon.discountCodes.length === 0 && <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />New code</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {codes.map(d => {
            const state = discountState(d);
            const usePct = d.maxUses ? Math.min(100, Math.round((d.uses / d.maxUses) * 100)) : 0;
            return (
              <div key={d.id} className={`bg-card rounded-2xl border p-5 flex flex-col gap-3 shadow-[var(--shadow-soft)] ${state === 'disabled' || state === 'expired' ? 'opacity-75' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      onClick={() => copy(d.code)}
                      className="group inline-flex items-center gap-2 font-mono text-lg font-semibold tracking-wider hover:text-primary"
                      title="Copy code"
                    >
                      {d.code}
                      <Copy className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" aria-hidden />
                      <span className="sr-only">Copy</span>
                    </button>
                    {d.description && <p className="text-sm text-muted-foreground line-clamp-2">{d.description}</p>}
                  </div>
                  <span className={`status-badge ${STATE_CLASS[state]}`}>{STATE_LABEL[state]}</span>
                </div>

                <p className="font-heading text-2xl font-semibold text-primary">{discountLabel(d)}</p>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <dt className="text-muted-foreground">Applies to</dt><dd className="text-right">{APPLIES_TO_LABEL[d.appliesTo]}</dd>
                  <dt className="text-muted-foreground">Min spend</dt><dd className="text-right tabular-nums">{d.minSpend > 0 ? formatPKR(d.minSpend) : 'None'}</dd>
                  <dt className="text-muted-foreground">Valid</dt><dd className="text-right">{validity(d)}</dd>
                </dl>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Used</span>
                    <span className="tabular-nums">{d.uses}{d.maxUses ? ` / ${d.maxUses}` : ' times'}</span>
                  </div>
                  {d.maxUses ? (
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={usePct} aria-valuemin={0} aria-valuemax={100} aria-label="Uses">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${usePct}%` }} />
                    </div>
                  ) : null}
                </div>

                <div className="mt-auto pt-3 border-t border-border/60 flex justify-end gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(d)} aria-label={`Edit ${d.code}`} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => salon.toggleDiscountCodeStatus(d.id)} aria-label={d.status === 'active' ? 'Disable' : 'Enable'} title={d.status === 'active' ? 'Disable' : 'Enable'}><Power className="w-3.5 h-3.5" /></Button>
                  {canManage && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(d)} aria-label={`Delete ${d.code}`} title="Delete"><Trash2 className="w-3.5 h-3.5" /></Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={v => { if (!saving) setOpen(v); }}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editId ? 'Edit discount code' : 'New discount code'}</DialogTitle>
            <DialogDescription>Staff type this code on an invoice or at the point of sale.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dc-code">Code</Label>
              <div className="flex gap-2">
                <Input
                  id="dc-code" value={form.code} maxLength={30} autoFocus placeholder="EID20"
                  className="font-mono uppercase tracking-wider"
                  onChange={e => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                />
                <Button type="button" variant="outline" onClick={() => set('code', randomCode())} title="Suggest a random code">
                  <Dices className="w-4 h-4" /><span className="sr-only">Suggest a code</span>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.kind} onValueChange={v => set('kind', v as FormState['kind'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage off</SelectItem>
                    <SelectItem value="fixed">Fixed amount off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dc-value">{form.kind === 'percent' ? 'Percent (%)' : 'Amount (Rs.)'}</Label>
                <Input id="dc-value" type="number" min={1} max={form.kind === 'percent' ? 100 : undefined} inputMode="numeric"
                  value={form.value} onChange={e => set('value', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Can be used on</Label>
                <Select value={form.appliesTo} onValueChange={v => set('appliesTo', v as FormState['appliesTo'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Services & products</SelectItem>
                    <SelectItem value="services">Services only</SelectItem>
                    <SelectItem value="products">Products only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dc-min">Minimum spend (Rs.)</Label>
                <Input id="dc-min" type="number" min={0} inputMode="numeric" value={form.minSpend} onChange={e => set('minSpend', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dc-start">Starts (optional)</Label>
                <Input id="dc-start" type="date" value={form.startsOn} max={form.endsOn || undefined} onChange={e => set('startsOn', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dc-end">Ends (optional)</Label>
                <Input id="dc-end" type="date" value={form.endsOn} min={form.startsOn || undefined} onChange={e => set('endsOn', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dc-max">Maximum uses (optional)</Label>
              <Input id="dc-max" type="number" min={1} inputMode="numeric" placeholder="Unlimited" value={form.maxUses} onChange={e => set('maxUses', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dc-desc">Description (optional)</Label>
              <Textarea id="dc-desc" rows={2} maxLength={200} value={form.description} placeholder="Eid offer on all services" onChange={e => set('description', e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editId ? 'Save changes' : 'Create code'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
};

export default DiscountCodesTab;
