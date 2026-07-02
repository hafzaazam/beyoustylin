import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useSalon } from '@/context/SalonContext';
import { CalendarCheck, DollarSign, Users, Armchair, TrendingUp, Clock, Trophy } from 'lucide-react';

const Dashboard = () => {
  const { bookings, staff, chairs, invoices } = useSalon();

  const now = new Date();
  const today = now.toDateString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Bookings scheduled today (by appointment start time)
  const todayBookings = bookings.filter(b => new Date(b.startTime).toDateString() === today);

  // Active live orders = walk-ins / in-progress work happening right now
  const activeLiveOrders = bookings.filter(b => b.status === 'started');
  const upcomingToday = todayBookings.filter(b => ['pending', 'confirmed'].includes(b.status));

  const completedBookings = bookings.filter(b => b.status === 'completed');

  // Revenue from paid invoices (falls back to unpaid totals if none paid yet)
  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const revenueSource = paidInvoices.length > 0 ? paidInvoices : invoices;

  const dailyRevenue = revenueSource
    .filter(i => new Date(i.createdAt).toDateString() === today)
    .reduce((sum, i) => sum + i.totalAmount, 0);

  const monthlyRevenue = revenueSource
    .filter(i => new Date(i.createdAt) >= startOfMonth)
    .reduce((sum, i) => sum + i.totalAmount, 0);

  const activeBookings = bookings.filter(b => ['pending', 'confirmed', 'started'].includes(b.status));
  const occupiedChairs = new Set(activeBookings.map(b => b.chairId)).size;

  const fmt = (n: number) => `Rs. ${n.toLocaleString()}`;

  const stats = [
    { label: "Today's Bookings", value: todayBookings.length, sub: `${upcomingToday.length} upcoming`, icon: CalendarCheck, color: 'text-primary' },
    { label: 'Active Live Orders', value: activeLiveOrders.length, sub: 'currently in progress', icon: Clock, color: 'text-accent' },
    { label: "Today's Revenue", value: fmt(dailyRevenue), sub: `${revenueSource.filter(i => new Date(i.createdAt).toDateString() === today).length} invoices`, icon: DollarSign, color: 'text-success' },
    { label: 'Monthly Revenue', value: fmt(monthlyRevenue), sub: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }), icon: TrendingUp, color: 'text-info' },
    { label: 'Active Staff', value: staff.filter(s => s.status === 'active').length, sub: `of ${staff.length} total`, icon: Users, color: 'text-primary' },
    { label: 'Chairs Available', value: `${chairs.length - occupiedChairs}/${chairs.length}`, sub: `${occupiedChairs} in use`, icon: Armchair, color: 'text-accent' },
  ];

  // Staff performance — filterable by today vs this month
  const [perfRange, setPerfRange] = useState<'today' | 'month'>('today');
  const rangeStart = perfRange === 'today'
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
    : startOfMonth;

  const staffPerformance = staff.filter(s => s.status === 'active').map(s => {
    const staffBookings = completedBookings.filter(b =>
      b.staffId === s.id && new Date(b.endTime) >= rangeStart
    );
    const revenue = staffBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const minutes = staffBookings.reduce((sum, b) => sum + (b.totalDuration || 0), 0);
    return { ...s, bookingsCount: staffBookings.length, revenue, minutes };
  }).sort((a, b) => b.bookingsCount - a.bookingsCount || b.minutes - a.minutes);

  const topStaff = staffPerformance.filter(s => s.bookingsCount > 0).slice(0, 5);
  const fmtHours = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return h > 0 ? `${h}h ${min}m` : `${min}m`;
  };

  return (
    <AdminLayout title="Dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className="stat-card flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-muted ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-heading font-bold text-foreground truncate">{stat.value}</p>
              {stat.sub && <p className="text-xs text-muted-foreground mt-0.5">{stat.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="bg-card rounded-xl border p-6">
          <h3 className="font-heading text-lg font-semibold text-card-foreground mb-4">Recent Bookings</h3>
          {bookings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No bookings yet. Create your first booking!</p>
          ) : (
            <div className="space-y-3">
              {bookings.slice(-5).reverse().map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">Booking #{b.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(b.startTime).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">Rs. {b.totalPrice}</p>
                    <span className={`status-badge status-${b.status}`}>
                      {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staff Performance */}
        <div className="bg-card rounded-xl border p-6">
          <h3 className="font-heading text-lg font-semibold text-card-foreground mb-4">Staff Performance</h3>
          {staffPerformance.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {staffPerformance.map((s, idx) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.role} · {s.bookingsCount} bookings</p>
                  </div>
                  <p className="text-sm font-semibold text-success">Rs. {s.revenue}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
