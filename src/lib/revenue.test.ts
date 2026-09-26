import { describe, expect, it } from 'vitest';
import {
  bucketFor, byCategory, byDay, byPeriod, byStaff, collectedLines, customRange, presetRange,
  summarize, topProducts, topServices,
} from './revenue';
import { Booking, Invoice, Sale, Service, Staff } from '@/types/salon';

const d = (y: number, m: number, day: number, h = 12) => new Date(y, m - 1, day, h).toISOString();
const OCT = { from: new Date(2026, 9, 1), to: new Date(2026, 10, 1) };

const invoice = (over: Partial<Invoice>): Invoice => ({
  id: 'i1', invoiceNumber: 'BYS-2026-00001', bookingId: 'b1', customerId: 'c1', staffId: 'st1',
  items: [{ name: 'Haircut', price: 3000, type: 'service' }], totalAmount: 3000, subtotal: 3000,
  discountAmount: 0, voucherAmount: 0, createdAt: d(2026, 10, 5), status: 'paid',
  paidAt: d(2026, 10, 5), paymentMethod: 'Cash', ...over,
});

const sale = (over: Partial<Sale>): Sale => ({
  id: 's1', saleNumber: 'BYS-S-2026-00001', subtotal: 0, discountAmount: 0, total: 0, voucherAmount: 0,
  paymentMethod: 'Card', status: 'paid', createdAt: d(2026, 10, 6), items: [], ...over,
});

const voucherSale = sale({
  id: 's-v', subtotal: 5000, total: 5000, paymentMethod: 'Cash',
  items: [{ id: 'si1', kind: 'voucher', giftVoucherId: 'gv1', name: 'Gift voucher GV-1', quantity: 1, unitPrice: 5000, lineTotal: 5000 }],
});

describe('collectedLines + summarize', () => {
  it('does not double count a gift voucher sold and then redeemed', () => {
    // Customer buys a Rs 5,000 voucher, later pays a Rs 3,000 invoice: 2,400 by voucher? No — voucher covers 2,400 of it.
    const inv = invoice({ totalAmount: 3000, voucherAmount: 2400, paymentMethod: 'Cash' });
    const s = summarize(collectedLines([inv], [voucherSale], OCT));
    expect(s.vouchersSold).toBe(5000);
    expect(s.services).toBe(600);
    expect(s.collected).toBe(5600);
    expect(s.voucherRedemptions).toBe(2400);
  });

  it('counts a fully voucher-paid invoice as zero cash but tracks the redemption', () => {
    const inv = invoice({ totalAmount: 2000, voucherAmount: 2000, paymentMethod: 'Gift voucher' });
    const s = summarize(collectedLines([inv], [], OCT));
    expect(s.collected).toBe(0);
    expect(s.voucherRedemptions).toBe(2000);
    expect(s.byMethod).toEqual({});
    expect(s.count).toBe(1);
  });

  it('uses the discounted invoice total and records the discount', () => {
    const inv = invoice({ subtotal: 3000, discountAmount: 600, totalAmount: 2400 });
    const s = summarize(collectedLines([inv], [], OCT));
    expect(s.services).toBe(2400);
    expect(s.discounts).toBe(600);
  });

  it('splits a mixed sale into products and vouchers, net of discount and voucher cover', () => {
    const mixed = sale({
      subtotal: 6200, discountAmount: 120, total: 6080, voucherAmount: 500, paymentMethod: 'Card',
      items: [
        { id: 'a', kind: 'product', productId: 'p1', name: 'Oil', quantity: 2, unitPrice: 600, lineTotal: 1200 },
        { id: 'b', kind: 'voucher', giftVoucherId: 'gv2', name: 'Gift voucher', quantity: 1, unitPrice: 5000, lineTotal: 5000 },
      ],
    });
    const s = summarize(collectedLines([], [mixed], OCT));
    expect(s.products).toBe(1200 - 120 - 500);
    expect(s.vouchersSold).toBe(5000);
    expect(s.collected).toBe(580 + 5000);
    expect(s.discounts).toBe(120);
    expect(s.voucherRedemptions).toBe(500);
    expect(s.byMethod).toEqual({ Card: 5580 });
    expect(s.count).toBe(1);
  });

  it('excludes unpaid and void invoices and void sales', () => {
    const events = collectedLines(
      [invoice({ id: 'u', status: 'unpaid', paidAt: undefined }), invoice({ id: 'v', status: 'void' })],
      [sale({ status: 'void', items: [{ id: 'x', kind: 'product', name: 'Oil', quantity: 1, unitPrice: 500, lineTotal: 500 }] })],
      OCT,
    );
    expect(events).toHaveLength(0);
  });

  it('dates invoices by payment and respects half-open range boundaries', () => {
    const lastSecond = new Date(2026, 9, 31, 23, 59, 59).toISOString();
    const nextMonth = new Date(2026, 10, 1, 0, 0, 0).toISOString();
    const events = collectedLines(
      [
        invoice({ id: 'a', createdAt: d(2026, 9, 28), paidAt: d(2026, 10, 1, 0) }), // created in Sept, paid in Oct → counts
        invoice({ id: 'b', paidAt: lastSecond }),
        invoice({ id: 'c', paidAt: nextMonth }),
      ],
      [],
      OCT,
    );
    expect(events.map(e => e.refId).sort()).toEqual(['a', 'b']);
  });

  it('groups cash by payment method', () => {
    const s = summarize(collectedLines(
      [invoice({ id: 'a', paymentMethod: 'Cash' }), invoice({ id: 'b', paymentMethod: 'JazzCash', totalAmount: 1000 }), invoice({ id: 'c', paymentMethod: undefined, totalAmount: 500 })],
      [], OCT,
    ));
    expect(s.byMethod).toEqual({ Cash: 3000, JazzCash: 1000, Other: 500 });
  });
});

