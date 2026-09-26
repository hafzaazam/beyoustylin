import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Banknote, Download, Eye, FileSpreadsheet, MoreHorizontal, Printer, ReceiptText, Search, TicketPercent, Undo2 } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useConfirm } from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import Pager, { usePaged } from '@/components/Pager';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSalon } from '@/context/SalonContext';
import { Invoice, InvoiceStatus, PAYMENT_METHODS, amountDue } from '@/types/salon';
import InvoiceCreditsDialog from '@/components/vouchers/InvoiceCreditsDialog';
import { InvoicePdfData, downloadInvoicePdf, invoicePdfUrl, printInvoicePdf } from '@/lib/invoicePdf';
import { formatDate, formatPKR, toLocalDateKey } from '@/lib/format';
import { downloadCsv, toCsv } from '@/lib/csv';

const InvoicesPage = () => {
  const salon = useSalon();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? params.get('charge') ?? '');
  const [status, setStatus] = useState<'all' | InvoiceStatus>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [preview, setPreview] = useState<{ invoice: Invoice; url: string } | null>(null);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [busy, setBusy] = useState(false);
  const [creditsFor, setCreditsFor] = useState<string | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  // "Charge" from the schedule lands here as ?charge=<invoice number>: open the payment step.
  const chargeNumber = params.get('charge');
  useEffect(() => {
    if (!chargeNumber) return;
    const inv = salon.invoices.find(i => i.invoiceNumber === chargeNumber);
    if (!inv) return; // wait for invoices to load
    if (inv.status === 'unpaid') { setMethod(PAYMENT_METHODS[0]); setPaying(inv); }
    else toast.info(`${inv.invoiceNumber} is ${inv.status}.`);
    const next = new URLSearchParams(params);
    next.delete('charge');
    next.set('q', chargeNumber);
    setParams(next, { replace: true });
  }, [chargeNumber, salon.invoices, params, setParams]);

  const pdfData = (inv: Invoice): InvoicePdfData => {
    const customer = salon.getCustomerById(inv.customerId);
    return {
      invoice: inv,
      customerName: customer?.name,
      customerPhone: customer?.phone,
      staffName: salon.getStaffById(inv.staffId)?.name,
      appointmentTime: salon.getBookingById(inv.bookingId)?.startTime,
    };
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTs = from ? new Date(`${from}T00:00`).getTime() : -Infinity;
    const toTs = to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity;
    return salon.invoices.filter(inv => {
      if (status !== 'all' && inv.status !== status) return false;
      const ts = new Date(inv.createdAt).getTime();
      if (ts < fromTs || ts > toTs) return false;
      if (!q) return true;
      const customer = salon.getCustomerById(inv.customerId);
      return inv.invoiceNumber.toLowerCase().includes(q)
        || customer?.name.toLowerCase().includes(q)
        || customer?.phone.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salon.invoices, salon.customers, search, status, from, to]);

  // Cash actually collected excludes the part paid with a gift voucher: that money
  // was already counted when the voucher was sold.
  const summary = useMemo(() => {
    const paid = filtered.filter(i => i.status === 'paid');
    const unpaid = filtered.filter(i => i.status === 'unpaid');
    return {
      collected: paid.reduce((s, i) => s + amountDue(i), 0),
      byVoucher: paid.reduce((s, i) => s + i.voucherAmount, 0),
      outstanding: unpaid.reduce((s, i) => s + amountDue(i), 0),
      unpaidCount: unpaid.length,
      voided: filtered.filter(i => i.status === 'void').length,
    };
  }, [filtered]);

  const paged = usePaged(filtered, 25, `${search}|${status}|${from}|${to}`);

  const setRangePreset = (preset: 'today' | 'month' | 'all') => {
    const now = new Date();
    if (preset === 'all') { setFrom(''); setTo(''); return; }
    const start = preset === 'today' ? now : new Date(now.getFullYear(), now.getMonth(), 1);
    setFrom(toLocalDateKey(start));
    setTo(toLocalDateKey(now));
  };

  const openPreview = (inv: Invoice) => setPreview({ invoice: inv, url: invoicePdfUrl(pdfData(inv)) });

  const confirmPaid = async () => {
    if (!paying) return;
    setBusy(true);
    const ok = await salon.markInvoicePaid(paying.id, method);
    setBusy(false);
    if (ok) { toast.success(`${paying.invoiceNumber} marked paid (${method})`); setPaying(null); }
  };

  const markUnpaid = (inv: Invoice) => confirm({
    title: `Mark ${inv.invoiceNumber} as unpaid?`,
    description: 'Use this to correct a payment recorded by mistake. The payment date and method are cleared.',
    confirmLabel: 'Mark unpaid',
    onConfirm: async () => { if (await salon.markInvoiceUnpaid(inv.id)) toast.success('Invoice marked unpaid'); },
  });

  const canApplyCredits = (inv: Invoice) => inv.status === 'unpaid' || (inv.status === 'paid' && inv.paymentMethod === 'Gift voucher');

  const moneyLines = (inv: Invoice) => (
    <>
      {inv.discountAmount > 0 && (
        <div className="text-xs text-success">−{formatPKR(inv.discountAmount)} {inv.discountCode}</div>
      )}
      {inv.voucherAmount > 0 && (
        <div className="text-xs text-muted-foreground">Voucher {formatPKR(inv.voucherAmount)}</div>
      )}
      {inv.status === 'unpaid' && inv.voucherAmount > 0 && (
        <div className="text-xs font-semibold text-foreground">Due {formatPKR(amountDue(inv))}</div>
      )}
    </>
  );

  const markPaidButton = (inv: Invoice, className = 'h-8') => (
    <Button size="sm" variant="outline" className={className} onClick={() => { setMethod(PAYMENT_METHODS[0]); setPaying(inv); }}>
      <Banknote className="w-3.5 h-3.5 mr-1.5" />Mark paid
    </Button>
  );

  const invoiceMenu = (inv: Invoice, className = 'h-8 w-8') => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className={className} aria-label={`More actions for ${inv.invoiceNumber}`}>
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {canApplyCredits(inv) && (
          <DropdownMenuItem onSelect={() => setCreditsFor(inv.id)}>
            <TicketPercent className="w-4 h-4 mr-2" />Discount code or gift voucher
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => openPreview(inv)}><Eye className="w-4 h-4 mr-2" />Preview PDF</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => downloadInvoicePdf(pdfData(inv))}><Download className="w-4 h-4 mr-2" />Download PDF</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => printInvoicePdf(pdfData(inv))}><Printer className="w-4 h-4 mr-2" />Print</DropdownMenuItem>
        {inv.status === 'paid' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => markUnpaid(inv)}><Undo2 className="w-4 h-4 mr-2" />Mark unpaid</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const exportCsv = () => {
    const rows = filtered.map(inv => {
      const customer = salon.getCustomerById(inv.customerId);
      return [
        inv.invoiceNumber, formatDate(inv.createdAt), customer?.name ?? '', customer?.phone ?? '',
        salon.getStaffById(inv.staffId)?.name ?? '', inv.items.map(i => i.name).join('; '),
        inv.subtotal, inv.discountCode ?? '', inv.discountAmount, inv.totalAmount, inv.voucherAmount, amountDue(inv),
        inv.status, inv.paidAt ? formatDate(inv.paidAt) : '', inv.paymentMethod ?? '',
      ];
    });
    const csv = toCsv(
      ['Invoice', 'Date', 'Customer', 'Phone', 'Staff', 'Items', 'Subtotal (PKR)', 'Discount code', 'Discount (PKR)',
        'Total (PKR)', 'Gift voucher (PKR)', 'Amount due/paid (PKR)', 'Status', 'Paid on', 'Payment method'],
      rows,
    );
    downloadCsv(`invoices-${from || 'all'}-${to || toLocalDateKey(new Date())}.csv`, csv);
  };

  return (
    <AdminLayout
      title="Invoices"
      actions={<Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}><FileSpreadsheet className="w-4 h-4 mr-2" />Export CSV</Button>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Collected</p>
          <p className="text-2xl font-heading font-bold text-success tabular-nums">{formatPKR(summary.collected)}</p>
          <p className="text-xs text-muted-foreground">
            Paid invoices in view{summary.byVoucher > 0 && ` · plus ${formatPKR(summary.byVoucher)} paid by gift voucher`}
          </p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Outstanding</p>
          <p className="text-2xl font-heading font-bold text-warning tabular-nums">{formatPKR(summary.outstanding)}</p>
          <p className="text-xs text-muted-foreground">{summary.unpaidCount} unpaid invoice{summary.unpaidCount === 1 ? '' : 's'}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Voided</p>
          <p className="text-2xl font-heading font-bold tabular-nums">{summary.voided}</p>
          <p className="text-xs text-muted-foreground">From canceled bookings</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="relative basis-full sm:basis-auto flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input data-shortcut="search" aria-label="Search invoices" placeholder="Invoice #, customer or phone" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onValueChange={v => setStatus(v as 'all' | InvoiceStatus)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="void">Void</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="inv-from" className="text-xs text-muted-foreground">From</Label>
            <Input id="inv-from" type="date" value={from} max={to || undefined} onChange={e => setFrom(e.target.value)} className="h-10 w-40" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="inv-to" className="text-xs text-muted-foreground">To</Label>
            <Input id="inv-to" type="date" value={to} min={from || undefined} onChange={e => setTo(e.target.value)} className="h-10 w-40" />
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setRangePreset('today')}>Today</Button>
          <Button variant="ghost" size="sm" onClick={() => setRangePreset('month')}>This month</Button>
          <Button variant="ghost" size="sm" onClick={() => setRangePreset('all')}>All time</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={salon.invoices.length === 0 ? 'No invoices yet' : 'No invoices match'}
          description={salon.invoices.length === 0 ? 'An invoice is created automatically for every booking and walk-in.' : 'Try another date range or clear the filters.'}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <ul className="md:hidden divide-y divide-border" aria-label="Invoices">
            {paged.pageItems.map(inv => {
              const customer = salon.getCustomerById(inv.customerId);
              return (
                <li key={inv.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{customer?.name ?? 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-mono">{inv.invoiceNumber}</span> · {formatDate(inv.createdAt)}
                      </p>
                    </div>
                    <div className="text-right tabular-nums shrink-0">
                      <p className="font-semibold">{formatPKR(inv.totalAmount)}</p>
                      {moneyLines(inv)}
                    </div>
                  </div>
                  <p className="text-sm truncate">{inv.items.map(i => i.name).join(', ')}</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 text-sm">
                      <StatusBadge status={inv.status} />
                      {inv.status === 'paid' && (
                        <span className="ml-2 text-muted-foreground">{inv.paymentMethod}</span>
                      )}
                    </div>
                    {inv.status === 'unpaid' && markPaidButton(inv, 'h-11')}
                    {invoiceMenu(inv, 'h-11 w-11')}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Invoice</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Items</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {paged.pageItems.map(inv => {
                  const customer = salon.getCustomerById(inv.customerId);
                  return (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors align-top">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-mono text-xs font-medium">{inv.invoiceNumber}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(inv.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{customer?.name ?? 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{salon.getStaffById(inv.staffId)?.name ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3 max-w-[18rem]">
                        <div className="truncate" title={inv.items.map(i => i.name).join(', ')}>{inv.items.map(i => i.name).join(', ')}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                        <div className="font-semibold">{formatPKR(inv.totalAmount)}</div>
                        {moneyLines(inv)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={inv.status} />
                        {inv.status === 'paid' && (
                          <div className="text-xs text-muted-foreground mt-1">{inv.paymentMethod}{inv.paidAt && ` · ${formatDate(inv.paidAt)}`}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {inv.status === 'unpaid' && markPaidButton(inv)}
                          {invoiceMenu(inv)}
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

      {/* Record payment */}
      <Dialog open={!!paying} onOpenChange={o => { if (!o && !busy) setPaying(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Record payment</DialogTitle>
            <DialogDescription>{paying?.invoiceNumber}</DialogDescription>
          </DialogHeader>
          {paying && (
            <div className="rounded-xl bg-muted/50 p-3 text-sm">
              {paying.voucherAmount > 0 && (
                <p className="text-muted-foreground">
                  Total {formatPKR(paying.totalAmount)} · gift voucher covers {formatPKR(paying.voucherAmount)}
                </p>
              )}
              <p className="flex items-baseline justify-between">
                <span className="font-medium">Collect now</span>
                <span className="font-heading text-2xl font-semibold tabular-nums">{formatPKR(amountDue(paying))}</span>
              </p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Payment method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaying(null)} disabled={busy}>Cancel</Button>
            <Button onClick={confirmPaid} disabled={busy}>{paying ? `Record ${formatPKR(amountDue(paying))} · ${method}` : 'Mark paid'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF preview */}
      <Dialog open={!!preview} onOpenChange={o => { if (!o) setPreview(null); }}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Invoice {preview?.invoice.invoiceNumber}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 rounded-lg border bg-muted overflow-hidden">
            {preview && <iframe src={preview.url} title="Invoice PDF preview" className="w-full h-full" />}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
            {preview && (
              <Button onClick={() => downloadInvoicePdf(pdfData(preview.invoice))}>
                <Download className="w-4 h-4 mr-2" />Download PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <InvoiceCreditsDialog invoiceId={creditsFor} onClose={() => setCreditsFor(null)} />
      {confirmDialog}
    </AdminLayout>
  );
};

export default InvoicesPage;
