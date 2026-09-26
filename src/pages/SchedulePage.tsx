import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Armchair, Banknote, CalendarClock, ChevronLeft, ChevronRight, MoveRight, Pencil, Phone, Plus, ReceiptText, Sparkles, Zap } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useSalon } from '@/context/SalonContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import EmptyState from '@/components/EmptyState';
import BookingFormDialog, { BookingFormMode, BookingPrefill } from '@/components/admin/BookingFormDialog';
import { SITE } from '@/config/site';
import { bookingsInWindow } from '@/lib/booking';
import { capitalize, formatDuration, formatPKR, formatTime, toLocalDateKey, toLocalInputValue } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Booking, BookingStatus, BOOKING_STATUSES } from '@/types/salon';

const SLOT_MIN = 15;
const PX_PER_MIN = 48 / 30;
const COL_MIN_W = 150;
/** Columns with nothing booked that day get less room so busy people stay in view. */
const EMPTY_COL_W = 104;

// Status reads from the tint, the border and the words in the block, never colour alone.
const blockStyle: Partial<Record<BookingStatus, string>> = {
  pending: 'bg-warning/15 border-warning/60 hover:bg-warning/25',
  confirmed: 'bg-info/15 border-info/60 hover:bg-info/25',
  started: 'bg-primary/15 border-primary/60 hover:bg-primary/25',
  completed: 'bg-success/15 border-success/60 hover:bg-success/25',
};
const statusLabel = (s: BookingStatus) => (s === 'started' ? 'In progress' : capitalize(s));

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

interface Column { id: string; name: string; sub?: string }
interface Placed { booking: Booking; top: number; height: number; lane: number; lanes: number }

/** Side-by-side lanes for bookings that overlap inside one column (e.g. completed walk-ins). */
const layoutColumn = (items: Booking[], dayStart: number, dayEnd: number): Placed[] => {
  const sorted = [...items].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const laneEnds: number[] = [];
  const placed = sorted.map(b => {
    const s = Math.max(new Date(b.startTime).getTime(), dayStart);
    const e = Math.min(new Date(b.endTime).getTime(), dayEnd);
    let lane = laneEnds.findIndex(end => end <= s);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(e); } else laneEnds[lane] = e;
    return {
      booking: b,
      top: ((s - dayStart) / 60_000) * PX_PER_MIN,
      height: Math.max(22, ((e - s) / 60_000) * PX_PER_MIN - 2),
      lane,
      lanes: 1,
    };
  });
  const lanes = Math.max(1, laneEnds.length);
  return placed.map(p => ({ ...p, lanes }));
};

