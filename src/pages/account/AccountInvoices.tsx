import { useEffect, useState } from 'react';
import { FileText, Download, Eye } from 'lucide-react';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

const AccountInvoices = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<any | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: cust } = await supabase.from('customers').select('id').eq('user_id', user.id).maybeSingle();
      if (!cust) { setLoading(false); return; }
      const { data } = await supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', cust.id)
        .order('created_at', { ascending: false });
      setRows(data || []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <CustomerLayout title="Invoices & Receipts" subtitle="Billing history">
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-card/50">
          <FileText className="w-10 h-10 text-primary mx-auto mb-3" />
          <p className="font-heading text-xl font-semibold mb-1">No invoices yet</p>
          <p className="text-sm text-muted-foreground">Once a visit is completed, receipts will appear here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">Invoice</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-right px-4 py-3">Amount</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(inv => (
                <tr key={inv.id} className="border-t border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number}</td>
                  <td className="px-4 py-3">{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right font-heading font-bold text-primary">Rs. {Number(inv.total_amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      {inv.pdf_data_url && (
                        <>
                          <button
                            onClick={() => setPreview(inv)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                          >
                            <Eye className="w-3.5 h-3.5" /> Preview
                          </button>
                          <a
                            href={inv.pdf_data_url}
                            download={`${inv.invoice_number}.pdf`}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full bg-muted hover:bg-muted/70"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </a>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{preview?.invoice_number}</DialogTitle>
          </DialogHeader>
          {preview?.pdf_data_url && (
            <iframe src={preview.pdf_data_url} className="w-full h-[70vh] rounded-lg border" title="Invoice preview" />
          )}
        </DialogContent>
      </Dialog>
    </CustomerLayout>
  );
};

export default AccountInvoices;
