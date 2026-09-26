import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipProps } from 'recharts';
import { BarChart3, FileSpreadsheet, Printer, Info } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSalon } from '@/context/SalonContext';
import {
  Bucket, DateRange, MONEY_SOURCES, MoneySource, PRESET_LABELS, RangePreset, SOURCE_LABELS,
  bucketFor, byCategory, byPeriod, byStaff, collectedLines, customRange, presetRange,
  summarize, toDateKey, topProducts, topServices,
} from '@/lib/revenue';
import { formatPKR } from '@/lib/format';
import { downloadCsv, toCsv } from '@/lib/csv';

type RangeChoice = RangePreset | 'custom';
const PRESETS: RangePreset[] = ['today', 'yesterday', 'last7', 'thisMonth', 'lastMonth', 'thisYear'];

// Categorical series colours, validated for colour-vision deficiency and
// contrast on both surfaces (dataviz palette check). Fixed order, never cycled.
const SERIES_VARS: Record<MoneySource, string> = {
  services: 'var(--series-services)',
  products: 'var(--series-products)',
  vouchers: 'var(--series-vouchers)',
};
const SERIES_CLASSES =
  '[--series-services:#e61986] [--series-products:#763fa6] [--series-vouchers:#009999] ' +
  'dark:[--series-services:#e1478a] dark:[--series-products:#8d6cda] dark:[--series-vouchers:#0f9a91]';

const BUCKET_LABEL: Record<Bucket, string> = { day: 'Daily', week: 'Weekly', month: 'Monthly' };

const shortMoney = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v));

const describeRange = (r: DateRange) => {
  const last = new Date(r.to.getTime() - 1);
  const fmt = (d: Date) => d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  return toDateKey(r.from) === toDateKey(last) ? fmt(r.from) : `${fmt(r.from)} – ${fmt(last)}`;
};

const ChartTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md text-popover-foreground min-w-[11rem]">
      <p className="text-muted-foreground mb-1.5">{label}</p>
      {[...payload].reverse().map(p => (
        <div key={p.dataKey as string} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} aria-hidden />
            {SOURCE_LABELS[p.dataKey as MoneySource]}
          </span>
          <span className="tabular-nums font-medium">{formatPKR(Number(p.value) || 0)}</span>
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t mt-1.5 pt-1.5 font-semibold">
        <span>Total</span><span className="tabular-nums">{formatPKR(total)}</span>
      </div>
    </div>
  );
};

const Kpi = ({ label, value, hint, emphasis = false }: { label: string; value: string; hint: string; emphasis?: boolean }) => (
  <div className={`stat-card ${emphasis ? 'ring-1 ring-primary/25' : ''}`}>
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className={`font-heading font-bold tabular-nums truncate ${emphasis ? 'text-3xl text-primary' : 'text-2xl'}`}>{value}</p>
    <p className="text-xs text-muted-foreground mt-1 leading-snug">{hint}</p>
  </div>
);

const Card = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <section className="bg-card rounded-xl border p-5 break-inside-avoid">
    <div className="flex items-center justify-between gap-3 mb-4">
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

