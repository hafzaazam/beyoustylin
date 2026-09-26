import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Armchair, CalendarCheck, Clock, Info, UserRound, XCircle } from 'lucide-react';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/hooks/useAuth';
import { useSalon } from '@/context/SalonContext';
import { useConfirm } from '@/components/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { friendlyError } from '@/lib/errors';
import { formatDuration, formatPKR, formatTime } from '@/lib/format';
import { Deal, Service } from '@/types/salon';

type BookingRow = Database['public']['Functions']['my_bookings']['Returns'][number];

const CANCEL_CUTOFF_MS = 2 * 60 * 60 * 1000;

const isUpcoming = (b: BookingRow, now: number) =>
  new Date(b.start_time).getTime() >= now && b.status !== 'canceled' && b.status !== 'completed';

const nameFor = (b: BookingRow, services: Service[], deals: Deal[]) => {
  if (b.deal_id) return deals.find(d => d.id === b.deal_id)?.name || 'Package';
  const names = (b.service_ids || []).map(id => services.find(s => s.id === id)?.name).filter(Boolean);
  return names.join(', ') || 'Service';
};

interface CardProps {
  b: BookingRow;
  label: string;
  onCancel?: () => void;
  cancelBlockedReason?: string;
}

const AppointmentCard = ({ b, label, onCancel, cancelBlockedReason }: CardProps) => {
  const start = new Date(b.start_time);
  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 hover:shadow-[0_12px_30px_-16px_hsl(328_85%_55%/0.3)] transition-all flex flex-col">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0">
          <h3 className="font-heading text-lg font-semibold">{label}</h3>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5 flex items-center gap-1.5">
            <UserRound className="w-3 h-3" /> with {b.staff_name || 'our team'}
          </p>
        </div>
        <StatusBadge status={b.status} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarCheck className="w-4 h-4 text-primary shrink-0" />
          {start.toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          {formatTime(b.start_time)} – {formatTime(b.end_time)}
        </div>
        {b.chair_name && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Armchair className="w-4 h-4 text-primary shrink-0" /> {b.chair_name}
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4 text-transparent shrink-0" /> {formatDuration(b.total_duration)}
        </div>
      </div>
      {b.notes && <p className="text-sm text-muted-foreground italic mt-3">"{b.notes}"</p>}
      <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
        <span className="font-heading text-lg font-bold text-primary">{formatPKR(Number(b.total_price))}</span>
        {onCancel && (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={onCancel}>
            <XCircle className="w-4 h-4 mr-1" /> Cancel
          </Button>
        )}
        {cancelBlockedReason && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="w-3.5 h-3.5" /> {cancelBlockedReason}
          </span>
        )}
      </div>
    </div>
  );
};

const CardSkeleton = () => <div className="h-44 rounded-2xl bg-muted animate-pulse" />;

const AccountAppointments = () => {
  const { user } = useAuth();
  const { services, deals } = useSalon();
  const { confirm, dialog } = useConfirm();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('my_bookings');
    if (error) toast.error(friendlyError(error));
    setBookings(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (user) load(); }, [user, load]);

  const now = Date.now();
  const upcoming = bookings.filter(b => isUpcoming(b, now)).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const past = bookings.filter(b => !isUpcoming(b, now));

  const cancel = (b: BookingRow) => confirm({
    title: 'Cancel this appointment?',
    description: `${nameFor(b, services, deals)} on ${new Date(b.start_time).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}. This can't be undone online.`,
    confirmLabel: 'Cancel appointment',
    destructive: true,
    onConfirm: async () => {
      const { error } = await supabase.rpc('cancel_my_booking', { _booking_id: b.id });
      if (error) { toast.error(friendlyError(error)); return; }
      toast.success('Your appointment was canceled.');
      await load();
    },
  });

  const cancelProps = (b: BookingRow): Pick<CardProps, 'onCancel' | 'cancelBlockedReason'> => {
    if (b.status !== 'pending' && b.status !== 'confirmed') return {};
    if (new Date(b.start_time).getTime() - now < CANCEL_CUTOFF_MS) {
      return { cancelBlockedReason: 'Within 2 hours — please call the salon to change' };
    }
    return { onCancel: () => cancel(b) };
  };

  return (
    <CustomerLayout title="My Appointments" subtitle="Bookings">
      {loading ? (
        <div className="grid md:grid-cols-2 gap-4" aria-busy="true" aria-label="Loading appointments">
          <CardSkeleton /><CardSkeleton />
        </div>
      ) : bookings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-card/50">
          <CalendarCheck className="w-10 h-10 text-primary mx-auto mb-3" />
          <p className="font-heading text-xl font-semibold mb-1">No appointments yet</p>
          <p className="text-sm text-muted-foreground mb-5">
            Request a booking and your confirmed visits will show up here.
          </p>
          <Link to="/#book"><Button>Book an appointment</Button></Link>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-widest font-bold text-primary mb-3">Upcoming ({upcoming.length})</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {upcoming.map(b => <AppointmentCard key={b.id} b={b} label={nameFor(b, services, deals)} {...cancelProps(b)} />)}
              </div>
              <p className="text-xs text-muted-foreground mt-3">You can cancel online up to 2 hours before your appointment.</p>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-3">Past & canceled ({past.length})</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {past.map(b => <AppointmentCard key={b.id} b={b} label={nameFor(b, services, deals)} />)}
              </div>
            </section>
          )}
        </div>
      )}
      {dialog}
    </CustomerLayout>
  );
};

export default AccountAppointments;
