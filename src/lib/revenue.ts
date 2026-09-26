import { Booking, Invoice, Sale, Service, Staff } from '@/types/salon';

/**
 * Cash-basis revenue, matching the rules in the vouchers/products/sales migration:
 *  - A paid booking invoice counts what was actually collected: total minus any
 *    gift-voucher cover (the voucher money was already counted when it was sold).
 *  - A retail sale counts product lines minus discount minus voucher cover
 *    (vouchers can only pay for products), plus gift vouchers sold, in full.
 *  - Unpaid and void invoices, and void sales, never count.
 */

export type MoneySource = 'services' | 'products' | 'vouchers';
export const MONEY_SOURCES: MoneySource[] = ['services', 'products', 'vouchers'];
export const SOURCE_LABELS: Record<MoneySource, string> = {
  services: 'Services',
  products: 'Products',
  vouchers: 'Gift vouchers sold',
};

export interface MoneyEvent {
  date: Date;
  source: MoneySource;
  /** Cash collected (never negative). */
  amount: number;
  /** Discount given on this transaction line. */
  discount: number;
  /** Paid with a gift voucher (not revenue — already counted when the voucher was sold). */
  voucherRedeemed: number;
  method?: string;
  staffId?: string;
  /** Invoice id or sale id — one transaction may produce two events. */
  refId: string;
}

/** Half-open range: from ≤ t < to. */
export interface DateRange {
  from: Date;
  to: Date;
}

const inRange = (d: Date, r: DateRange) => d.getTime() >= r.from.getTime() && d.getTime() < r.to.getTime();
const invoiceDate = (i: Invoice) => new Date(i.paidAt ?? i.createdAt);

export const paidInvoicesInRange = (invoices: Invoice[], range: DateRange) =>
  invoices.filter(i => i.status === 'paid' && inRange(invoiceDate(i), range));

export const paidSalesInRange = (sales: Sale[], range: DateRange) =>
  sales.filter(s => s.status === 'paid' && inRange(new Date(s.createdAt), range));

export const saleSplit = (s: Sale) => {
  const productLines = s.items.filter(i => i.kind === 'product').reduce((sum, i) => sum + i.lineTotal, 0);
  const voucherLines = s.items.filter(i => i.kind === 'voucher').reduce((sum, i) => sum + i.lineTotal, 0);
  return {
    productLines,
    voucherLines,
    productCash: Math.max(0, productLines - s.discountAmount - s.voucherAmount),
  };
};

export const collectedLines = (invoices: Invoice[], sales: Sale[], range: DateRange): MoneyEvent[] => {
  const events: MoneyEvent[] = [];
  for (const inv of paidInvoicesInRange(invoices, range)) {
    events.push({
      date: invoiceDate(inv),
      source: 'services',
      amount: Math.max(0, inv.totalAmount - inv.voucherAmount),
      discount: inv.discountAmount,
      voucherRedeemed: inv.voucherAmount,
      method: inv.paymentMethod,
      staffId: inv.staffId,
      refId: inv.id,
    });
  }
  for (const sale of paidSalesInRange(sales, range)) {
    const date = new Date(sale.createdAt);
    const { productLines, voucherLines, productCash } = saleSplit(sale);
    if (productLines > 0) {
      events.push({
        date, source: 'products', amount: productCash, discount: sale.discountAmount,
        voucherRedeemed: sale.voucherAmount, method: sale.paymentMethod, staffId: sale.staffId, refId: sale.id,
      });
    }
    if (voucherLines > 0) {
      events.push({
        date, source: 'vouchers', amount: voucherLines, discount: 0,
        voucherRedeemed: 0, method: sale.paymentMethod, staffId: sale.staffId, refId: sale.id,
      });
    }
  }
  return events;
};

