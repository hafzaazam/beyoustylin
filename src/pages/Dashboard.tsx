import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  CalendarCheck, Wallet, Users, Armchair, TrendingUp, Clock, Trophy, Download, MailOpen, ArrowRight, AlertCircle, PackageX,
} from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useSalon } from '@/context/SalonContext';
import { ACTIVE_BOOKING_STATUSES, Booking, amountDue } from '@/types/salon';
import { byDay, collectedLines, presetRange, summarize } from '@/lib/revenue';
import { formatDateTime, formatDuration, formatPKR, formatTime, toLocalDateKey } from '@/lib/format';
import { downloadCsv, toCsv } from '@/lib/csv';

const DAY = 86_400_000;

const Dashboard = () => {
  const { bookings, staff, chairs, invoices, sales, products, services, deals, appointmentRequests, getCustomerById, getStaffById, getChairById, getDealById, getServiceById } = useSalon();
  const [perfRange, setPerfRange] = useState<'today' | 'month'>('today');

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const nowTs = now.getTime();

  const itemsLabel = (b: Booking) =>
    b.dealId ? getDealById(b.dealId)?.name ?? 'Package'
      : b.serviceIds.map(id => getServiceById(id)?.name).filter(Boolean).join(', ');

  // Revenue = money actually collected: paid invoices (minus gift-voucher cover),
  // retail sales and gift vouchers sold — see src/lib/revenue.ts.
  const todayKey = toLocalDateKey(now);
  const { today, month } = useMemo(() => ({
    today: summarize(collectedLines(invoices, sales, presetRange('today'))),
    month: summarize(collectedLines(invoices, sales, presetRange('thisMonth'))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [invoices, sales, todayKey]);
  const unpaid = invoices.filter(i => i.status === 'unpaid');
  const outstanding = unpaid.reduce((s, i) => s + amountDue(i), 0);
  const lowStock = products.filter(p => p.status === 'active' && p.stock <= p.lowStockAt);
  const collectedSub = (s: typeof today) => {
    const parts = [
      s.services > 0 && `services ${formatPKR(s.services)}`,
      s.products > 0 && `products ${formatPKR(s.products)}`,
      s.vouchersSold > 0 && `vouchers ${formatPKR(s.vouchersSold)}`,
    ].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'services, products & vouchers';
  };

  const todayBookings = bookings
    .filter(b => new Date(b.startTime) >= startOfToday && new Date(b.startTime).getTime() < startOfToday.getTime() + DAY && b.status !== 'canceled')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const inProgress = bookings.filter(b => b.status === 'started');
  const upcomingToday = todayBookings.filter(b => ['pending', 'confirmed'].includes(b.status) && new Date(b.endTime).getTime() > nowTs);

  // A chair is in use right now if it has an in-progress booking, or an active
  // booking whose time window includes this moment.
  const busyChairIds = new Set(
    bookings
      .filter(b => b.status === 'started' || (ACTIVE_BOOKING_STATUSES.includes(b.status)
        && new Date(b.startTime).getTime() <= nowTs && new Date(b.endTime).getTime() > nowTs))
      .map(b => b.chairId),
  );
  const activeChairs = chairs.filter(c => c.status === 'active');
  const chairsInUse = activeChairs.filter(c => busyChairIds.has(c.id)).length;
  const pendingRequests = appointmentRequests.filter(r => r.status === 'pending').length;

  // Pending/confirmed bookings whose time has already passed still need a status update.
  const needsUpdate = todayBookings.filter(b => ['pending', 'confirmed'].includes(b.status) && new Date(b.endTime).getTime() <= nowTs);
  const bookingsSub = [
    `${upcomingToday.length} still to come`,
    needsUpdate.length > 0 && `${needsUpdate.length} to update`,
  ].filter(Boolean).join(' · ');

  // Secondary figures; "Collected today" gets its own, larger tile.
  const stats = [
    { label: "Today's bookings", value: todayBookings.length, sub: bookingsSub, icon: CalendarCheck, to: '/admin/schedule' },
    { label: 'In the chair now', value: inProgress.length, sub: inProgress.length === 1 ? 'customer being served' : 'customers being served', icon: Clock, to: '/admin/schedule' },
    { label: 'Outstanding', value: formatPKR(outstanding), sub: `${unpaid.length} unpaid invoice${unpaid.length === 1 ? '' : 's'}`, icon: AlertCircle, to: '/admin/invoices' },
    { label: 'Chairs free now', value: `${activeChairs.length - chairsInUse}/${activeChairs.length}`, sub: `${staff.filter(s => s.status === 'active').length} active staff`, icon: Armchair, to: '/admin/chairs' },
  ];
  const outOfStock = lowStock.filter(p => p.stock <= 0);
  const runningLow = lowStock.filter(p => p.stock > 0);
  const SCHEDULE_PREVIEW = 5;
  // Put what is still ahead first so the preview shows the next customers, not the morning.
  const schedulePreview = [
    ...todayBookings.filter(b => new Date(b.endTime).getTime() > nowTs),
    ...todayBookings.filter(b => new Date(b.endTime).getTime() <= nowTs),
  ];

  // Last 14 days of collected money (all sources, single series).
  const revenueSeries = useMemo(() => {
    const range = { from: new Date(startOfToday.getTime() - 13 * DAY), to: new Date(startOfToday.getTime() + DAY) };
    return byDay(collectedLines(invoices, sales, range), range).map(r => ({ key: r.key, label: r.label, revenue: r.total }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices, sales, startOfToday.getTime()]);
  const hasRevenue = revenueSeries.some(d => d.revenue > 0);

  // Staff performance
  const rangeStart = perfRange === 'today' ? startOfToday : startOfMonth;
  const serviceCategoryMap = new Map(services.map(s => [s.id, s.category]));
  const dealServiceMap = new Map(deals.map(d => [d.id, d.serviceIds]));
  const staffPerformance = staff.filter(s => s.status === 'active').map(s => {
    const done = bookings.filter(b => b.status === 'completed' && b.staffId === s.id && new Date(b.endTime) >= rangeStart);
    const revenue = done.reduce((sum, b) => sum + b.totalPrice, 0);
    const minutes = done.reduce((sum, b) => sum + (b.totalDuration || 0), 0);
    const categoryCounts = new Map<string, number>();
    done.forEach(b => {
      const ids = b.dealId ? (dealServiceMap.get(b.dealId) || []) : b.serviceIds;
      new Set(ids.map(id => serviceCategoryMap.get(id)).filter(Boolean) as string[])
        .forEach(c => categoryCounts.set(c, (categoryCounts.get(c) || 0) + 1));
    });
    const categoryBreakdown = Array.from(categoryCounts, ([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
    return { ...s, bookingsCount: done.length, revenue, minutes, categoryBreakdown };
  }).sort((a, b) => b.bookingsCount - a.bookingsCount || b.minutes - a.minutes);
  const topStaff = staffPerformance.filter(s => s.bookingsCount > 0).slice(0, 5);

  const exportCsv = () => {
    const rows = staffPerformance.filter(s => s.bookingsCount > 0);
    const categories = Array.from(new Set(rows.flatMap(s => s.categoryBreakdown.map(c => c.category)))).sort();
    const csv = toCsv(
      ['Rank', 'Staff', 'Role', 'Completed bookings', 'Total time', 'Total minutes', 'Revenue (PKR)', ...categories],
      rows.map((s, idx) => {
        const catMap = new Map(s.categoryBreakdown.map(c => [c.category, c.count]));
        return [idx + 1, s.name, s.role, s.bookingsCount, formatDuration(s.minutes), s.minutes, s.revenue, ...categories.map(c => catMap.get(c) ?? 0)];
      }),
    );
    const stamp = perfRange === 'today' ? toLocalDateKey(now) : toLocalDateKey(now).slice(0, 7);
    downloadCsv(`staff-performance-${perfRange}-${stamp}.csv`, csv);
  };

  const recentBookings = [...bookings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <AdminLayout title="Dashboard">
      {pendingRequests > 0 && (
        <Link
          to="/admin/requests"
          className="mb-6 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm hover:bg-primary/10 transition-colors"
        >
          <MailOpen className="w-4 h-4 text-primary" />
          <span className="flex-1"><strong>{pendingRequests}</strong> online request{pendingRequests === 1 ? '' : 's'} waiting for a reply</span>
          <ArrowRight className="w-4 h-4 text-primary" />
        </Link>
      )}

      {lowStock.length > 0 && (
        <Link
          to="/admin/products"
          className="mb-6 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm hover:bg-warning/15 transition-colors"
        >
          <PackageX className="w-4 h-4 mt-0.5 text-warning shrink-0" />
          <span className="flex-1 min-w-0 space-y-0.5">
            {outOfStock.length > 0 && (
              <span className="block sm:truncate">
                <strong>Out of stock:</strong> {outOfStock.slice(0, 3).map(p => p.name).join(', ')}
                {outOfStock.length > 3 && ` and ${outOfStock.length - 3} more`}
              </span>
            )}
            {runningLow.length > 0 && (
              <span className="block sm:truncate">
                <strong>Running low:</strong> {runningLow.slice(0, 3).map(p => `${p.name} – ${p.stock} left`).join(', ')}
                {runningLow.length > 3 && ` and ${runningLow.length - 3} more`}
              </span>
            )}
          </span>
          <ArrowRight className="w-4 h-4 mt-0.5 text-warning shrink-0" />
        </Link>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5 mb-8">
        {/* The number the front desk checks all day gets the most weight. */}
        <Link
          to="/admin/reports"
          className="stat-card col-span-2 xl:row-span-2 flex flex-col justify-between gap-6 !p-6 lg:!p-7"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">Collected today</p>
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-heading text-4xl lg:text-5xl font-semibold text-foreground tabular-nums leading-none">{formatPKR(today.collected)}</p>
            <p className="text-sm text-muted-foreground mt-3">{collectedSub(today)}</p>
          </div>
          <div className="flex items-center gap-2 pt-4 border-t text-sm">
            <TrendingUp className="w-4 h-4 text-primary shrink-0" />
            <span className="text-muted-foreground">
              {now.toLocaleString('en-US', { month: 'long' })} so far
            </span>
            <span className="ml-auto font-semibold tabular-nums">{formatPKR(month.collected)}</span>
          </div>
        </Link>
        {stats.map(stat => (
          <Link key={stat.label} to={stat.to} className="stat-card !p-4 lg:!p-5 flex flex-col gap-2 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground truncate">{stat.label}</p>
              <stat.icon className="w-4 h-4 text-primary shrink-0" />
            </div>
            <p className="text-2xl font-heading font-semibold text-foreground truncate tabular-nums leading-none">{stat.value}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{stat.sub}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-start">
        {/* Today's schedule */}
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg font-semibold">Today's schedule</h3>
            <Link to="/admin/schedule" className="text-xs font-medium text-primary hover:underline">Open schedule</Link>
          </div>
          {todayBookings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No bookings today.</p>
          ) : (
            <ul className="space-y-2">
              {schedulePreview.slice(0, SCHEDULE_PREVIEW).map(b => (
                <li key={b.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-16 shrink-0 text-xs font-semibold tabular-nums">{formatTime(b.startTime)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{getCustomerById(b.customerId)?.name ?? 'Customer'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {itemsLabel(b)} · {getStaffById(b.staffId)?.name} · {getChairById(b.chairId)?.name}
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </li>
              ))}
              {schedulePreview.length > SCHEDULE_PREVIEW && (
                <li>
                  <Link to="/admin/schedule" className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/5 transition-colors">
                    {schedulePreview.length - SCHEDULE_PREVIEW} more today · open schedule <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Revenue trend */}
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="font-heading text-lg font-semibold">Money collected · last 14 days</h3>
          </div>
          {hasRevenue ? (
            <div className="h-64" role="img" aria-label="Bar chart of collected revenue per day for the last 14 days">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueSeries} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap={3}>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="0" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} width={48}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--popover-foreground))' }}
                    labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
                    formatter={(v: number) => [formatPKR(v), 'Collected']}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary-bright))" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No payments or sales recorded in the last 14 days. Mark invoices as paid or record a sale to track revenue.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Recent bookings */}
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg font-semibold">Recently booked</h3>
            <Link to="/admin/bookings" className="text-xs font-medium text-primary hover:underline">All bookings</Link>
          </div>
          {recentBookings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No bookings yet. Create your first booking!</p>
          ) : (
            <div className="space-y-2">
              {recentBookings.map(b => (
                <div key={b.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{getCustomerById(b.customerId)?.name ?? 'Customer'}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(b.startTime)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{formatPKR(b.totalPrice)}</p>
                    <StatusBadge status={b.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staff performance */}
        <div className="bg-card rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <h3 className="font-heading text-lg font-semibold">Top staff</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg border bg-muted p-0.5 text-xs font-medium">
                {(['today', 'month'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setPerfRange(r)}
                    aria-pressed={perfRange === r}
                    className={`px-3 py-1.5 rounded-md transition-colors ${perfRange === r ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {r === 'today' ? 'Today' : 'This month'}
                  </button>
                ))}
              </div>
              <button
                onClick={exportCsv}
                disabled={topStaff.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          </div>

          {topStaff.length === 0 ? (
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <Users className="w-4 h-4" /> No completed bookings {perfRange === 'today' ? 'today' : 'this month'} yet.
            </p>
          ) : (
            <div className="space-y-3">
              {topStaff.map((s, idx) => (
                <div key={s.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${idx === 0 ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.role} · {s.bookingsCount} completed · {formatDuration(s.minutes)}</p>
                    </div>
                    <p className="text-sm font-semibold whitespace-nowrap tabular-nums">{formatPKR(s.revenue)}</p>
                  </div>
                  {s.categoryBreakdown.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-11">
                      {s.categoryBreakdown.map(c => (
                        <span key={c.category} className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {c.category}<span className="text-primary/70">· {c.count}</span>
                        </span>
                      ))}
                    </div>
                  )}
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
