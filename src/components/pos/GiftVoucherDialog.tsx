import { useEffect, useState } from 'react';
import { Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatPKR, toLocalDateKey } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface VoucherLineInput {
  value: number;
  recipientName?: string;
  recipientPhone?: string;
  expiresOn?: string;
}

const QUICK = [2000, 5000, 10000];

const oneYearFromToday = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return toLocalDateKey(d);
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (line: VoucherLineInput) => void;
}

const GiftVoucherDialog = ({ open, onOpenChange, onAdd }: Props) => {
  const [amount, setAmount] = useState('5000');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [expires, setExpires] = useState(oneYearFromToday());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount('5000'); setName(''); setPhone(''); setExpires(oneYearFromToday()); setError(null);
  }, [open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Math.round(Number(amount));
    if (!Number.isFinite(value) || value < 100) return setError('A gift voucher must be worth at least Rs. 100.');
    if (value > 1_000_000) return setError('That amount is too large.');
    if (expires && expires <= toLocalDateKey(new Date())) return setError('Expiry date must be in the future.');
    if (phone.trim() && !/^[+\d][\d\s-]{6,19}$/.test(phone.trim())) return setError('Enter a valid phone number, or leave it empty.');
    onAdd({ value, recipientName: name.trim() || undefined, recipientPhone: phone.trim() || undefined, expiresOn: expires || undefined });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2"><Gift className="w-5 h-5 text-primary" />Sell a gift voucher</DialogTitle>
          <DialogDescription>The code is created when the sale is completed.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gv-amount">Amount</Label>
            <div className="grid grid-cols-3 gap-2">
              {QUICK.map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  aria-pressed={Number(amount) === q}
                  className={cn(
                    'h-11 rounded-lg border text-sm font-semibold tabular-nums transition-colors',
                    Number(amount) === q ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted',
                  )}
                >
                  {formatPKR(q)}
                </button>
              ))}
            </div>
            <Input id="gv-amount" type="number" min={100} step={100} inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Custom amount" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="gv-name">Recipient name</Label><Input id="gv-name" value={name} maxLength={100} onChange={e => setName(e.target.value)} placeholder="Optional" /></div>
            <div className="space-y-1.5"><Label htmlFor="gv-phone">Recipient phone</Label><Input id="gv-phone" type="tel" value={phone} maxLength={20} onChange={e => setPhone(e.target.value)} placeholder="Optional" /></div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gv-expires">Valid until</Label>
            <Input id="gv-expires" type="date" value={expires} min={toLocalDateKey(new Date())} onChange={e => setExpires(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive font-medium" role="alert">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Add to sale</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GiftVoucherDialog;
