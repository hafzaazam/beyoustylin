import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Search, X, Trash2, Inbox, Phone, Mail, Calendar, Clock, Wallet, CalendarPlus, MessageCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import BookingFormDialog, { BookingPrefill } from '@/components/admin/BookingFormDialog';
import { useConfirm } from '@/components/ConfirmDialog';
import EmptyState from '@/components/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSalon } from '@/context/SalonContext';
import { useAuth } from '@/hooks/useAuth';
import { AppointmentRequest, AppointmentRequestStatus } from '@/types/salon';
import { formatDateTime } from '@/lib/format';
import { normalizePhone } from '@/lib/booking';

type Filter = 'all' | AppointmentRequestStatus;
const FILTERS: Filter[] = ['pending', 'approved', 'dismissed', 'withdrawn', 'all'];

/** wa.me link for Pakistani mobile numbers (0300… → 92300…). */
const whatsappLink = (phone: string) => {
  const digits = normalizePhone(phone);
  const intl = digits.startsWith('0') ? `92${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}`;
};

const RequestsPage = () => {
  const salon = useSalon();
  const { canManage } = useAuth();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('pending');
  const [converting, setConverting] = useState<AppointmentRequest | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return salon.appointmentRequests.filter(r => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.phone.includes(q) || (r.email || '').toLowerCase().includes(q);
    });
  }, [salon.appointmentRequests, search, filter]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: salon.appointmentRequests.length, pending: 0, approved: 0, dismissed: 0, withdrawn: 0 };
    salon.appointmentRequests.forEach(r => { c[r.status] += 1; });
    return c;
  }, [salon.appointmentRequests]);

  const labelForItem = (r: AppointmentRequest) => {
    if (r.dealId) return salon.getDealById(r.dealId)?.name || 'Package';
    if (r.serviceId) return salon.getServiceById(r.serviceId)?.name || 'Service';
    return 'General inquiry';
  };

  const prefillFor = (r: AppointmentRequest): BookingPrefill => {
    const date = r.preferredDate ?? r.eventDate;
    return {
      newCustomer: { name: r.name, phone: r.phone, email: r.email },
      startLocal: date ? `${date}T${r.preferredTime ?? '12:00'}` : undefined,
      serviceIds: r.serviceId ? [r.serviceId] : [],
      dealId: r.dealId,
      notes: [r.notes, r.budget && `Budget: ${r.budget}`].filter(Boolean).join('\n'),
    };
  };

  const setStatus = async (r: AppointmentRequest, status: AppointmentRequestStatus, message: string) => {
    if (await salon.updateAppointmentRequestStatus(r.id, status)) toast.success(message);
  };

  const remove = (r: AppointmentRequest) => confirm({
    title: `Delete the request from ${r.name}?`,
    description: 'This cannot be undone. Dismiss it instead to keep a record.',
    confirmLabel: 'Delete',
    destructive: true,
    onConfirm: async () => { if (await salon.deleteAppointmentRequest(r.id)) toast.success('Request deleted'); },
  });

  return (
    <AdminLayout title="Appointment requests">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map(key => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
                  filter === key ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {key} <span className="opacity-70">({counts[key]})</span>
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search name, phone, email" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={filter === 'pending' ? 'No pending requests' : 'No requests here'}
            description="Booking and quote requests submitted on the website appear here."
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filtered.map(r => {
              const booking = r.bookingId ? salon.getBookingById(r.bookingId) : undefined;
              const knownCustomer = salon.findCustomerByPhone(r.phone);
              return (
                <div key={r.id} className="p-5 rounded-2xl border border-border bg-card flex flex-col">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <span className={`inline-block mb-1 text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full font-semibold border ${
                        r.type === 'quote' ? 'bg-accent text-accent-foreground border-border' : 'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        {r.type === 'quote' ? 'Quote' : 'Booking'}
                      </span>
                      <h3 className="font-heading text-lg font-semibold truncate">{r.name}</h3>
                      <p className="text-sm text-primary font-medium">{labelForItem(r)}</p>
                      {knownCustomer && <p className="text-xs text-muted-foreground mt-0.5">Returning customer ({knownCustomer.name})</p>}
                    </div>
                    <StatusBadge status={r.status} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground mb-4">
                    <a href={`tel:${r.phone}`} className="flex items-center gap-2 hover:text-foreground"><Phone className="w-3.5 h-3.5" /> {r.phone}</a>
                    {r.email && <a href={`mailto:${r.email}`} className="flex items-center gap-2 truncate hover:text-foreground"><Mail className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{r.email}</span></a>}
                    {r.type !== 'quote' ? (
                      <>
                        {r.preferredDate && <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> {r.preferredDate}</div>}
                        {r.preferredTime && <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> {r.preferredTime}</div>}
                      </>
                    ) : (
                      <>
                        {r.eventDate && <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Event: {r.eventDate}</div>}
                        {r.budget && <div className="flex items-center gap-2 truncate"><Wallet className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{r.budget}</span></div>}
                      </>
                    )}
                  </div>

                  {r.notes && (
                    <p className="text-sm bg-muted/50 rounded-lg p-3 mb-4 border border-border/60 whitespace-pre-wrap">{r.notes}</p>
                  )}

                  {booking && (
                    <Link to="/admin/bookings" className="mb-4 flex items-center gap-2 text-sm text-success hover:underline">
                      <CheckCircle2 className="w-4 h-4" /> Booked for {formatDateTime(booking.startTime)}
                    </Link>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2 justify-between items-center pt-3 border-t border-border">
                    <span className="text-xs text-muted-foreground">Submitted {formatDateTime(r.createdAt)}</span>
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="ghost" asChild>
                        <a href={whatsappLink(r.phone)} target="_blank" rel="noopener noreferrer" aria-label="Message on WhatsApp"><MessageCircle className="w-4 h-4" /></a>
                      </Button>
                      {r.status === 'pending' && (
                        <>
                          <Button size="sm" onClick={() => setConverting(r)}><CalendarPlus className="w-4 h-4 mr-1" /> Book it</Button>
                          <Button size="sm" variant="outline" onClick={() => setStatus(r, 'approved', 'Marked as handled')} title="Mark handled without creating a booking">
                            Handled
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setStatus(r, 'dismissed', 'Request dismissed')}><X className="w-4 h-4" /> Dismiss</Button>
                        </>
                      )}
                      {(r.status === 'dismissed' || (r.status === 'approved' && !r.bookingId)) && (
                        <Button size="sm" variant="ghost" onClick={() => setStatus(r, 'pending', 'Moved back to pending')}><RotateCcw className="w-4 h-4 mr-1" /> Reopen</Button>
                      )}
                      {canManage && (
                        <Button size="sm" variant="ghost" onClick={() => remove(r)} aria-label="Delete request"><Trash2 className="w-4 h-4" /></Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BookingFormDialog
        open={!!converting}
        onOpenChange={o => { if (!o) setConverting(null); }}
        mode="create"
        prefill={converting ? prefillFor(converting) : undefined}
        title={converting ? `Book ${converting.name}` : undefined}
        description="Prefilled from the online request. Pick staff and a chair, check the time, and save."
        onSaved={async booking => {
          if (converting) await salon.markRequestConverted(converting.id, booking.id);
        }}
      />
      {confirmDialog}
    </AdminLayout>
  );
};

export default RequestsPage;