const ReportsPage = () => {
  const { invoices, sales, bookings, services, staff } = useSalon();
  const [choice, setChoice] = useState<RangeChoice>('thisMonth');
  const now = new Date();
  const monthStart = toDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
  const [customFrom, setCustomFrom] = useState(monthStart);
  const [customTo, setCustomTo] = useState(toDateKey(now));

  const range: DateRange = useMemo(() => {
    if (choice === 'custom') return customRange(customFrom, customTo) ?? presetRange('thisMonth');
    return presetRange(choice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choice, customFrom, customTo, toDateKey(now)]);

  const events = useMemo(() => collectedLines(invoices, sales, range), [invoices, sales, range]);
  const summary = useMemo(() => summarize(events), [events]);
  const bucket = bucketFor(range);
  const periods = useMemo(() => byPeriod(events, range, bucket), [events, range, bucket]);
  const serviceRanks = useMemo(() => topServices(invoices, range, services), [invoices, range, services]);
  const categories = useMemo(() => byCategory(serviceRanks), [serviceRanks]);
  const productRanks = useMemo(() => topProducts(sales, range), [sales, range]);
  const staffRanks = useMemo(() => byStaff(invoices, bookings, staff, range), [invoices, bookings, staff, range]);

  const methods = Object.entries(summary.byMethod).sort((a, b) => b[1] - a[1]);
  const methodTotal = methods.reduce((s, [, v]) => s + v, 0);
  const sourceTotals: Record<MoneySource, number> = {
    services: summary.services, products: summary.products, vouchers: summary.vouchersSold,
  };
  const rangeText = describeRange(range);
  const hasData = summary.count > 0;

  const exportCsv = () => {
    const rows: (string | number)[][] = periods.map(p => [p.key, p.services, p.products, p.vouchers, p.total]);
    rows.push([]);
    rows.push(['Summary', rangeText]);
    rows.push(['Total collected', summary.collected]);
    rows.push(['Services', summary.services]);
    rows.push(['Products', summary.products]);
    rows.push(['Gift vouchers sold', summary.vouchersSold]);
    rows.push(['Discounts given', summary.discounts]);
    rows.push(['Paid with gift vouchers (not revenue)', summary.voucherRedemptions]);
    rows.push(['Transactions', summary.count]);
    rows.push([]);
    rows.push(['Payment method', 'Collected (PKR)']);
    methods.forEach(([m, v]) => rows.push([m, v]));
    const csv = toCsv([`${BUCKET_LABEL[bucket]} period starting`, 'Services (PKR)', 'Products (PKR)', 'Gift vouchers sold (PKR)', 'Total (PKR)'], rows);
    downloadCsv(`sales-report-${toDateKey(range.from)}-to-${toDateKey(new Date(range.to.getTime() - 1))}.csv`, csv);
  };

  return (
    <AdminLayout
      title="Sales report"
      actions={
        <>
          <Button variant="outline" onClick={() => window.print()} className="print:hidden"><Printer className="w-4 h-4 mr-2" />Print</Button>
          <Button variant="outline" onClick={exportCsv} disabled={!hasData} className="print:hidden"><FileSpreadsheet className="w-4 h-4 mr-2" />Export CSV</Button>
        </>
      }
    >
      <div className={`space-y-6 ${SERIES_CLASSES}`}>
        {/* Range controls */}
        <div className="flex flex-wrap items-end gap-3 print:hidden">
          <div className="inline-flex flex-wrap rounded-lg border bg-muted p-0.5 text-sm font-medium" role="group" aria-label="Date range">
            {[...PRESETS, 'custom' as const].map(p => (
              <button
                key={p}
                onClick={() => setChoice(p)}
                aria-pressed={choice === p}
                className={`px-3 py-1.5 rounded-md transition-colors ${choice === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {p === 'custom' ? 'Custom' : PRESET_LABELS[p]}
              </button>
            ))}
          </div>
          {choice === 'custom' && (
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="rep-from" className="text-xs text-muted-foreground">From</Label>
                <Input id="rep-from" type="date" value={customFrom} max={customTo} onChange={e => setCustomFrom(e.target.value)} className="h-9 w-40" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rep-to" className="text-xs text-muted-foreground">To</Label>
                <Input id="rep-to" type="date" value={customTo} min={customFrom} onChange={e => setCustomTo(e.target.value)} className="h-9 w-40" />
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Reporting period</p>
          <p className="font-heading text-xl font-semibold">{rangeText}</p>
        </div>

        {!hasData ? (
          <EmptyState
            icon={BarChart3}
            title="No sales in this period"
            description="Paid invoices and point-of-sale sales appear here. Try a wider date range."
          />
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <Kpi emphasis label="Total collected" value={formatPKR(summary.collected)} hint={`Money received from ${summary.count} transaction${summary.count === 1 ? '' : 's'}.`} />
              <Kpi label="Services" value={formatPKR(summary.services)} hint="Paid booking invoices, minus any part paid by gift voucher." />
              <Kpi label="Products" value={formatPKR(summary.products)} hint="Retail sales after discounts and gift-voucher payments." />
              <Kpi label="Gift vouchers sold" value={formatPKR(summary.vouchersSold)} hint="Counted when sold — not again when the voucher is used." />
              <Kpi label="Discounts given" value={formatPKR(summary.discounts)} hint="Discount codes on invoices and sales. Already taken off the totals above." />
              <Kpi label="Paid with gift vouchers" value={formatPKR(summary.voucherRedemptions)} hint="Voucher balance used. Not revenue — it was counted when the voucher was sold." />
            </div>

            {/* Chart */}
            <Card title={`${BUCKET_LABEL[bucket]} money collected`}>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 mb-4 text-sm" aria-label="Legend">
                {MONEY_SOURCES.map(src => (
                  <li key={src} className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ background: SERIES_VARS[src] }} aria-hidden />
                    <span className="text-muted-foreground">{SOURCE_LABELS[src]}</span>
                    <span className="font-semibold tabular-nums">{formatPKR(sourceTotals[src])}</span>
                  </li>
                ))}
              </ul>
              <div className="h-72" role="img" aria-label={`Stacked bar chart of money collected per ${bucket} by services, products and gift vouchers sold. A table follows.`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={periods} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap={periods.length > 20 ? 2 : 6}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={shortMoney}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltip />} />
                    {MONEY_SOURCES.map((src, i) => (
                      <Bar
                        key={src}
                        dataKey={src}
                        stackId="money"
                        fill={SERIES_VARS[src]}
                        stroke="hsl(var(--card))"
                        strokeWidth={2}
                        maxBarSize={36}
                        radius={i === MONEY_SOURCES.length - 1 ? [4, 4, 0, 0] : 0}
                        isAnimationActive={false}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View as table</summary>
                <div className="mt-3 overflow-x-auto max-h-72">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">{bucket === 'day' ? 'Day' : bucket === 'week' ? 'Week of' : 'Month'}</th>
                      {MONEY_SOURCES.map(s => <th key={s} className="py-2 pr-4 font-medium text-right">{SOURCE_LABELS[s]}</th>)}
                      <th className="py-2 font-medium text-right">Total</th>
                    </tr></thead>
                    <tbody>
                      {periods.filter(p => p.total > 0).map(p => (
                        <tr key={p.key} className="border-b last:border-0">
                          <td className="py-1.5 pr-4">{p.label}</td>
                          {MONEY_SOURCES.map(s => <td key={s} className="py-1.5 pr-4 text-right tabular-nums">{formatPKR(p[s])}</td>)}
                          <td className="py-1.5 text-right tabular-nums font-medium">{formatPKR(p.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Payment methods */}
              <Card title="Payment methods">
                {methods.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No cash collected — everything in this period was paid with gift vouchers.</p>
                ) : (
                  <ul className="space-y-3">
                    {methods.map(([method, amount]) => {
                      const share = methodTotal > 0 ? amount / methodTotal : 0;
                      return (
                        <li key={method}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{method}</span>
                            <span className="tabular-nums">{formatPKR(amount)} <span className="text-muted-foreground">· {Math.round(share * 100)}%</span></span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden" aria-hidden>
                            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, share * 100)}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {summary.voucherRedemptions > 0 && (
                  <p className="text-xs text-muted-foreground mt-4 flex gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
                    {formatPKR(summary.voucherRedemptions)} was also paid with gift vouchers (not counted above).
                  </p>
                )}
              </Card>

              {/* Staff */}
              <Card title="Staff performance">
                {staffRanks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No service revenue or completed bookings in this period.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 font-medium">Staff</th>
                      <th className="py-2 font-medium text-right">Completed</th>
                      <th className="py-2 font-medium text-right">Services revenue</th>
                    </tr></thead>
                    <tbody>
                      {staffRanks.map(s => (
                        <tr key={s.staffId} className="border-b last:border-0">
                          <td className="py-2">{s.name}</td>
                          <td className="py-2 text-right tabular-nums">{s.bookings}</td>
                          <td className="py-2 text-right tabular-nums font-medium">{formatPKR(s.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </Card>

              {/* Top services */}
              <Card title="Top services & packages">
                {serviceRanks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No paid service invoices in this period.</p>
                ) : (
                  <>
                    {categories.length > 1 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {categories.map(c => (
                          <span key={c.category} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-foreground">
                            {c.category} · <span className="tabular-nums">{formatPKR(c.revenue)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 font-medium">Service</th>
                        <th className="py-2 font-medium text-right">Sold</th>
                        <th className="py-2 font-medium text-right">Revenue</th>
                      </tr></thead>
                      <tbody>
                        {serviceRanks.slice(0, 10).map(r => (
                          <tr key={r.name} className="border-b last:border-0">
                            <td className="py-2"><span className="block">{r.name}</span><span className="text-xs text-muted-foreground">{r.category}</span></td>
                            <td className="py-2 text-right tabular-nums">{r.count}</td>
                            <td className="py-2 text-right tabular-nums font-medium">{formatPKR(r.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs text-muted-foreground mt-3">Revenue is the invoice total after discounts, including any part paid by gift voucher.</p>
                  </>
                )}
              </Card>

              {/* Top products */}
              <Card title="Top products">
                {productRanks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No products sold in this period.</p>
                ) : (
                  <>
                    <table className="w-full text-sm">
                      <thead><tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 font-medium">Product</th>
                        <th className="py-2 font-medium text-right">Qty</th>
                        <th className="py-2 font-medium text-right">Sales value</th>
                      </tr></thead>
                      <tbody>
                        {productRanks.slice(0, 10).map(r => (
                          <tr key={r.key} className="border-b last:border-0">
                            <td className="py-2">{r.name}</td>
                            <td className="py-2 text-right tabular-nums">{r.qty}</td>
                            <td className="py-2 text-right tabular-nums font-medium">{formatPKR(r.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs text-muted-foreground mt-3">Sales value is the shelf price × quantity, before sale-level discounts.</p>
                  </>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default ReportsPage;
