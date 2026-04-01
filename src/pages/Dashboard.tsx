import AdminLayout from '@/components/layout/AdminLayout';
import { useSalon } from '@/context/SalonContext';
import { CalendarCheck, DollarSign, Users, Armchair, TrendingUp, Clock } from 'lucide-react';

const Dashboard = () => {
  const { bookings, staff, chairs, invoices } = useSalon();

  const today = new Date().toDateString();
  const todayBookings = bookings.filter(b => new Date(b.createdAt).toDateString() === today);
  const activeBookings = bookings.filter(b => ['pending', 'confirmed', 'started'].includes(b.status));
  const completedBookings = bookings.filter(b => b.status === 'completed');

  const dailyRevenue = todayBookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + b.totalPrice, 0);

  const totalRevenue = completedBookings.reduce((sum, b) => sum + b.totalPrice, 0);

  const occupiedChairs = new Set(activeBookings.map(b => b.chairId)).size;

  const stats = [
    { label: "Today's Bookings", value: todayBookings.length, icon: CalendarCheck, color: 'text-primary' },
    { label: 'Active Orders', value: activeBookings.length, icon: Clock, color: 'text-accent' },
     { label: "Today's Revenue", value: `Rs. ${dailyRevenue}`, icon: DollarSign, color: 'text-success' },
     { label: 'Total Revenue', value: `Rs. ${totalRevenue}`, icon: TrendingUp, color: 'text-info' },
    { label: 'Active Staff', value: staff.filter(s => s.status === 'active').length, icon: Users, color: 'text-primary' },
    { label: 'Chairs Available', value: `${chairs.length - occupiedChairs}/${chairs.length}`, icon: Armchair, color: 'text-accent' },
  ];

  // Staff performance
  const staffPerformance = staff.filter(s => s.status === 'active').map(s => {
    const staffBookings = completedBookings.filter(b => b.staffId === s.id);
    const revenue = staffBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    return { ...s, bookingsCount: staffBookings.length, revenue };
  }).sort((a, b) => b.revenue - a.revenue);

  return (
    <AdminLayout title="Dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-8">
        {stats.map(stat => (
          <div key={stat.label} className="stat-card flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-muted ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-2xl font-heading font-bold text-foreground">{stat.value}</p>
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
                  <p className="text-sm font-semibold text-success">${s.revenue}</p>
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