describe('byDay / byPeriod', () => {
  it('returns one row per day including empty days', () => {
    const range = { from: new Date(2026, 9, 1), to: new Date(2026, 9, 4) };
    const rows = byDay(collectedLines([invoice({ paidAt: d(2026, 10, 2) })], [voucherSale], { from: range.from, to: range.to }), range);
    expect(rows).toHaveLength(3);
    expect(rows.map(r => r.total)).toEqual([0, 3000, 0]);
  });

  it('buckets by source', () => {
    const rows = byDay(collectedLines([invoice({})], [voucherSale], OCT), OCT);
    const oct5 = rows.find(r => r.key === '2026-10-05')!;
    const oct6 = rows.find(r => r.key === '2026-10-06')!;
    expect(oct5.services).toBe(3000);
    expect(oct6.vouchers).toBe(5000);
    expect(rows.reduce((s, r) => s + r.total, 0)).toBe(8000);
  });

  it('chooses day, week or month buckets by range length', () => {
    expect(bucketFor(OCT)).toBe('day');
    expect(bucketFor({ from: new Date(2026, 0, 1), to: new Date(2026, 3, 1) })).toBe('week');
    expect(bucketFor({ from: new Date(2026, 0, 1), to: new Date(2027, 0, 1) })).toBe('month');
  });

  it('month buckets add up to the total', () => {
    const year = { from: new Date(2026, 0, 1), to: new Date(2027, 0, 1) };
    const rows = byPeriod(collectedLines([invoice({}), invoice({ id: 'x', paidAt: d(2026, 3, 3) })], [], year), year, 'month');
    expect(rows).toHaveLength(12);
    expect(rows[2].total).toBe(3000);
    expect(rows[9].total).toBe(3000);
  });
});

