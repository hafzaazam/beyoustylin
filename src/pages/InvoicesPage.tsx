import AdminLayout from '@/components/layout/AdminLayout';
import { useSalon } from '@/context/SalonContext';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Printer, Search, Download, Eye } from 'lucide-react';
import { useState, useRef } from 'react';

const InvoicesPage = () => {
  const salon = useSalon();
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const previewInvoice = previewId ? salon.invoices.find(i => i.id === previewId) : null;


  const filtered = salon.invoices.filter(inv => {
    if (!search) return true;
    return inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || inv.id.includes(search);
  }).reverse();

  const handlePrint = (invoiceId: string) => {
    setSelectedInvoice(invoiceId);
    setTimeout(() => {
      const content = document.getElementById(`invoice-print-${invoiceId}`);
      if (content) {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(`
            <html><head><title>Invoice</title>
            <style>
              body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5a1aa; padding-bottom: 20px; }
              .header h1 { font-family: 'Playfair Display', serif; color: #c1566b; margin: 0; }
              .header p { color: #888; font-size: 14px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
              th { background: #faf5f5; font-weight: 600; }
              .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
              .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 14px; }
              .meta span { color: #888; }
            </style>
            </head><body>
            ${content.innerHTML}
            <script>window.print();window.close();<\/script>
            </body></html>
          `);
          win.document.close();
        }
      }
    }, 100);
  };

  return (
    <AdminLayout title="Invoices">
      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Invoice #</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Staff</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Items</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No invoices yet.</td></tr>
              ) : filtered.map(inv => {
                const customer = salon.getCustomerById(inv.customerId);
                const staffMember = salon.getStaffById(inv.staffId);
                return (
                  <tr key={inv.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3">{customer?.name || 'Unknown'}</td>
                    <td className="px-4 py-3">{staffMember?.name || 'Unknown'}</td>
                    <td className="px-4 py-3">{inv.items.map(i => i.name).join(', ')}</td>
                    <td className="px-4 py-3 font-semibold">Rs. {inv.totalAmount}</td>
                    <td className="px-4 py-3 text-xs">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handlePrint(inv.id)}>
                          <Printer className="w-3.5 h-3.5 mr-1" />Print
                        </Button>
                        {inv.pdfDataUrl && (
                          <a href={inv.pdfDataUrl} download={`${inv.invoiceNumber}.pdf`}>
                            <Button variant="ghost" size="sm">
                              <Download className="w-3.5 h-3.5 mr-1" />PDF
                            </Button>
                          </a>
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

      {/* Hidden printable invoices */}
      <div className="hidden">
        {salon.invoices.map(inv => {
          const customer = salon.getCustomerById(inv.customerId);
          const staffMember = salon.getStaffById(inv.staffId);
          return (
            <div key={inv.id} id={`invoice-print-${inv.id}`}>
              <div className="header">
                <h1>BeYou Stylin</h1>
                <p>Invoice #{inv.invoiceNumber}</p>
              </div>
              <div className="meta">
                <div><span>Customer: </span>{customer?.name || 'Walk-in'}</div>
                <div><span>Staff: </span>{staffMember?.name || '-'}</div>
                <div><span>Date: </span>{new Date(inv.createdAt).toLocaleDateString()}</div>
                <div><span>Booking ID: </span>{inv.bookingId.slice(0, 8)}</div>
              </div>
              <table>
                <thead><tr><th>Item</th><th>Type</th><th>Price</th></tr></thead>
                <tbody>
                  {inv.items.map((item, idx) => (
                    <tr key={idx}><td>{item.name}</td><td>{item.type}</td><td>Rs. {item.price}</td></tr>
                  ))}
                </tbody>
              </table>
              <div className="total">Total: Rs. {inv.totalAmount}</div>
            </div>
          );
        })}
      </div>
    </AdminLayout>
  );
};

export default InvoicesPage;
