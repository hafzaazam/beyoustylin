import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarHeart, CalendarClock, Pencil, Plus, Search, Trash2, Zap } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import BookingFormDialog, { BookingFormMode } from '@/components/admin/BookingFormDialog';
import { useConfirm } from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import Pager, { usePaged } from '@/components/Pager';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSalon } from '@/context/SalonContext';
import { useAuth } from '@/hooks/useAuth';
import { Booking, BookingStatus, BOOKING_STATUSES } from '@/types/salon';
import { capitalize, formatDate, formatPKR, formatTime } from '@/lib/format';

type Range = 'today' | 'upcoming' | 'past' | 'all';

const RANGES: { key: Range; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All' },
];

const BookingsPage = () => {
  const salon = useSalon();
  const { canManage } = useAuth();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [formMode, setFormMode] = useState<BookingFormMode | null>(null);
  const [editing, setEditing] = useState<Booking | undefined>();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [range, setRange] = useState<Range>('upcoming');

  const openForm = (mode: BookingFormMode, booking?: Booking) => { setEditing(booking); setFormMode(mode); };

  const itemsLabel = (b: Booking) => {
    if (b.dealId) return salon.getDealById(b.dealId)?.name ?? 'Package';
    return b.serviceIds.map(id => salon.getServiceById(id)?.name).filter(Boolean).join(', ') || '—';
  };

  const filtered = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = startOfToday + 86_400_000;
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    const rows = salon.bookings.filter(b => {
      const start = new Date(b.startTime).getTime();
      if (range === 'today' && (start < startOfToday || start >= endOfToday)) return false;
      if (range === 'upcoming' && (new Date(b.endTime).getTime() < now.getTime() || b.status === 'canceled' || b.status === 'completed')) return false;
      if (range === 'past' && start >= now.getTime()) return false;
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      if (staffFilter !== 'all' && b.staffId !== staffFilter) return false;
      if (!q) return true;
      const customer = salon.getCustomerById(b.customerId);
      const invoice = salon.getInvoiceByBookingId(b.id);
      return (
        customer?.name.toLowerCase().includes(q) ||
        (qDigits.length >= 3 && customer?.phone.replace(/\D/g, '').includes(qDigits)) ||
        b.id.startsWith(q.replace('#', '')) ||
        invoice?.invoiceNumber.toLowerCase().includes(q)
      );
    });
    // Upcoming/today read top-down in time; history shows the most recent first.
    const asc = range === 'today' || range === 'upcoming';
    return rows.sort((a, b) => (asc ? 1 : -1) * (new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
    // salon getters change with their underlying arrays
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salon.bookings, salon.customers, salon.invoices, search, statusFilter, staffFilter, range]);

  const paged = usePaged(filtered, 25, `${search}|${statusFilter}|${staffFilter}|${range}`);

  const changeStatus = (b: Booking, status: BookingStatus) => {
    if (status === b.status) return;
    const apply = async () => {
      if (await salon.updateBookingStatus(b.id, status)) toast.success(`Booking marked ${status === 'started' ? 'in progress' : status}`);
    };
    if (status === 'canceled') {
      confirm({
        title: 'Cancel this booking?',
        description: 'The time slot is released and an unpaid invoice is voided. You can reopen it later by changing the status back.',
        confirmLabel: 'Cancel booking',
        destructive: true,
        onConfirm: apply,
      });
    } else {
      apply();
    }
  };

  const remove = (b: Booking) => confirm({
    title: 'Delete this booking permanently?',
    description: 'This also deletes its invoice. Prefer "Canceled" to keep history. Bookings with a paid invoice cannot be deleted.',
    confirmLabel: 'Delete',
    destructive: true,
    onConfirm: async () => { if (await salon.deleteBooking(b.id)) toast.success('Booking deleted'); },
  });

  const noSetup = salon.staff.length === 0 || salon.chairs.length === 0;

  return (
    <AdminLayout
      title="Bookings"
      actions={
        <>
          <Button onClick={() => openForm('create')}><Plus className="w-4 h-4 mr-2" />New booking</Button>
          <Button variant="outline" onClick={() => openForm('walkin')}><Zap className="w-4 h-4 mr-2" />Walk-in</Button>
        </>
      }
    >
      {noSetup && (
        <div className="mb-4 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          Before taking bookings, add at least one{' '}
          {salon.staff.length === 0 && <Link to="/admin/staff" className="font-medium text-primary underline">staff member</Link>}
          {salon.staff.length === 0 && salon.chairs.length === 0 && ' and one '}
          {salon.chairs.length === 0 && <Link to="/admin/chairs" className="font-medium text-primary underline">chair</Link>}.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="inline-flex rounded-lg border bg-muted p-0.5 text-sm font-medium" role="tablist" aria-label="Date range">
          {RANGES.map(r => (
            <button
              key={r.key}
              role="tab"
              aria-selected={range === r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 rounded-md transition-colors ${range === r.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Customer, phone, booking # or invoice #" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as 'all' | BookingStatus)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {BOOKING_STATUSES.map(s => <SelectItem key={s} value={s}>{s === 'started' ? 'In progress' : capitalize(s)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={staffFilter} onValueChange={setStaffFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All staff</SelectItem>
            {salon.staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button asChild variant="ghost" size="sm"><Link to="/admin/schedule"><CalendarClock className="w-4 h-4 mr-1.5" />Schedule view</Link></Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarHeart}
          title={salon.bookings.length === 0 ? 'No bookings yet' : 'No bookings match'}
          description={salon.bookings.length === 0 ? 'Create a booking, or convert an online request from the Requests page.' : 'Try another date range or clear the filters.'}
          action={salon.bookings.length === 0 && <Button onClick={() => openForm('create')}><Plus className="w-4 h-4 mr-2" />New booking</Button>}
        />
      ) : (
        <div className="bg-card rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">When</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Services</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Staff · Chair</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Invoice</th>
                  <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {paged.pageItems.map(b => {
                  const customer = salon.getCustomerById(b.customerId);
                  const invoice = salon.getInvoiceByBookingId(b.id);
                  return (
                    <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors align-top">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium">{formatDate(b.startTime)}</div>
                        <div className="text-xs text-muted-foreground tabular-nums">{formatTime(b.startTime)} – {formatTime(b.endTime)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{customer?.name ?? 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{customer?.phone}</div>
                      </td>
                      <td className="px-4 py-3 max-w-[16rem]">
                        <div className="truncate" title={itemsLabel(b)}>{itemsLabel(b)}</div>
                        {b.notes && <div className="text-xs text-muted-foreground truncate" title={b.notes}>“{b.notes}”</div>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>{salon.getStaffById(b.staffId)?.name ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">{salon.getChairById(b.chairId)?.name ?? '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap">{formatPKR(b.totalPrice)}</td>
                      <td className="px-4 py-3">
                        <Select value={b.status} onValueChange={v => changeStatus(b, v as BookingStatus)}>
                          <SelectTrigger className="h-8 text-xs w-32" aria-label="Change status"><StatusBadge status={b.status} /></SelectTrigger>
                          <SelectContent>
                            {BOOKING_STATUSES.map(s => <SelectItem key={s} value={s}>{s === 'started' ? 'In progress' : capitalize(s)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {invoice ? (
                          <Link to={`/admin/invoices?q=${encodeURIComponent(invoice.invoiceNumber)}`} className="inline-flex flex-col gap-1 hover:opacity-80">
                            <StatusBadge status={invoice.status} />
                            <span className="font-mono text-[11px] text-muted-foreground">{invoice.invoiceNumber}</span>
                          </Link>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm('edit', b)} aria-label="Edit booking">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {canManage && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(b)} aria-label="Delete booking">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
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

      <BookingFormDialog
        open={formMode !== null}
        onOpenChange={o => { if (!o) setFormMode(null); }}
        mode={formMode ?? 'create'}
        booking={editing}
      />
      {confirmDialog}
    </AdminLayout>
  );
};

export default BookingsPage;