describe('rankings', () => {
  const services: Service[] = [
    { id: 's1', name: 'Haircut', category: 'Hair Cutting', price: 1000, duration: 30, status: 'active' },
    { id: 's2', name: 'Facial', category: 'Facial', price: 2000, duration: 60, status: 'active' },
  ];

  it('shares the discounted invoice total across service lines by list price', () => {
    const inv = invoice({
      items: [{ name: 'Haircut', price: 1000, type: 'service' }, { name: 'Facial', price: 2000, type: 'service' }],
      subtotal: 3000, discountAmount: 300, totalAmount: 2700,
    });
    const ranks = topServices([inv], OCT, services);
    expect(ranks).toEqual([
      { name: 'Facial', count: 1, revenue: 1800, category: 'Facial' },
      { name: 'Haircut', count: 1, revenue: 900, category: 'Hair Cutting' },
    ]);
    expect(byCategory(ranks).map(c => c.category)).toEqual(['Facial', 'Hair Cutting']);
  });

  it('labels packages and ignores adjustment lines', () => {
    const inv = invoice({
      items: [{ name: 'Glow Combo', price: 4000, type: 'deal' }, { name: 'Discount', price: -500, type: 'adjustment' }],
      subtotal: 3500, totalAmount: 3500,
    });
    expect(topServices([inv], OCT, services)).toEqual([{ name: 'Glow Combo', count: 1, revenue: 3500, category: 'Packages' }]);
  });

  it('ranks products by line value and ignores voucher lines', () => {
    const s1 = sale({ items: [{ id: 'a', kind: 'product', productId: 'p1', name: 'Oil', quantity: 2, unitPrice: 600, lineTotal: 1200 }] });
    const s2 = sale({ id: 's2', items: [
      { id: 'b', kind: 'product', productId: 'p1', name: 'Oil', quantity: 1, unitPrice: 600, lineTotal: 600 },
      { id: 'c', kind: 'product', productId: 'p2', name: 'Serum', quantity: 1, unitPrice: 2500, lineTotal: 2500 },
    ] });
    expect(topProducts([s1, s2, voucherSale], OCT)).toEqual([
      { key: 'p2', name: 'Serum', qty: 1, revenue: 2500 },
      { key: 'p1', name: 'Oil', qty: 3, revenue: 1800 },
    ]);
  });

  it('sums staff revenue and completed bookings in range', () => {
    const staff: Staff[] = [{ id: 'st1', name: 'Hina', role: 'Makeup Artist', phone: '', status: 'active', createdAt: '' }];
    const bookings: Booking[] = [
      { id: 'b1', customerId: 'c1', staffId: 'st1', chairId: 'ch', serviceIds: [], startTime: d(2026, 10, 5, 10), endTime: d(2026, 10, 5, 11), totalPrice: 3000, totalDuration: 60, status: 'completed', createdAt: '' },
      { id: 'b2', customerId: 'c1', staffId: 'st1', chairId: 'ch', serviceIds: [], startTime: d(2026, 10, 6, 10), endTime: d(2026, 10, 6, 11), totalPrice: 3000, totalDuration: 60, status: 'confirmed', createdAt: '' },
      { id: 'b3', customerId: 'c1', staffId: 'st2', chairId: 'ch', serviceIds: [], startTime: d(2026, 9, 6, 10), endTime: d(2026, 9, 6, 11), totalPrice: 3000, totalDuration: 60, status: 'completed', createdAt: '' },
    ];
    expect(byStaff([invoice({})], bookings, staff, OCT)).toEqual([{ staffId: 'st1', name: 'Hina', revenue: 3000, bookings: 1 }]);
  });
});

describe('ranges', () => {
  const now = new Date(2026, 9, 15, 14, 30);

  it('builds half-open preset ranges', () => {
    expect(presetRange('today', now)).toEqual({ from: new Date(2026, 9, 15), to: new Date(2026, 9, 16) });
    expect(presetRange('yesterday', now)).toEqual({ from: new Date(2026, 9, 14), to: new Date(2026, 9, 15) });
    expect(presetRange('last7', now)).toEqual({ from: new Date(2026, 9, 9), to: new Date(2026, 9, 16) });
    expect(presetRange('thisMonth', now)).toEqual({ from: new Date(2026, 9, 1), to: new Date(2026, 9, 16) });
    expect(presetRange('lastMonth', now)).toEqual({ from: new Date(2026, 8, 1), to: new Date(2026, 9, 1) });
    expect(presetRange('thisYear', now)).toEqual({ from: new Date(2026, 0, 1), to: new Date(2026, 9, 16) });
  });

  it('handles last month across a year boundary', () => {
    expect(presetRange('lastMonth', new Date(2027, 0, 10))).toEqual({ from: new Date(2026, 11, 1), to: new Date(2027, 0, 1) });
  });

  it('turns inclusive form dates into a half-open range', () => {
    expect(customRange('2026-10-01', '2026-10-31')).toEqual(OCT);
    expect(customRange('2026-10-05', '2026-10-01')).toBeNull();
    expect(customRange('', '2026-10-01')).toBeNull();
  });
});
