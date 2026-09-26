import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Download, Eye, FileText } from 'lucide-react';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { supabase } from '@/integrations/supabase/client';
import type { Database, Tables } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { friendlyError } from '@/lib/errors';
import { formatDate, formatPKR } from '@/lib/format';
import { downloadInvoicePdf, InvoicePdfData, invoicePdfUrl } from '@/lib/invoicePdf';
import { Invoice } from '@/types/salon';

type BookingRow = Database['public']['Functions']['my_bookings']['Returns'][number];

const mapInvoice = (r: Tables<'invoices'>): Invoice => ({
  id: r.id, invoiceNumber: r.invoice_number, bookingId: r.booking_id,
  customerId: r.customer_id, staffId: r.staff_id,
  items: (Array.isArray(r.items) ? r.items : []) as unknown as Invoice['items'],
  totalAmount: Number(r.total_amount), createdAt: r.created_at, status: r.status,
  paidAt: r.paid_at ?? undefined, paymentMethod: r.payment_method ?? undefined,
});

const AccountInvoices = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [customer, setCustomer] = useState<{ name: string; phone: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ invoice: Invoice; url: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: cust, error: custErr } = await supabase
        .from('customers').select('id, name, phone').eq('user_id', user.id).maybeSingle();
      if (custErr) toast.error(friendlyError(custErr));
      if (!cust) { setLoading(false); return; }
      setCustomer({ name: cust.name, phone: cust.phone });
      const [inv, bk] = await Promise.all([
        supabase.from('invoices').select('*').eq('customer_id', cust.id).order('created_at', { ascending: false }),
        supabase.rpc('my_bookings'),
      ]);
      if (inv.error) toast.error(friendlyError(inv.error));
      setInvoices((inv.data || []).map(mapInvoice));
      setBookings(bk.data || []);
      setLoading(false);
    })();
  }, [user]);

  // Revoke the blob URL when the preview closes or changes.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  const bookingById = useMemo(() => new Map(bookings.map(b => [b.id, b])), [bookings]);

  const pdfData = (invoice: Invoice): InvoicePdfData => {
    const b = bookingById.get(invoice.bookingId);
    return {
      invoice,
      customerName: customer?.name,
      customerPhone: customer?.phone,
      staffName: b?.staff_name ?? undefined,
      appointmentTime: b?.start_time,
    };
  };

  const paidTotal = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.totalAmount, 0);

  return (
    <CustomerLayout title="Invoices & Receipts" subtitle="Billing history">
      {loading ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading invoices">
          {[0, 1, 2].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : invoices.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-card/50">
          <FileText className="w-10 h-10 text-primary mx-auto mb-3" />
          <p className="font-heading text-xl font-semibold mb-1">No invoices yet</p>
          <p className="text-sm text-muted-foreground">Invoices appear here once the salon books your appointment.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            Total paid: <span className="font-semibold text-foreground">{formatPKR(paidTotal)}</span>
          </p>
          <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Invoice</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Amount</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="border-t border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3">{formatDate(inv.createdAt)}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    <td className={`px-4 py-3 text-right font-heading font-bold tabular-nums ${inv.status === 'void' ? 'text-muted-foreground line-through' : 'text-primary'}`}>
                      {formatPKR(inv.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => setPreview({ invoice: inv, url: invoicePdfUrl(pdfData(inv)) })}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </button>
                        <button
                          onClick={() => downloadInvoicePdf(pdfData(inv))}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-muted hover:bg-muted/70"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={!!preview} onOpenChange={o => { if (!o) setPreview(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{preview?.invoice.invoiceNumber}</DialogTitle>
          </DialogHeader>
          {preview && <iframe src={preview.url} className="w-full h-[70vh] rounded-lg border" title="Invoice preview" />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
            {preview && (
              <Button onClick={() => downloadInvoicePdf(pdfData(preview.invoice))}>
                <Download className="w-4 h-4 mr-2" /> Download PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
};

export default AccountInvoices;
