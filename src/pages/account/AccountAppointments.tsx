import { useEffect, useState } from 'react';
import { CalendarCheck, Clock, MapPin } from 'lucide-react';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSalon } from '@/context/SalonContext';

interface BookingRow {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  service_ids: string[];
  deal_id: string | null;
  total_price: number;
  staff_id: string;
  chair_id: string;
}

const statusClass: Record<string, string> = {
  pending: 'bg-warning/10 text-warning ring-warning/30',
  confirmed: 'bg-info/10 text-info ring-info/30',
  started: 'bg-primary/10 text-primary ring-primary/30',
  completed: 'bg-success/10 text-success ring-success/30',
  canceled: 'bg-destructive/10 text-destructive ring-destructive/30',
};

const AccountAppointments = () => {
  const { user } = useAuth();
  const { services, deals, staff } = useSalon();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: cust } = await supabase.from('customers').select('id').eq('user_id', user.id).maybeSingle();
      if (!cust) { setLoading(false); return; }
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', cust.id)
        .order('start_time', { ascending: false });
      setBookings((data || []) as BookingRow[]);
      setLoading(false);
    })();
  }, [user]);

  const now = new Date();
  const upcoming = bookings.filter(b => new Date(b.start_time) >= now && b.status !== 'canceled' && b.status !== 'completed');
  const past = bookings.filter(b => !(new Date(b.start_time) >= now && b.status !== 'canceled' && b.status !== 'completed'));

  const nameFor = (b: BookingRow) => {
    if (b.deal_id) return deals.find(d => d.id === b.deal_id)?.name || 'Package';
    const names = (b.service_ids || []).map(id => services.find(s => s.id === id)?.name).filter(Boolean);
    return names.join(', ') || 'Service';
  };

  const Card = ({ b }: { b: BookingRow }) => {
    const start = new Date(b.start_time);
    const end = new Date(b.end_time);
    const stylist = staff.find(s => s.id === b.staff_id);
    return (
      <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 hover:shadow-[0_12px_30px_-16px_hsl(328_85%_55%/0.3)] transition-all">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="font-heading text-lg font-semibold">{nameFor(b)}</h3>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">with {stylist?.name || 'Salon team'}</p>
          </div>
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full ring-1 ring-inset ${statusClass[b.status] || ''}`}>{b.status}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarCheck className="w-4 h-4 text-primary" />
            {start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 text-primary" />
            {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} – {end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
          <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> BeYou Stylin Salon</span>
          <span className="font-heading text-lg font-bold text-primary">Rs. {Number(b.total_price).toLocaleString()}</span>
        </div>
      </div>
    );
  };

  return (
    <CustomerLayout title="My Appointments" subtitle="Bookings">
      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : bookings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-card/50">
          <CalendarCheck className="w-10 h-10 text-primary mx-auto mb-3" />
          <p className="font-heading text-xl font-semibold mb-1">No appointments yet</p>
          <p className="text-sm text-muted-foreground">Book from the landing page and your visits will show up here.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-widest font-bold text-primary mb-3">Upcoming ({upcoming.length})</h3>
              <div className="grid md:grid-cols-2 gap-4">{upcoming.map(b => <Card key={b.id} b={b} />)}</div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h3 className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-3">Past ({past.length})</h3>
              <div className="grid md:grid-cols-2 gap-4">{past.map(b => <Card key={b.id} b={b} />)}</div>
            </section>
          )}
        </div>
      )}
    </CustomerLayout>
  );
};

export default AccountAppointments;
