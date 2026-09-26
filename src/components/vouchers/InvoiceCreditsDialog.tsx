import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Gift, Loader2, TicketPercent, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSalon } from '@/context/SalonContext';
import { amountDue } from '@/types/salon';
import { formatPKR } from '@/lib/format';

interface Props {
  invoiceId: string | null;
  onClose: () => void;
}

/** Apply or remove a discount code and a gift voucher on an unpaid invoice. */
const InvoiceCreditsDialog = ({ invoiceId, onClose }: Props) => {
  const salon = useSalon();
  // Read the live invoice so totals update after each change.
  const invoice = invoiceId ? salon.invoices.find(i => i.id === invoiceId) : undefined;
  const voucher = invoice?.giftVoucherId ? salon.getGiftVoucherById(invoice.giftVoucherId) : undefined;
  const [discountCode, setDiscountCode] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'discount' | 'voucher' | 'remove-discount' | 'remove-voucher'>(null);

  useEffect(() => {
    if (!invoiceId) return;
    setDiscountCode(''); setVoucherCode(''); setDiscountError(null); setVoucherError(null);
  }, [invoiceId]);

  if (!invoice) return null;
  const editable = invoice.status === 'unpaid' || (invoice.status === 'paid' && invoice.paymentMethod === 'Gift voucher');
  const hasDiscount = !!invoice.discountCode || invoice.discountAmount > 0;

  const applyDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountCode.trim()) return;
    setBusy('discount'); setDiscountError(null);
    const err = await salon.applyInvoiceDiscount(invoice.id, discountCode);
    setBusy(null);
    if (err) setDiscountError(err);
    else { toast.success(`Discount ${discountCode.trim().toUpperCase()} applied`); setDiscountCode(''); }
  };

  const applyVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;
    setBusy('voucher'); setVoucherError(null);
    const err = await salon.applyInvoiceGiftVoucher(invoice.id, voucherCode);
    setBusy(null);
    if (err) setVoucherError(err);
    else { toast.success('Gift voucher applied'); setVoucherCode(''); }
  };

  const removeDiscount = async () => {
    setBusy('remove-discount');
    if (await salon.removeInvoiceDiscount(invoice.id)) toast.success('Discount removed');
    setBusy(null);
  };
  const removeVoucher = async () => {
    setBusy('remove-voucher');
    if (await salon.removeInvoiceGiftVoucher(invoice.id)) toast.success('Gift voucher removed and balance returned');
    setBusy(null);
  };

  const due = amountDue(invoice);

  return (
    <Dialog open={!!invoiceId} onOpenChange={o => { if (!o && !busy) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Discount & gift voucher</DialogTitle>
          <DialogDescription>{invoice.invoiceNumber}</DialogDescription>
        </DialogHeader>

        {/* Running total */}
        <dl className="rounded-xl bg-muted/50 p-3 text-sm grid grid-cols-2 gap-y-1">
          <dt className="text-muted-foreground">Subtotal</dt><dd className="text-right tabular-nums">{formatPKR(invoice.subtotal)}</dd>
          {invoice.discountAmount > 0 && (<>
            <dt className="text-muted-foreground">Discount {invoice.discountCode}</dt>
            <dd className="text-right tabular-nums text-success">−{formatPKR(invoice.discountAmount)}</dd>
          </>)}
          <dt className="text-muted-foreground">Total</dt><dd className="text-right tabular-nums font-medium">{formatPKR(invoice.totalAmount)}</dd>
          {invoice.voucherAmount > 0 && (<>
            <dt className="text-muted-foreground">Gift voucher</dt>
            <dd className="text-right tabular-nums">−{formatPKR(invoice.voucherAmount)}</dd>
          </>)}
          <dt className="font-semibold pt-1 border-t">Amount due</dt>
          <dd className="text-right tabular-nums font-heading text-lg font-semibold pt-1 border-t">{formatPKR(due)}</dd>
        </dl>

        {!editable && (
          <p className="text-sm text-muted-foreground">Codes can only be changed on unpaid invoices. Mark it unpaid first to make changes.</p>
        )}

        {/* Discount code */}
        <section className="space-y-2">
          <Label className="flex items-center gap-2"><TicketPercent className="w-4 h-4 text-primary" />Discount code</Label>
          {hasDiscount ? (
            <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <span><span className="font-mono font-semibold">{invoice.discountCode ?? 'Discount'}</span> · −{formatPKR(invoice.discountAmount)}</span>
              {invoice.status === 'unpaid' && (
                <Button size="sm" variant="ghost" onClick={removeDiscount} disabled={!!busy}>
                  {busy === 'remove-discount' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}<span className="ml-1">Remove</span>
                </Button>
              )}
            </div>
          ) : invoice.status === 'unpaid' ? (
            <form onSubmit={applyDiscount} className="flex gap-2">
              <Input
                value={discountCode} onChange={e => { setDiscountCode(e.target.value.toUpperCase()); setDiscountError(null); }}
                placeholder="EID20" className="font-mono uppercase" aria-invalid={!!discountError} aria-describedby="discount-error"
              />
              <Button type="submit" disabled={!!busy || !discountCode.trim()}>
                {busy === 'discount' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Apply
              </Button>
            </form>
          ) : <p className="text-sm text-muted-foreground">None</p>}
          {discountError && <p id="discount-error" className="text-sm text-destructive" role="alert">{discountError}</p>}
        </section>

        {/* Gift voucher */}
        <section className="space-y-2">
          <Label className="flex items-center gap-2"><Gift className="w-4 h-4 text-primary" />Gift voucher</Label>
          {invoice.giftVoucherId ? (
            <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <span>
                <span className="font-mono font-semibold">{voucher?.code ?? 'Voucher'}</span> · covers {formatPKR(invoice.voucherAmount)}
                {voucher && <span className="block text-xs text-muted-foreground">{formatPKR(voucher.balance)} left on the voucher</span>}
              </span>
              {editable && (
                <Button size="sm" variant="ghost" onClick={removeVoucher} disabled={!!busy}>
                  {busy === 'remove-voucher' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}<span className="ml-1">Remove</span>
                </Button>
              )}
            </div>
          ) : invoice.status === 'unpaid' ? (
            <form onSubmit={applyVoucher} className="flex gap-2">
              <Input
                value={voucherCode} onChange={e => { setVoucherCode(e.target.value.toUpperCase()); setVoucherError(null); }}
                placeholder="GV-XXXXX-XXXXX" className="font-mono uppercase" aria-invalid={!!voucherError} aria-describedby="voucher-error"
              />
              <Button type="submit" disabled={!!busy || !voucherCode.trim()}>
                {busy === 'voucher' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Apply
              </Button>
            </form>
          ) : <p className="text-sm text-muted-foreground">None</p>}
          {voucherError && <p id="voucher-error" className="text-sm text-destructive" role="alert">{voucherError}</p>}
          {!invoice.giftVoucherId && invoice.status === 'unpaid' && (
            <p className="text-xs text-muted-foreground">If the voucher covers the full amount, the invoice is marked paid automatically.</p>
          )}
        </section>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={!!busy}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceCreditsDialog;