export interface RevenueSummary {
  collected: number;
  services: number;
  products: number;
  vouchersSold: number;
  discounts: number;
  voucherRedemptions: number;
  /** Cash collected per payment method ("Gift voucher" payments are not cash, so they are excluded). */
  byMethod: Record<string, number>;
  /** Number of transactions (invoices + sales). */
  count: number;
}

export const summarize = (events: MoneyEvent[]): RevenueSummary => {
  const s: RevenueSummary = {
    collected: 0, services: 0, products: 0, vouchersSold: 0,
    discounts: 0, voucherRedemptions: 0, byMethod: {}, count: 0,
  };
  const refs = new Set<string>();
  for (const e of events) {
    refs.add(e.refId);
    s.collected += e.amount;
    if (e.source === 'services') s.services += e.amount;
    else if (e.source === 'products') s.products += e.amount;
    else s.vouchersSold += e.amount;
    s.discounts += e.discount;
    s.voucherRedemptions += e.voucherRedeemed;
    if (e.amount > 0) {
      const method = e.method || 'Other';
      s.byMethod[method] = (s.byMethod[method] ?? 0) + e.amount;
    }
  }
  s.count = refs.size;
  return s;
};

// ---------------- time buckets ----------------

export type Bucket = 'day' | 'week' | 'month';

const DAY_MS = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Weeks start on Monday. */
const startOfWeek = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const rangeDays = (r: DateRange) => Math.max(1, Math.round((startOfDay(r.to).getTime() - startOfDay(r.from).getTime()) / DAY_MS));

/** Days up to ~2 months, then weeks up to ~6 months, then months. */
export const bucketFor = (r: DateRange): Bucket => {
  const days = rangeDays(r);
  if (days <= 62) return 'day';
  if (days <= 184) return 'week';
  return 'month';
};

export interface BucketRow {
  key: string;
  label: string;
  start: Date;
  services: number;
  products: number;
  vouchers: number;
  total: number;
}