const SchedulePage = () => {
  const salon = useSalon();
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [view, setView] = useState<'staff' | 'chair'>('staff');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<{ open: boolean; mode: BookingFormMode; booking?: Booking; prefill?: BookingPrefill }>({ open: false, mode: 'create' });
  const [now, setNow] = useState(() => Date.now());
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const detailsTitleRef = useRef<HTMLHeadingElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const startHour = SITE.scheduleStartHour;
  const endHour = SITE.scheduleEndHour;
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), startHour).getTime();
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), endHour).getTime();
  const gridHeight = (endHour - startHour) * 60 * PX_PER_MIN;
  const isToday = toLocalDateKey(day) === toLocalDateKey(new Date(now));

  const dayBookings = useMemo(
    () => bookingsInWindow(salon.bookings, new Date(dayStart), new Date(dayEnd)).filter(b => b.status !== 'canceled'),
    [salon.bookings, dayStart, dayEnd],
  );

  // Hidden (disabled) staff/chairs still get a column if they have bookings that day.
  const columns: Column[] = useMemo(() => {
    const used = new Set(dayBookings.map(b => (view === 'staff' ? b.staffId : b.chairId)));
    return view === 'staff'
      ? salon.staff.filter(s => s.status === 'active' || used.has(s.id)).map(s => ({ id: s.id, name: s.name, sub: s.role }))
      : salon.chairs.filter(c => c.status === 'active' || used.has(c.id)).map(c => ({ id: c.id, name: c.name }));
  }, [view, salon.staff, salon.chairs, dayBookings]);

  const placedByColumn = useMemo(() => {
    const map = new Map<string, Placed[]>();
    for (const col of columns) {
      const items = dayBookings.filter(b => (view === 'staff' ? b.staffId : b.chairId) === col.id);
      map.set(col.id, layoutColumn(items, dayStart, dayEnd));
    }
    return map;
  }, [columns, dayBookings, view, dayStart, dayEnd]);

  const colWidth = (colId: string) => ((placedByColumn.get(colId)?.length ?? 0) > 0 ? COL_MIN_W : EMPTY_COL_W);
  const gridMinWidth = 64 + columns.reduce((sum, c) => sum + colWidth(c.id), 0);

  // On phones only a couple of columns fit: say so instead of hiding the rest silently.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 4 && el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    check();
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => { el.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, [gridMinWidth]);

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const slotsPerHour = 60 / SLOT_MIN;

  const labelFor = (b: Booking) => {
    if (b.dealId) return salon.getDealById(b.dealId)?.name ?? 'Package';
    return b.serviceIds.map(id => salon.getServiceById(id)?.name).filter(Boolean).join(', ') || 'Service';
  };

  const openCreate = (prefill?: BookingPrefill) => setForm({ open: true, mode: 'create', prefill });
  const openSlot = (col: Column, e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const minutes = Math.floor((e.clientY - rect.top) / PX_PER_MIN / SLOT_MIN) * SLOT_MIN;
    const start = new Date(dayStart + minutes * 60_000);
    openCreate({
      startLocal: toLocalInputValue(start),
      ...(view === 'staff' ? { staffId: col.id } : { chairId: col.id }),
    });
  };

  const selected = selectedId ? salon.getBookingById(selectedId) : undefined;
  const selCustomer = selected ? salon.getCustomerById(selected.customerId) : undefined;
  const selInvoice = selected ? salon.getInvoiceByBookingId(selected.id) : undefined;

  const changeStatus = async (b: Booking, status: BookingStatus) => {
    if (await salon.updateBookingStatus(b.id, status)) toast.success(`Marked ${status === 'started' ? 'in progress' : status}`);
  };

  const actions = (
    <>
      <Button size="sm" onClick={() => openCreate({ startLocal: isToday ? undefined : toLocalInputValue(new Date(dayStart)) })}>
        <Plus className="w-4 h-4 mr-1.5" />New booking
      </Button>
      <Button size="sm" variant="outline" onClick={() => setForm({ open: true, mode: 'walkin' })}>
        <Zap className="w-4 h-4 mr-1.5" />Walk-in
      </Button>
    </>
  );

  const dayLabel = day.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const nowTop = ((now - dayStart) / 60_000) * PX_PER_MIN;
  const showNow = isToday && now >= dayStart && now <= dayEnd;

  return (
    <AdminLayout title="Schedule" actions={actions}>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-11 w-11 sm:h-9 sm:w-9" onClick={() => setDay(d => addDays(d, -1))} aria-label="Previous day">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline" size="sm"
            className={cn('h-11 sm:h-9', isToday && 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary')}
            onClick={() => setDay(startOfDay(new Date()))}
            aria-pressed={isToday}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-11 w-11 sm:h-9 sm:w-9" onClick={() => setDay(d => addDays(d, 1))} aria-label="Next day">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Input
          type="date"
          className="h-11 sm:h-9 w-auto"
          value={toLocalDateKey(day)}
          onChange={e => { if (e.target.value) setDay(new Date(`${e.target.value}T00:00`)); }}
          aria-label="Choose date"
        />
        <h3 className="font-heading text-lg font-semibold mr-auto px-1">{dayLabel}</h3>
        <div className="inline-flex rounded-lg border bg-muted p-0.5 text-xs font-medium" role="tablist" aria-label="Group by">
          {(['staff', 'chair'] as const).map(v => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn('px-3 py-2 sm:py-1.5 rounded-md transition-colors inline-flex items-center gap-1.5', view === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              {v === 'staff' ? <Sparkles className="w-3.5 h-3.5" /> : <Armchair className="w-3.5 h-3.5" />}
              By {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-xs text-muted-foreground">
        <span>{dayBookings.length} booking{dayBookings.length === 1 ? '' : 's'}</span>
        <span className="hidden sm:inline">· Click an empty slot to book it</span>
        {overflowing && (
          <span className="ml-auto inline-flex items-center gap-1 font-medium text-foreground">
            Swipe for more {view === 'staff' ? 'staff' : 'chairs'} <MoveRight className="w-3.5 h-3.5" aria-hidden />
          </span>
        )}
        {dayBookings.some(b => new Date(b.startTime).getTime() < dayStart || new Date(b.endTime).getTime() > dayEnd) && (
          <span className="text-warning">· Some bookings fall outside {startHour}:00–{endHour}:00 and are clipped</span>
        )}
      </div>

      {columns.length === 0 ? (
        view === 'staff' ? (
          <EmptyState icon={Sparkles} title="No active staff" description="Add staff members to see their day here." action={<Button asChild><Link to="/admin/staff">Go to Staff</Link></Button>} />
        ) : (
          <EmptyState icon={Armchair} title="No active chairs" description="Add chairs or stations to schedule bookings on them." action={<Button asChild><Link to="/admin/chairs">Go to Chairs</Link></Button>} />
        )
      ) : (
        <div className="bg-card rounded-2xl border overflow-hidden">
          <div ref={scrollRef} className="overflow-auto max-h-[calc(100vh-15rem)]">
            <div className="relative" style={{ minWidth: gridMinWidth }}>
              {/* Column headers */}
              <div className="sticky top-0 z-20 flex bg-card/95 backdrop-blur border-b">
                <div className="sticky left-0 z-30 w-16 shrink-0 bg-card/95 border-r" />
                {columns.map(col => {
                  const count = placedByColumn.get(col.id)?.length ?? 0;
                  return (
                    <div key={col.id} className={cn('px-3 py-2.5 border-r last:border-r-0', count > 0 ? 'flex-[1_1_0]' : 'flex-[0.6_1_0]')} style={{ minWidth: colWidth(col.id) }}>
                      <p className="text-sm font-semibold truncate">{col.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{col.sub ? `${col.sub} · ` : ''}{count} booking{count === 1 ? '' : 's'}</p>
                    </div>
                  );
                })}
              </div>

              <div className="flex relative">
                {/* Time gutter */}
                <div className="sticky left-0 z-10 w-16 shrink-0 bg-card border-r" style={{ height: gridHeight }}>
                  {hours.map(h => (
                    <div key={h} className="relative text-[11px] text-muted-foreground tabular-nums" style={{ height: 60 * PX_PER_MIN }}>
                      <span className="absolute top-0.5 right-2 bg-card px-0.5">
                        {new Date(2000, 0, 1, h).toLocaleTimeString('en-PK', { hour: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Columns */}
                {columns.map(col => (
                  <div
                    key={col.id}
                    className={cn('relative border-r last:border-r-0 cursor-pointer', (placedByColumn.get(col.id)?.length ?? 0) > 0 ? 'flex-[1_1_0]' : 'flex-[0.6_1_0]')}
                    style={{ minWidth: colWidth(col.id), height: gridHeight }}
                    onClick={e => openSlot(col, e)}
                    role="presentation"
                  >
                    {hours.map(h => (
                      <div key={h}>
                        {Array.from({ length: slotsPerHour }, (_, i) => (
                          <div
                            key={i}
                            style={{ height: SLOT_MIN * PX_PER_MIN }}
                            className={cn(
                              'hover:bg-primary/5',
                              i === slotsPerHour / 2 - 1 && 'border-b border-dashed border-border/50',
                              i === slotsPerHour - 1 && 'border-b border-border/70',
                            )}
                          />
                        ))}
                      </div>
                    ))}

                    {placedByColumn.get(col.id)?.map(p => {
                      const b = p.booking;
                      const customer = salon.getCustomerById(b.customerId);
                      const other = view === 'staff' ? salon.getChairById(b.chairId)?.name : salon.getStaffById(b.staffId)?.name;
                      const width = 100 / p.lanes;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={e => { e.stopPropagation(); setSelectedId(b.id); }}
                          className={cn(
                            'absolute flex flex-col justify-start rounded-md border px-2 py-1 text-left overflow-hidden transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            blockStyle[b.status] ?? 'bg-muted border-border hover:bg-muted/80',
                          )}
                          style={{ top: p.top + 1, height: p.height, left: `calc(${p.lane * width}% + 2px)`, width: `calc(${width}% - 4px)` }}
                          aria-label={`${customer?.name ?? 'Customer'}, ${labelFor(b)}, ${formatTime(b.startTime)} to ${formatTime(b.endTime)}, ${statusLabel(b.status)}`}
                        >
                          <p className="text-xs font-semibold truncate text-foreground">{customer?.name ?? 'Unknown customer'}</p>
                          {p.height > 34 && <p className="text-[11px] truncate text-foreground/80">{labelFor(b)}</p>}
                          {p.height > 52 && (
                            <p className="text-[11px] truncate text-muted-foreground tabular-nums">
                              {statusLabel(b.status)} · {formatTime(b.startTime)}–{formatTime(b.endTime)}{other ? ` · ${other}` : ''}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}

                {showNow && (
                  <div className="pointer-events-none absolute left-16 right-0 z-10 flex items-center" style={{ top: nowTop }}>
                    <span className="w-2 h-2 -ml-1 rounded-full bg-destructive" />
                    <span className="flex-1 h-px bg-destructive" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Booking details */}
      <Dialog open={!!selected} onOpenChange={o => { if (!o) setSelectedId(null); }}>
        <DialogContent
          className="max-w-md"
          // Start on the heading, not the status select: Enter must never change a status by accident.
          onOpenAutoFocus={e => { e.preventDefault(); detailsTitleRef.current?.focus(); }}
        >
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle ref={detailsTitleRef} tabIndex={-1} className="font-heading text-xl focus:outline-none">{selCustomer?.name ?? 'Unknown customer'}</DialogTitle>
                <DialogDescription>
                  {formatTime(selected.startTime)} – {formatTime(selected.endTime)} · {formatDuration(selected.totalDuration)}
                </DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-[6.5rem_1fr] gap-y-2 text-sm">
                {selCustomer?.phone && (
                  <>
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd><a href={`tel:${selCustomer.phone}`} className="text-primary inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{selCustomer.phone}</a></dd>
                  </>
                )}
                <dt className="text-muted-foreground">{selected.dealId ? 'Package' : 'Services'}</dt>
                <dd>{labelFor(selected)}</dd>
                <dt className="text-muted-foreground">Staff</dt>
                <dd>{salon.getStaffById(selected.staffId)?.name ?? '—'}</dd>
                <dt className="text-muted-foreground">Chair</dt>
                <dd>{salon.getChairById(selected.chairId)?.name ?? '—'}</dd>
                <dt className="text-muted-foreground">Total</dt>
                <dd className="font-semibold">{formatPKR(selected.totalPrice)}</dd>
                <dt className="text-muted-foreground">Invoice</dt>
                <dd className="flex items-center gap-2">
                  {selInvoice ? <><span className="font-mono text-xs">{selInvoice.invoiceNumber}</span><StatusBadge status={selInvoice.status} /></> : '—'}
                </dd>
                {selected.notes && (
                  <>
                    <dt className="text-muted-foreground">Notes</dt>
                    <dd className="whitespace-pre-wrap">{selected.notes}</dd>
                  </>
                )}
              </dl>
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-[6.5rem] shrink-0">Status</span>
                  <Select value={selected.status} onValueChange={v => changeStatus(selected, v as BookingStatus)}>
                    <SelectTrigger className="flex-1 h-10" aria-label="Booking status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BOOKING_STATUSES.map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => { setForm({ open: true, mode: 'edit', booking: selected }); setSelectedId(null); }}
                  >
                    <Pencil className="w-4 h-4 mr-1.5" />Edit
                  </Button>
                  {selInvoice && (
                    <Button variant="outline" onClick={() => navigate(`/admin/invoices?q=${encodeURIComponent(selInvoice.invoiceNumber)}`)}>
                      <ReceiptText className="w-4 h-4 mr-1.5" />Open invoice
                    </Button>
                  )}
                  {selInvoice?.status === 'unpaid' && (
                    <Button className="sm:ml-auto" onClick={() => navigate(`/admin/invoices?charge=${encodeURIComponent(selInvoice.invoiceNumber)}`)}>
                      <Banknote className="w-4 h-4 mr-1.5" />Charge {formatPKR(Math.max(0, selInvoice.totalAmount - selInvoice.voucherAmount))}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <BookingFormDialog
        open={form.open}
        onOpenChange={o => setForm(f => ({ ...f, open: o }))}
        mode={form.mode}
        booking={form.booking}
        prefill={form.prefill}
        onSaved={b => {
          const d = startOfDay(new Date(b.startTime));
          if (toLocalDateKey(d) !== toLocalDateKey(day)) setDay(d);
        }}
      />

      {columns.length > 0 && dayBookings.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
          <CalendarClock className="w-4 h-4" /> Nothing booked on this day yet.
        </p>
      )}
    </AdminLayout>
  );
};

export default SchedulePage;
