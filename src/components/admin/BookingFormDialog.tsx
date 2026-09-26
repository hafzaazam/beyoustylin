import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Check, ChevronsUpDown, Loader2, UserPlus, Users } from 'lucide-react';
import { useSalon } from '@/context/SalonContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Booking, BookingInput, BookingStatus, PAYMENT_METHODS } from '@/types/salon';
import { computeBookingTotals, conflictMessage } from '@/lib/booking';
import { customerSchema, firstError } from '@/lib/validation';
import { formatDuration, formatPKR, formatTime, toLocalInputValue } from '@/lib/format';
import { cn } from '@/lib/utils';

export type BookingFormMode = 'create' | 'edit' | 'walkin';

export interface BookingPrefill {
  customerId?: string;
  newCustomer?: { name: string; phone: string; email?: string };
  staffId?: string;
  chairId?: string;
  /** Local "YYYY-MM-DDTHH:mm". */
  startLocal?: string;
  serviceIds?: string[];
  dealId?: string;
  notes?: string;
}

interface BookingFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: BookingFormMode;
  booking?: Booking;
  prefill?: BookingPrefill;
  title?: string;
  description?: string;
  onSaved?: (booking: Booking) => void;
}

type FieldKey = 'customer' | 'newName' | 'newPhone' | 'newEmail' | 'services' | 'staff' | 'chair' | 'start' | 'customTotal';
type FieldErrors = Partial<Record<FieldKey, string>>;

/** Which inline error a form field clears when the user edits it. */
const FIELD_FOR: Partial<Record<string, FieldKey>> = {
  customerId: 'customer', newName: 'newName', newPhone: 'newPhone', newEmail: 'newEmail',
  serviceIds: 'services', dealId: 'services', useDeal: 'services',
  staffId: 'staff', chairId: 'chair', startLocal: 'start', customTotal: 'customTotal',
};

const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? <p id={id} className="text-xs font-medium text-destructive">{message}</p> : null;

interface FormState {
  customerMode: 'existing' | 'new';
  customerId: string;
  newName: string;
  newPhone: string;
  newEmail: string;
  staffId: string;
  chairId: string;
  startLocal: string;
  useDeal: boolean;
  dealId: string;
  serviceIds: string[];
  customTotal: string;
  notes: string;
  status: BookingStatus;
  markPaid: boolean;
  paymentMethod: string;
  /** Walk-ins only: applied to the new invoice before taking payment. */
  discountCode: string;
  voucherCode: string;
}

const emptyState = (mode: BookingFormMode): FormState => ({
  customerMode: 'existing', customerId: '', newName: '', newPhone: '', newEmail: '',
  staffId: '', chairId: '', startLocal: mode === 'walkin' ? toLocalInputValue(new Date()) : '',
  useDeal: false, dealId: '', serviceIds: [], customTotal: '', notes: '',
  status: mode === 'walkin' ? 'completed' : 'pending',
  markPaid: true, paymentMethod: PAYMENT_METHODS[0], discountCode: '', voucherCode: '',
});

