import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Inbox, FileText, Heart, Sparkles, ArrowRight, TrendingUp } from 'lucide-react';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Stats {
  upcoming: number;
  pastVisits: number;
  pendingRequests: number;
  totalSpent: number;
  loyaltyPoints: number;
  favorites: number;
  fullName: string;
  nextAppointment?: { date: string; time: string; label: string };
}

const AccountDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    upcoming: 0, pastVisits: 0, pendingRequests: 0, totalSpent: 0,
    loyaltyPoints: 0, favorites: 0, fullName: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [profileRes, customerRes, requestsRes, favRes] = await Promise.all([
        supabase.from('profiles').select('full_name, loyalty_points').eq('id', user.id).single(),
        supabase.from('customers').select('id').eq('user_id', user.id).maybeSingle(),
        supabase.from('appointment_requests').select('id, status').eq('user_id', user.id),
        supabase.from('favorites').select('id').eq('user_id', user.id),
      ]);

      let upcoming = 0, pastVisits = 0, totalSpent = 0;
      let nextAppointment: Stats['nextAppointment'];

      if (customerRes.data?.id) {
        const [bookingsRes, invoicesRes] = await Promise.all([
          supabase.from('bookings').select('id, start_time, status, service_ids, deal_id')
            .eq('customer_id', customerRes.data.id)
            .order('start_time', { ascending: true }),
          supabase.from('invoices').select('total_amount').eq('customer_id', customerRes.data.id),
        ]);
        const now = new Date();
        const bookings = bookingsRes.data || [];
        upcoming = bookings.filter(b => new Date(b.start_time) >= now && b.status !== 'canceled' && b.status !== 'completed').length;
        pastVisits = bookings.filter(b => b.status === 'completed').length;
        totalSpent = (invoicesRes.data || []).reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
        const next = bookings.find(b => new Date(b.start_time) >= now && b.status !== 'canceled');
        if (next) {
          const d = new Date(next.start_time);
          nextAppointment = {
            date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            label: next.deal_id ? 'Package booking' : 'Service booking',
          };
        }
      }

      setStats({
        upcoming,
        pastVisits,
        pendingRequests: (requestsRes.data || []).filter(r => r.status === 'pending').length,
        totalSpent,
        loyaltyPoints: profileRes.data?.loyalty_points ?? 0,
        favorites: (favRes.data || []).length,
        fullName: profileRes.data?.full_name || user.email?.split('@')[0] || 'Guest',
        nextAppointment,
      });
      setLoading(false);
    })();
  }, [user]);

  const tiles = [
    { label: 'Upcoming', value: stats.upcoming, icon: CalendarCheck, to: '/account/appointments', tone: 'from-primary/15 to-primary/5' },
    { label: 'Past Visits', value: stats.pastVisits, icon: TrendingUp, to: '/account/appointments', tone: 'from-accent/40 to-accent/10' },
    { label: 'Requests', value: stats.pendingRequests, icon: Inbox, to: '/account/requests', tone: 'from-warning/15 to-warning/5' },
    { label: 'Favorites', value: stats.favorites, icon: Heart, to: '/account/favorites', tone: 'from-primary/15 to-accent/10' },
  ];

  return (
    <CustomerLayout title={`Welcome back, ${stats.fullName.split(' ')[0]}`} subtitle="Overview">
      {/* Loyalty hero */}
      <div
        className="relative overflow-hidden rounded-3xl p-6 md:p-8 mb-8 text-primary-foreground shadow-[0_20px_60px_-25px_hsl(328_85%_55%/0.5)]"
        style={{ background: 'var(--gradient-primary)' }}
      >
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[11px] uppercase tracking-widest font-semibold">Glow Rewards</span>
            </div>
            <p className="font-heading text-4xl md:text-5xl font-bold leading-none">{stats.loyaltyPoints}<span className="text-lg font-medium opacity-80"> pts</span></p>
            <p className="text-sm opacity-90 mt-2 max-w-md">Earn 10 points every completed visit. Redeem at the salon for exclusive perks.</p>
          </div>
          {stats.nextAppointment ? (
            <div className="rounded-2xl bg-white/15 backdrop-blur-md p-5 min-w-[220px] ring-1 ring-white/20">
              <p className="text-[11px] uppercase tracking-widest opacity-80 font-semibold mb-1">Next visit</p>
              <p className="font-heading text-xl font-semibold">{stats.nextAppointment.date}</p>
              <p className="text-sm opacity-90">{stats.nextAppointment.time} · {stats.nextAppointment.label}</p>
              <Link to="/account/appointments" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold hover:underline">
                View details <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <Link
              to="/#book"
              className="rounded-2xl bg-white/15 backdrop-blur-md p-5 min-w-[220px] ring-1 ring-white/20 hover:bg-white/20 transition-colors"
            >
              <p className="text-[11px] uppercase tracking-widest opacity-80 font-semibold mb-1">No upcoming visit</p>
              <p className="font-heading text-lg font-semibold">Book your next glow-up</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold">
                Reserve now <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {tiles.map(t => (
          <Link
            key={t.label}
            to={t.to}
            className={`group relative overflow-hidden rounded-2xl p-5 border border-border/60 bg-gradient-to-br ${t.tone} hover:-translate-y-0.5 hover:shadow-[0_12px_32px_-16px_hsl(328_85%_55%/0.35)] transition-all`}
          >
            <t.icon className="w-5 h-5 text-primary mb-3" />
            <p className="text-3xl font-heading font-bold text-foreground">{loading ? '—' : t.value}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">{t.label}</p>
            <ArrowRight className="w-4 h-4 text-primary absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>

      {/* Total spent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <FileText className="w-4 h-4" />
            <p className="text-xs uppercase tracking-wider font-semibold">Lifetime spend</p>
          </div>
          <p className="font-heading text-3xl font-bold">Rs. {stats.totalSpent.toLocaleString()}</p>
          <Link to="/account/invoices" className="text-xs text-primary font-semibold hover:underline mt-2 inline-flex items-center gap-1">
            View invoices <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-6">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Sparkles className="w-4 h-4" />
            <p className="text-xs uppercase tracking-wider font-semibold">Quick actions</p>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Link to="/services" className="text-sm font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/15 transition-colors">Browse services</Link>
            <Link to="/packages" className="text-sm font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/15 transition-colors">Bridal packages</Link>
            <Link to="/account/profile" className="text-sm font-medium px-3 py-1.5 rounded-full bg-muted text-foreground hover:bg-muted/70 transition-colors">Update profile</Link>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default AccountDashboard;