export const byPeriod = (events: MoneyEvent[], range: DateRange, bucket: Bucket = bucketFor(range)): BucketRow[] => {
  const floor = bucket === 'day' ? startOfDay : bucket === 'week' ? startOfWeek : startOfMonth;
  const next = (d: Date) => (bucket === 'day' ? addDays(d, 1) : bucket === 'week' ? addDays(d, 7) : new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const label = (d: Date) => bucket === 'month'
    ? d.toLocaleDateString('en-PK', { month: 'short', year: 'numeric' })
    : d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

  const rows: BucketRow[] = [];
  const index = new Map<string, BucketRow>();
  for (let d = floor(range.from); d.getTime() < range.to.getTime(); d = next(d)) {
    const row = { key: dateKey(d), label: label(d), start: d, services: 0, products: 0, vouchers: 0, total: 0 };
    rows.push(row);
    index.set(row.key, row);
  }
  for (const e of events) {
    const row = index.get(dateKey(floor(e.date)));
    if (!row) continue;
    row[e.source] += e.amount;
    row.total += e.amount;
  }
  return rows;
};

/** Daily rows for every day in the range (convenience for charts and CSV). */
export const byDay = (events: MoneyEvent[], range: DateRange) => byPeriod(events, range, 'day');

// ---------------- rankings ----------------

export interface ServiceRank { name: string; count: number; revenue: number; category: string }

/**
 * Services and packages sold on paid invoices. Revenue is the invoice total
 * (after discount, including any part paid with a gift voucher) shared across
 * its lines in proportion to their list price.
 */
export const topServices = (invoices: Invoice[], range: DateRange, services: Service[]): ServiceRank[] => {
  const categoryByName = new Map(services.map(s => [s.name, s.category]));
  const map = new Map<string, ServiceRank>();
  for (const inv of paidInvoicesInRange(invoices, range)) {
    const lines = inv.items.filter(i => i.type !== 'adjustment' && i.price >= 0);
    const listTotal = lines.reduce((s, i) => s + i.price, 0);
    for (const line of lines) {
      const share = listTotal > 0 ? (line.price / listTotal) * inv.totalAmount : inv.totalAmount / lines.length;
      const cur = map.get(line.name) ?? {
        name: line.name, count: 0, revenue: 0,
        category: line.type === 'deal' ? 'Packages' : categoryByName.get(line.name) ?? 'Other',
      };
      cur.count += 1;
      cur.revenue += share;
      map.set(line.name, cur);
    }
  }
  return [...map.values()].map(r => ({ ...r, revenue: Math.round(r.revenue) })).sort((a, b) => b.revenue - a.revenue || b.count - a.count);
};

export const byCategory = (ranks: ServiceRank[]) => {
  const map = new Map<string, { category: string; count: number; revenue: number }>();
  for (const r of ranks) {
    const cur = map.get(r.category) ?? { category: r.category, count: 0, revenue: 0 };
    cur.count += r.count;
    cur.revenue += r.revenue;
    map.set(r.category, cur);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
};

export interface ProductRank { key: string; name: string; qty: number; revenue: number }

/** Products sold on paid sales in range; revenue is the line value before any sale-level discount. */
export const topProducts = (sales: Sale[], range: DateRange): ProductRank[] => {
  const map = new Map<string, ProductRank>();
  for (const sale of paidSalesInRange(sales, range)) {
    for (const item of sale.items) {
      if (item.kind !== 'product') continue;
      const key = item.productId ?? item.name;
      const cur = map.get(key) ?? { key, name: item.name, qty: 0, revenue: 0 };
      cur.qty += item.quantity;
      cur.revenue += item.lineTotal;
      map.set(key, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue || b.qty - a.qty);
};

export interface StaffRank { staffId: string; name: string; revenue: number; bookings: number }

/** Services revenue (paid invoice totals) and completed bookings (by end time) per staff member. */
export const byStaff = (invoices: Invoice[], bookings: Booking[], staff: Staff[], range: DateRange): StaffRank[] => {
  const map = new Map<string, StaffRank>();
  const get = (id: string) => {
    let cur = map.get(id);
    if (!cur) {
      cur = { staffId: id, name: staff.find(s => s.id === id)?.name ?? 'Former staff', revenue: 0, bookings: 0 };
      map.set(id, cur);
    }
    return cur;
  };
  for (const inv of paidInvoicesInRange(invoices, range)) get(inv.staffId).revenue += inv.totalAmount;
  for (const b of bookings) {
    if (b.status === 'completed' && inRange(new Date(b.endTime), range)) get(b.staffId).bookings += 1;
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings);
};

// ---------------- range presets ----------------

export type RangePreset = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth' | 'thisYear';

export const PRESET_LABELS: Record<RangePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  last7: 'Last 7 days',
  thisMonth: 'This month',
  lastMonth: 'Last month',
  thisYear: 'This year',
};

export const presetRange = (preset: RangePreset, now = new Date()): DateRange => {
  const today = startOfDay(now);
  switch (preset) {
    case 'today': return { from: today, to: addDays(today, 1) };
    case 'yesterday': return { from: addDays(today, -1), to: today };
    case 'last7': return { from: addDays(today, -6), to: addDays(today, 1) };
    case 'thisMonth': return { from: startOfMonth(now), to: addDays(today, 1) };
    case 'lastMonth': return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: startOfMonth(now) };
    case 'thisYear': return { from: new Date(now.getFullYear(), 0, 1), to: addDays(today, 1) };
  }
};

/** Inclusive YYYY-MM-DD dates from a form → half-open range. */
export const customRange = (fromKey: string, toKey: string): DateRange | null => {
  if (!fromKey || !toKey) return null;
  const [fy, fm, fd] = fromKey.split('-').map(Number);
  const [ty, tm, td] = toKey.split('-').map(Number);
  const from = new Date(fy, fm - 1, fd);
  const to = new Date(ty, tm - 1, td + 1);
  return to.getTime() > from.getTime() ? { from, to } : null;
};

export const toDateKey = dateKey;