const BookingFormDialog = ({ open, onOpenChange, mode, booking, prefill, title, description, onSaved }: BookingFormDialogProps) => {
  const salon = useSalon();
  const [form, setForm] = useState<FormState>(() => emptyState(mode));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [serviceFilter, setServiceFilter] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const customerTriggerRef = useRef<HTMLButtonElement>(null);
  const newNameRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // (Re)initialise whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setFieldErrors({});
    setServiceFilter('');
    if (mode === 'edit' && booking) {
      setForm({
        ...emptyState(mode),
        customerId: booking.customerId,
        staffId: booking.staffId,
        chairId: booking.chairId,
        startLocal: toLocalInputValue(new Date(booking.startTime)),
        useDeal: !!booking.dealId,
        dealId: booking.dealId ?? '',
        serviceIds: booking.serviceIds,
        customTotal: booking.customTotal !== undefined ? String(booking.customTotal) : '',
        notes: booking.notes ?? '',
        status: booking.status,
      });
      return;
    }
    const base = emptyState(mode);
    const existing = prefill?.customerId
      ?? (prefill?.newCustomer ? salon.findCustomerByPhone(prefill.newCustomer.phone)?.id : undefined);
    setForm({
      ...base,
      customerMode: !existing && prefill?.newCustomer ? 'new' : 'existing',
      customerId: existing ?? '',
      newName: prefill?.newCustomer?.name ?? '',
      newPhone: prefill?.newCustomer?.phone ?? '',
      newEmail: prefill?.newCustomer?.email ?? '',
      staffId: prefill?.staffId ?? '',
      chairId: prefill?.chairId ?? '',
      startLocal: prefill?.startLocal ?? base.startLocal,
      useDeal: !!prefill?.dealId,
      dealId: prefill?.dealId ?? '',
      serviceIds: prefill?.serviceIds ?? [],
      notes: prefill?.notes ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(p => ({ ...p, [key]: value }));
    const field = FIELD_FOR[key as string];
    if (field) setFieldErrors(e => (e[field] ? { ...e, [field]: undefined } : e));
  };
  const errProps = (field: FieldKey) => fieldErrors[field]
    ? { 'aria-invalid': true as const, 'aria-describedby': `bf-${field}-error` }
    : {};

  const activeCustomers = salon.customers.filter(c => c.status === 'active' || c.id === form.customerId);
  const activeStaff = salon.staff.filter(s => s.status === 'active' || s.id === form.staffId);
  const activeChairs = salon.chairs.filter(c => c.status === 'active' || c.id === form.chairId);
  const activeDeals = salon.deals.filter(d => d.status === 'active' || d.id === form.dealId);
  const activeServices = salon.services.filter(s => s.status === 'active' || form.serviceIds.includes(s.id));
  const filteredServices = useMemo(() => {
    const q = serviceFilter.trim().toLowerCase();
    return q ? activeServices.filter(s => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)) : activeServices;
  }, [activeServices, serviceFilter]);

  const customTotal = form.customTotal.trim() === '' ? undefined : Number(form.customTotal);
  const totals = computeBookingTotals(
    { serviceIds: form.useDeal ? [] : form.serviceIds, dealId: form.useDeal ? form.dealId || undefined : undefined, customTotal },
    salon.services, salon.deals,
  );
  const startIso = form.startLocal ? new Date(form.startLocal).toISOString() : '';
  const endIso = startIso && totals.duration > 0 ? new Date(new Date(startIso).getTime() + totals.duration * 60_000).toISOString() : '';
  const occupies = form.status === 'pending' || form.status === 'confirmed' || form.status === 'started';
  const conflict = occupies && form.staffId && form.chairId && startIso && totals.duration > 0
    ? salon.checkConflict({ staffId: form.staffId, chairId: form.chairId, startTime: startIso, duration: totals.duration, excludeId: booking?.id })
    : null;
  const inPast = mode === 'create' && startIso && new Date(startIso).getTime() < Date.now() - 5 * 60_000;
  // With a time and duration known, a single free chair is the obvious choice: pick it.
  const freeChairIds = useMemo(() => {
    if (!startIso || totals.duration <= 0) return [];
    return salon.chairs
      .filter(c => c.status === 'active')
      .filter(c => !salon.checkConflict({ staffId: '__none__', chairId: c.id, startTime: startIso, duration: totals.duration, excludeId: booking?.id }))
      .map(c => c.id);
  }, [salon, startIso, totals.duration, booking?.id]);
  useEffect(() => {
    if (!open || form.chairId || freeChairIds.length !== 1) return;
    set('chairId', freeChairIds[0]);
  }, [open, form.chairId, freeChairIds]);

  const invoice = booking ? salon.getInvoiceByBookingId(booking.id) : undefined;
  const invoicePaid = invoice?.status === 'paid';
  const selectedCustomer = salon.getCustomerById(form.customerId);

  const toggleService = (id: string) =>
    set('serviceIds', form.serviceIds.includes(id) ? form.serviceIds.filter(s => s !== id) : [...form.serviceIds, id]);

  /** Every problem at once, shown next to its field. */
  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    if (form.customerMode === 'existing' && !form.customerId) e.customer = 'Choose a customer, or add a new one.';
    if (form.customerMode === 'new') {
      const parsed = customerSchema.safeParse({ name: form.newName, phone: form.newPhone, email: form.newEmail });
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const key = issue.path[0] === 'name' ? 'newName' : issue.path[0] === 'phone' ? 'newPhone' : issue.path[0] === 'email' ? 'newEmail' : undefined;
          if (key && !e[key]) e[key] = issue.message;
        }
      }
    }
    if (form.useDeal ? !form.dealId : form.serviceIds.length === 0) e.services = form.useDeal ? 'Choose a package.' : 'Select at least one service.';
    if (!form.staffId) e.staff = 'Choose who will do it.';
    if (!form.chairId) e.chair = activeChairs.length ? 'Choose a chair.' : 'Add a chair on the Chairs page first.';
    if (!form.startLocal) e.start = 'Choose a start time.';
    if (customTotal !== undefined && (Number.isNaN(customTotal) || customTotal < 0)) e.customTotal = 'Enter zero or more, or leave it empty.';
    return e;
  };

  const submit = async () => {
    setError(null);
    const problems = validate();
    setFieldErrors(problems);
    const count = Object.keys(problems).length;
    if (count > 0) {
      setError(count === 1 ? 'Fix the highlighted field.' : `Fix the ${count} highlighted fields.`);
      return;
    }
    if (conflict) return setError(conflictMessage(conflict));

    setSaving(true);
    try {
      let customerId = form.customerId;
      if (form.customerMode === 'new') {
        const parsed = customerSchema.safeParse({ name: form.newName, phone: form.newPhone, email: form.newEmail });
        if (!parsed.success) return setError(firstError(parsed));
        const existing = salon.findCustomerByPhone(parsed.data.phone);
        if (existing) {
          customerId = existing.id;
          toast.info(`Using existing customer ${existing.name} with the same phone number.`);
        } else {
          const created = await salon.addCustomer({
            name: parsed.data.name, phone: parsed.data.phone, email: parsed.data.email, status: 'active',
          });
          if (!created) return;
          customerId = created.id;
        }
      }

      const input: BookingInput = {
        customerId,
        staffId: form.staffId,
        chairId: form.chairId,
        serviceIds: form.useDeal ? [] : form.serviceIds,
        dealId: form.useDeal ? form.dealId : undefined,
        startTime: startIso,
        customTotal,
        notes: form.notes,
        status: form.status,
      };
      const result = mode === 'edit' && booking
        ? await salon.updateBooking(booking.id, input)
        : await salon.addBooking(input);
      if (typeof result === 'string') return setError(result);

      let paidNote = '';
      if (mode === 'walkin' && form.markPaid) paidNote = await settleWalkIn(result.id);
      toast.success(
        mode === 'edit' ? 'Booking updated'
          : mode === 'walkin' ? `Walk-in saved${paidNote} — invoice created`
            : 'Booking created — invoice generated',
      );
      onSaved?.(result);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Applies the walk-in's discount code / gift voucher to the new invoice, then
   * records payment for whatever is still due. The booking is already saved, so a
   * rejected code never loses it: the invoice just stays unpaid for staff to fix.
   * Returns a suffix for the success toast.
   */
  const settleWalkIn = async (bookingId: string): Promise<string> => {
    const discount = form.discountCode.trim();
    const voucherCode = form.voucherCode.trim();
    const findInvoice = () => supabase.from('invoices')
      .select('id, status, total_amount, voucher_amount').eq('booking_id', bookingId).maybeSingle();

    if (discount || voucherCode) {
      const { data: inv } = await findInvoice();
      if (!inv) {
        toast.warning('Walk-in saved, but its invoice was not found. Apply the code on the Invoices page.');
        return '';
      }
      if (discount) {
        const err = await salon.applyInvoiceDiscount(inv.id, discount);
        if (err) {
          toast.warning(`Discount code not applied: ${err} The invoice is still unpaid — fix it on the Invoices page.`, { duration: 10_000 });
          return '';
        }
      }
      if (voucherCode) {
        const err = await salon.applyInvoiceGiftVoucher(inv.id, voucherCode);
        if (err) {
          toast.warning(`Gift voucher not applied: ${err} The invoice is still unpaid — fix it on the Invoices page.`, { duration: 10_000 });
          return '';
        }
      }
      const { data: after } = await findInvoice();
      // A voucher that covers everything marks the invoice paid by itself.
      if (after?.status === 'paid') return ' and paid with the gift voucher';
    }
    return (await salon.payBooking(bookingId, form.paymentMethod)) ? ' and paid' : '';
  };

  const heading = title ?? (mode === 'edit' ? 'Edit booking' : mode === 'walkin' ? 'Walk-in order' : 'New booking');

  return (
    <Dialog open={open} onOpenChange={o => { if (!saving) onOpenChange(o); }}>
      <DialogContent
        className="max-w-2xl p-0 gap-0 max-h-[92vh] flex flex-col"
        // Start where a receptionist starts: who is it for?
        onOpenAutoFocus={e => {
          e.preventDefault();
          const target = mode === 'edit' ? titleRef.current
            : form.customerMode === 'new' ? newNameRef.current : customerTriggerRef.current;
          target?.focus();
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle ref={titleRef} tabIndex={-1} className="font-heading text-2xl focus:outline-none">{heading}</DialogTitle>
          <DialogDescription>
            {description ?? (mode === 'walkin'
              ? 'For customers being served right now. Saved as completed with an invoice.'
              : 'Price, duration and end time are calculated automatically.')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {invoicePaid && (
            <div className="flex gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <span>The invoice for this booking is paid. You can change the time, chair or notes; to change customer, staff, services or price, mark the invoice unpaid first.</span>
            </div>
          )}

          {/* Customer */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={form.customerMode === 'existing' ? 'bf-customer' : 'bf-new-name'}>Customer</Label>
              {mode !== 'edit' && (
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
                  onClick={() => set('customerMode', form.customerMode === 'existing' ? 'new' : 'existing')}
                >
                  {form.customerMode === 'existing'
                    ? <><UserPlus className="w-3.5 h-3.5" /> New customer</>
                    : <><Users className="w-3.5 h-3.5" /> Choose existing</>}
                </button>
              )}
            </div>
            {form.customerMode === 'existing' ? (
              <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    ref={customerTriggerRef} id="bf-customer" variant="outline" role="combobox" aria-expanded={customerOpen}
                    className={cn('w-full justify-between font-normal', fieldErrors.customer && 'border-destructive')}
                    {...errProps('customer')}
                  >
                    {selectedCustomer ? `${selectedCustomer.name} · ${selectedCustomer.phone}` : <span className="text-muted-foreground">Search by name or phone…</span>}
                    <ChevronsUpDown className="w-4 h-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                  <Command filter={(value, search) => (value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
                    <CommandInput placeholder="Name or phone…" />
                    <CommandList>
                      <CommandEmpty>
                        No customer found.{' '}
                        <button type="button" className="text-primary font-medium" onClick={() => { set('customerMode', 'new'); setCustomerOpen(false); }}>Add new</button>
                      </CommandEmpty>
                      <CommandGroup>
                        {activeCustomers.map(c => (
                          <CommandItem key={c.id} value={`${c.name} ${c.phone} ${c.id}`} onSelect={() => { set('customerId', c.id); setCustomerOpen(false); }}>
                            <Check className={cn('w-4 h-4 mr-2', form.customerId === c.id ? 'opacity-100' : 'opacity-0')} />
                            <span className="flex-1">{c.name}</span>
                            <span className="text-xs text-muted-foreground">{c.phone}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
              <div className="grid sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="bf-new-name" className="text-xs text-muted-foreground">Full name</Label>
                  <Input ref={newNameRef} id="bf-new-name" value={form.newName} onChange={e => set('newName', e.target.value)} maxLength={100} autoComplete="off" {...errProps('newName')} />
                  <FieldError id="bf-newName-error" message={fieldErrors.newName} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bf-new-phone" className="text-xs text-muted-foreground">Phone</Label>
                  <Input id="bf-new-phone" type="tel" inputMode="tel" placeholder="03XX XXXXXXX" value={form.newPhone} onChange={e => set('newPhone', e.target.value)} maxLength={20} {...errProps('newPhone')} />
                  <FieldError id="bf-newPhone-error" message={fieldErrors.newPhone} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bf-new-email" className="text-xs text-muted-foreground">Email (optional)</Label>
                  <Input id="bf-new-email" type="email" value={form.newEmail} onChange={e => set('newEmail', e.target.value)} maxLength={255} {...errProps('newEmail')} />
                  <FieldError id="bf-newEmail-error" message={fieldErrors.newEmail} />
                </div>
              </div>
            )}
            <FieldError id="bf-customer-error" message={fieldErrors.customer} />
          </section>

          {/* What */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label id="bf-services-label">{form.useDeal ? 'Package' : 'Services'}</Label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Use a package
                <Switch checked={form.useDeal} onCheckedChange={v => setForm(p => ({ ...p, useDeal: v, dealId: '', serviceIds: [] }))} />
              </label>
            </div>
            {form.useDeal ? (
              <Select value={form.dealId} onValueChange={v => set('dealId', v)}>
                <SelectTrigger aria-labelledby="bf-services-label" className={cn(fieldErrors.services && 'border-destructive')} {...errProps('services')}><SelectValue placeholder="Select package" /></SelectTrigger>
                <SelectContent>
                  {activeDeals.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name} — {formatPKR(d.discountedPrice)} · {formatDuration(d.totalDuration)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <>
                {activeServices.length > 8 && (
                  <Input placeholder="Filter services…" aria-label="Filter services" value={serviceFilter} onChange={e => setServiceFilter(e.target.value)} className="h-9" />
                )}
                <div
                  role="group" aria-labelledby="bf-services-label" {...errProps('services')}
                  className={cn('grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 rounded-lg', fieldErrors.services && 'ring-1 ring-destructive p-1')}
                >
                  {filteredServices.map(s => {
                    const selected = form.serviceIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleService(s.id)}
                        aria-pressed={selected}
                        className={cn(
                          'p-2.5 rounded-lg border text-left text-sm transition-colors flex items-start gap-2',
                          selected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted',
                        )}
                      >
                        <span className={cn('mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0', selected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40')}>
                          {selected && <Check className="w-3 h-3" />}
                        </span>
                        <span className="min-w-0">
                          <span className="font-medium block truncate">{s.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {s.price > 0 ? formatPKR(s.price) : 'Price on request'} · {formatDuration(s.duration)}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <FieldError id="bf-services-error" message={fieldErrors.services} />
          </section>

          {/* Who / where / when */}
          <section className="grid sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bf-staff">Staff</Label>
              <Select value={form.staffId} onValueChange={v => set('staffId', v)}>
                <SelectTrigger id="bf-staff" className={cn(fieldErrors.staff && 'border-destructive')} {...errProps('staff')}><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>{activeStaff.map(s => <SelectItem key={s.id} value={s.id}>{s.name} · {s.role}</SelectItem>)}</SelectContent>
              </Select>
              <FieldError id="bf-staff-error" message={fieldErrors.staff} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bf-chair">Chair</Label>
              <Select value={form.chairId} onValueChange={v => set('chairId', v)}>
                <SelectTrigger id="bf-chair" className={cn(fieldErrors.chair && 'border-destructive')} {...errProps('chair')}><SelectValue placeholder={activeChairs.length ? 'Select chair' : 'No chairs yet'} /></SelectTrigger>
                <SelectContent>
                  {activeChairs.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}{startIso && totals.duration > 0 && !freeChairIds.includes(c.id) ? ' · busy' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.chair
                ? <FieldError id="bf-chair-error" message={fieldErrors.chair} />
                : activeChairs.length === 0 && <p className="text-xs text-muted-foreground">Add chairs under Chairs first.</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bf-start">Start</Label>
              <Input id="bf-start" type="datetime-local" step={300} value={form.startLocal} onChange={e => set('startLocal', e.target.value)} {...errProps('start')} />
              <FieldError id="bf-start-error" message={fieldErrors.start} />
            </div>
          </section>

          {/* Price + notes */}
          <section className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bf-custom-total">Custom total (optional)</Label>
              <Input
                id="bf-custom-total" type="number" min={0} inputMode="numeric" placeholder={`List price ${formatPKR(totals.listPrice)}`}
                value={form.customTotal} onChange={e => set('customTotal', e.target.value)} {...errProps('customTotal')}
              />
              <FieldError id="bf-customTotal-error" message={fieldErrors.customTotal} />
              <p className="text-xs text-muted-foreground">For quotes, discounts or "price on request" services.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bf-notes">Notes</Label>
              <Textarea id="bf-notes" rows={3} maxLength={1000} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Occasion, allergies, preferences…" />
            </div>
          </section>

          {mode === 'create' && (
            <section className="space-y-1.5 max-w-xs">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v as BookingStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </section>
          )}

          {mode === 'walkin' && (
            <section className="flex flex-wrap items-center gap-4 rounded-lg border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Switch checked={form.markPaid} onCheckedChange={v => set('markPaid', v)} />
                Paid now
              </label>
              {form.markPaid && (
                <Select value={form.paymentMethod} onValueChange={v => set('paymentMethod', v)}>
                  <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {form.markPaid && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  <div className="space-y-1">
                    <Label htmlFor="wi-discount" className="text-xs text-muted-foreground">Discount code (optional)</Label>
                    <Input
                      id="wi-discount" className="h-9 font-mono" placeholder="e.g. EID20" maxLength={30}
                      value={form.discountCode} onChange={e => set('discountCode', e.target.value.toUpperCase())}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="wi-voucher" className="text-xs text-muted-foreground">Gift voucher (optional)</Label>
                    <Input
                      id="wi-voucher" className="h-9 font-mono" placeholder="GV-XXXXX-XXXXX" maxLength={20}
                      value={form.voucherCode} onChange={e => set('voucherCode', e.target.value.toUpperCase())}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    Codes are checked when you save. The payment method is used for anything the voucher doesn't cover.
                  </p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Summary + actions */}
        <div className="border-t px-6 py-4 space-y-3 bg-muted/30">
          {(conflict || inPast || error) && (
            <div className="space-y-1.5 text-sm" role="alert">
              {conflict && <p className="text-destructive font-medium flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{conflictMessage(conflict)}</p>}
              {inPast && !conflict && <p className="text-warning flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />This start time is in the past.</p>}
              {error && error !== (conflict && conflictMessage(conflict)) && <p className="text-destructive font-medium">{error}</p>}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              {totals.duration > 0 ? (
                <>
                  <span className="font-heading text-2xl font-semibold tabular-nums">{formatPKR(totals.price)}</span>
                  {customTotal !== undefined && totals.price !== totals.listPrice && (
                    <span className="ml-2 text-muted-foreground line-through tabular-nums">{formatPKR(totals.listPrice)}</span>
                  )}
                  <span className="block text-xs text-muted-foreground">
                    {formatDuration(totals.duration)}{endIso && ` · ends ${formatTime(endIso)}`}
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">Select services to see the total</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
              <Button onClick={submit} disabled={saving || !!conflict}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {mode === 'edit' ? 'Save changes' : mode === 'walkin' ? 'Save walk-in' : 'Create booking'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingFormDialog;
