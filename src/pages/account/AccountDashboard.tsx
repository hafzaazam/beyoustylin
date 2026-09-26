import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Inbox, FileText, Heart, Sparkles, ArrowRight, TrendingUp } from 'lucide-react';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatPKR } from '@/lib/format';

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
          // Only money actually paid counts as spend (not unpaid or void invoices).
          supabase.from('invoices').select('total_amount').eq('customer_id', customerRes.data.id).eq('status', 'paid'),
        ]);
        const now = new Date();
        const bookings = bookingsRes.data || [];
        upcoming = bookings.filter(b => new Date(b.start_time) >= now && b.status !== 'canceled' && b.status !== 'completed').length;
        pastVisits = bookings.filter(b => b.status === 'completed').length;
        totalSpent = (invoicesRes.data || []).reduce((s, i) => s + Number(i.total_amount || 0), 0);
        const next = bookings.find(b => new Date(b.start_time) >= now && b.status !== 'canceled' && b.status !== 'completed');
        if (next) {
          const d = new Date(next.start_time);
          nextAppointment = {
            date: d.toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' }),
            time: d.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' }),
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
    { label: 'Upcoming', value: stats.upcoming, icon: CalendarCheck, to: '/account/appointments' },
    { label: 'Past Visits', value: stats.pastVisits, icon: TrendingUp, to: '/account/appointments' },
    { label: 'Requests', value: stats.pendingRequests, icon: Inbox, to: '/account/requests' },
    { label: 'Favorites', value: stats.favorites, icon: Heart, to: '/account/favorites' },
  ];

  return (
    <CustomerLayout title={loading ? 'Welcome back' : `Welcome back, ${stats.fullName.split(' ')[0]}`} subtitle="Overview">
      {/* Loyalty band */}
      <div className="grid md:grid-cols-3 border-t border-l border-border/60 mb-10">
        <div className="p-8 md:p-10 border-r border-b border-border/60 md:col-span-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-4 font-medium">
            <Sparkles className="w-3 h-3" strokeWidth={1.25} /> Glow Rewards
          </div>
          <p className="font-heading text-6xl md:text-7xl font-light leading-none tabular-nums">
            {loading ? '—' : stats.loyaltyPoints}<span className="text-lg opacity-60 ml-2">pts</span>
          </p>
          <p className="text-sm text-muted-foreground mt-4 max-w-md font-light leading-relaxed">
            Earn 10 points every completed visit. Redeem at the salon for exclusive perks.
          </p>
        </div>
        {stats.nextAppointment ? (
          <div className="p-8 border-r border-b border-border/60 bg-muted/30 flex flex-col">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3 font-medium">Next visit</p>
            <p className="font-heading text-2xl font-light tracking-tight mb-1">{stats.nextAppointment.date}</p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-auto">
              {stats.nextAppointment.time} · {stats.nextAppointment.label}
            </p>
            <Link to="/account/appointments" className="mt-6 text-[10px] uppercase tracking-[0.2em] text-primary/90 hover:text-primary inline-flex items-center gap-2">
              View details <ArrowRight className="w-3 h-3" strokeWidth={1.25} />
            </Link>
          </div>
        ) : (
          <Link to="/#book" className="p-8 border-r border-b border-border/60 hover:bg-muted/30 transition-colors flex flex-col">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3 font-medium">No upcoming visit</p>
            <p className="font-heading text-2xl font-light tracking-tight mb-auto">Book your next glow-up.</p>
            <span className="mt-6 text-[10px] uppercase tracking-[0.2em] text-primary/90 inline-flex items-center gap-2">
              Reserve now <ArrowRight className="w-3 h-3" strokeWidth={1.25} />
            </span>
          </Link>
        )}
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-l border-border/60 mb-10">
        {tiles.map(t => (
          <Link
            key={t.label}
            to={t.to}
            className="group relative p-6 border-r border-b border-border/60 hover:bg-muted/30 transition-colors"
          >
            <t.icon className="w-4 h-4 text-primary/80 mb-6" strokeWidth={1.25} />
            <p className="font-heading text-4xl font-light tabular-nums text-foreground">{loading ? '—' : t.value}</p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-2">{t.label}</p>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={1.25} />
          </Link>
        ))}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 border-t border-l border-border/60">
        <div className="p-8 border-r border-b border-border/60">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-4 font-medium">
            <FileText className="w-3 h-3" strokeWidth={1.25} /> Lifetime spend
          </div>
          <p className="font-heading text-4xl font-light tabular-nums">{loading ? '—' : formatPKR(stats.totalSpent)}</p>
          <Link to="/account/invoices" className="text-[10px] uppercase tracking-[0.2em] text-primary/90 mt-4 inline-flex items-center gap-2">
            View invoices <ArrowRight className="w-3 h-3" strokeWidth={1.25} />
          </Link>
        </div>
        <div className="p-8 border-r border-b border-border/60">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary/80 mb-4 font-medium">
            <Sparkles className="w-3 h-3" strokeWidth={1.25} /> Quick actions
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/services" className="text-[10px] uppercase tracking-[0.2em] px-3 py-2 border border-border/60 hover:border-primary/60 hover:text-primary transition-colors">Browse services</Link>
            <Link to="/packages" className="text-[10px] uppercase tracking-[0.2em] px-3 py-2 border border-border/60 hover:border-primary/60 hover:text-primary transition-colors">Bridal packages</Link>
            <Link to="/account/profile" className="text-[10px] uppercase tracking-[0.2em] px-3 py-2 border border-border/60 hover:border-primary/60 hover:text-primary transition-colors">Update profile</Link>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default AccountDashboard;
