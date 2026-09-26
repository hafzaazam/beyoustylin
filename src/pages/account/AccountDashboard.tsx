import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Inbox, FileText, Heart, Sparkles, ArrowRight, TrendingUp, CalendarPlus, Scissors, Crown, UserRound } from 'lucide-react';
import CustomerLayout from '@/components/layout/CustomerLayout';
import { Button } from '@/components/ui/button';
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

/** "ayesha khan" / "AYESHA" → "Ayesha Khan". */
const titleCase = (s: string) =>
  s.trim().toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());

/** Profile name first; the email only as a last resort, never shown lower-case. */
const displayName = (fullName: string | null | undefined, email: string | undefined) => {
  const fromProfile = fullName?.trim();
  if (fromProfile) return titleCase(fromProfile);
  const local = email?.split('@')[0]?.replace(/[._\d]+/g, ' ').trim();
  return local ? titleCase(local) : '';
};

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
            date: d.toLocaleDateString('en-PK', { weekday: 'long', month: 'long', day: 'numeric' }),
            time: d.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' }),
            label: next.deal_id ? 'Package' : 'Appointment',
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
        fullName: displayName(profileRes.data?.full_name, user.email),
        nextAppointment,
      });
      setLoading(false);
    })();
  }, [user]);

  const firstName = stats.fullName.split(' ')[0];
  const isNew = !loading && stats.pastVisits === 0 && stats.upcoming === 0;
  const title = loading
    ? 'Welcome'
    : `${isNew ? 'Welcome' : 'Welcome back'}${firstName ? `, ${firstName}` : ''}`;

  // Only show counts that mean something; a row of zeros tells a new customer nothing.
  const tiles = [
    { label: 'Upcoming', value: stats.upcoming, icon: CalendarCheck, to: '/account/appointments' },
    { label: 'Past visits', value: stats.pastVisits, icon: TrendingUp, to: '/account/appointments' },
    { label: 'Open requests', value: stats.pendingRequests, icon: Inbox, to: '/account/requests' },
    { label: 'Favorites', value: stats.favorites, icon: Heart, to: '/account/favorites' },
  ].filter(t => t.value > 0);

  return (
    <CustomerLayout title={title} subtitle="Overview">
      <div className="grid gap-5 lg:grid-cols-3 mb-6">
        {/* Next visit, or the invitation to make one */}
        <section className="surface-panel lg:col-span-2 p-6 md:p-8 flex flex-col">
          {loading ? (
            <div className="space-y-3" aria-busy="true" aria-label="Loading">
              <div className="h-4 w-28 rounded bg-muted animate-pulse" />
              <div className="h-9 w-2/3 rounded bg-muted animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-muted animate-pulse" />
            </div>
          ) : stats.nextAppointment ? (
            <>
              <p className="text-sm font-medium text-muted-foreground">Your next visit</p>
              <p className="font-heading text-3xl md:text-4xl font-semibold tracking-tight mt-2">{stats.nextAppointment.date}</p>
              <p className="text-muted-foreground mt-1">{stats.nextAppointment.time} · {stats.nextAppointment.label}</p>
              <div className="flex flex-wrap gap-3 mt-auto pt-6">
                <Button asChild><Link to="/account/appointments">View details</Link></Button>
                <Button asChild variant="outline"><Link to="/#book">Book another visit</Link></Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-muted-foreground">{isNew ? 'Your first visit' : 'Nothing booked yet'}</p>
              <p className="font-heading text-3xl md:text-4xl font-semibold tracking-tight mt-2 max-w-lg">
                {isNew ? 'Let’s plan your first appointment.' : 'Ready for your next appointment?'}
              </p>
              <p className="text-muted-foreground mt-2 max-w-lg">
                Pick a service or a bridal package and a time that suits you. The team confirms every booking personally.
              </p>
              <div className="flex flex-wrap gap-3 mt-auto pt-6">
                <Button asChild><Link to="/#book"><CalendarPlus className="w-4 h-4" /> Book an appointment</Link></Button>
                <Button asChild variant="outline"><Link to="/services">Browse services</Link></Button>
              </div>
            </>
          )}
        </section>

        {/* Rewards: a balance once there is one, otherwise how it works */}
        <section className="surface-panel p-6 md:p-8 flex flex-col">
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary" /> Glow Rewards
          </p>
          {!loading && stats.loyaltyPoints > 0 ? (
            <>
              <p className="font-heading text-5xl font-semibold leading-none tabular-nums mt-4">
                {stats.loyaltyPoints}<span className="text-lg font-normal text-muted-foreground ml-2">points</span>
              </p>
              <p className="text-sm text-muted-foreground mt-3">You earn 10 points for every completed visit. Ask at the front desk to redeem them.</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Earn 10 points for every completed visit and redeem them at the salon for treats and upgrades. Your balance appears here after your first visit.
            </p>
          )}
        </section>
      </div>

      {tiles.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {tiles.map(t => (
            <Link key={t.label} to={t.to} className="stat-card !p-5 flex flex-col gap-2 group">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{t.label}</p>
                <t.icon className="w-4 h-4 text-primary" />
              </div>
              <p className="font-heading text-3xl font-semibold tabular-nums leading-none">{t.value}</p>
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        {!loading && stats.totalSpent > 0 && (
          <section className="surface-panel p-6">
            <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="w-4 h-4 text-primary" /> Total paid
            </p>
            <p className="font-heading text-3xl font-semibold tabular-nums mt-3">{formatPKR(stats.totalSpent)}</p>
            <Link to="/account/invoices" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              View invoices <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </section>
        )}
        <section className="surface-panel p-6">
          <p className="text-sm font-medium text-muted-foreground mb-3">Quick links</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { to: '/services', label: 'Services', icon: Scissors },
              { to: '/packages', label: 'Bridal packages', icon: Crown },
              { to: '/account/profile', label: 'Your profile', icon: UserRound },
            ].map(l => (
              <Link
                key={l.to}
                to={l.to}
                className="flex items-center gap-2 min-h-11 rounded-xl border px-3 py-2 text-sm hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <l.icon className="w-4 h-4 text-primary shrink-0" /> {l.label}
              </Link>
            ))}
          </div>
          {!loading && stats.favorites === 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              Tip: tap the heart on any service to save it to your favorites.
            </p>
          )}
        </section>
      </div>
    </CustomerLayout>
  );
};

export default AccountDashboard;
