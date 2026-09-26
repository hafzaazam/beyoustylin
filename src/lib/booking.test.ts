import { describe, expect, it } from 'vitest';
import { bookingsInWindow, computeBookingTotals, findConflict, normalizePhone, rangesOverlap } from './booking';
import { Booking, Deal, Service } from '@/types/salon';

const services: Service[] = [
  { id: 's1', name: 'Haircut', category: 'Hair Cutting', price: 1500, duration: 30, status: 'active' },
  { id: 's2', name: 'Facial', category: 'Facial', price: 3000, duration: 60, status: 'active' },
];
const deals: Deal[] = [
  { id: 'd1', name: 'Glow Combo', serviceIds: ['s1', 's2'], discountedPrice: 4000, totalDuration: 90, status: 'active' },
];

const booking = (over: Partial<Booking>): Booking => ({
  id: 'b1', customerId: 'c1', staffId: 'staff-a', chairId: 'chair-1', serviceIds: ['s1'],
  startTime: '2026-10-01T10:00:00.000Z', endTime: '2026-10-01T11:00:00.000Z',
  totalPrice: 1500, totalDuration: 60, status: 'confirmed', createdAt: '2026-09-01T00:00:00.000Z',
  ...over,
});

describe('computeBookingTotals', () => {
  it('sums services', () => {
    expect(computeBookingTotals({ serviceIds: ['s1', 's2'] }, services, deals))
      .toEqual({ duration: 90, listPrice: 4500, price: 4500 });
  });

  it('ignores duplicate service ids (matches the database)', () => {
    expect(computeBookingTotals({ serviceIds: ['s1', 's1'] }, services, deals).price).toBe(1500);
  });

  it('uses the deal price and duration when a deal is chosen', () => {
    expect(computeBookingTotals({ serviceIds: ['s1'], dealId: 'd1' }, services, deals))
      .toEqual({ duration: 90, listPrice: 4000, price: 4000 });
  });

  it('applies a custom total, including zero', () => {
    expect(computeBookingTotals({ serviceIds: ['s2'], customTotal: 2500 }, services, deals).price).toBe(2500);
    expect(computeBookingTotals({ serviceIds: ['s2'], customTotal: 0 }, services, deals).price).toBe(0);
  });

  it('skips unknown services', () => {
    expect(computeBookingTotals({ serviceIds: ['nope'] }, services, deals)).toEqual({ duration: 0, listPrice: 0, price: 0 });
  });
});

describe('rangesOverlap', () => {
  it('treats touching ranges as free', () => {
    expect(rangesOverlap(0, 10, 10, 20)).toBe(false);
    expect(rangesOverlap(10, 20, 0, 10)).toBe(false);
  });
  it('detects partial and full overlap', () => {
    expect(rangesOverlap(0, 11, 10, 20)).toBe(true);
    expect(rangesOverlap(12, 15, 10, 20)).toBe(true);
  });
});

describe('findConflict', () => {
  const existing = [booking({})];
  const at = (iso: string, duration = 30) => ({ startTime: iso, duration });

  it('flags the same staff member', () => {
    const c = findConflict(existing, { staffId: 'staff-a', chairId: 'chair-2', ...at('2026-10-01T10:30:00.000Z') });
    expect(c?.kind).toBe('staff');
  });

  it('flags the same chair', () => {
    const c = findConflict(existing, { staffId: 'staff-b', chairId: 'chair-1', ...at('2026-10-01T10:30:00.000Z') });
    expect(c?.kind).toBe('chair');
  });

  it('prefers reporting the staff clash when both clash', () => {
    const other = booking({ id: 'b2', staffId: 'staff-b', chairId: 'chair-2' });
    const c = findConflict([other, ...existing], { staffId: 'staff-a', chairId: 'chair-2', ...at('2026-10-01T10:15:00.000Z') });
    expect(c?.kind).toBe('staff');
  });

  it('allows back-to-back bookings', () => {
    expect(findConflict(existing, { staffId: 'staff-a', chairId: 'chair-1', ...at('2026-10-01T11:00:00.000Z') })).toBeNull();
  });

  it('ignores canceled and completed bookings', () => {
    const done = [booking({ status: 'canceled' }), booking({ id: 'b3', status: 'completed' })];
    expect(findConflict(done, { staffId: 'staff-a', chairId: 'chair-1', ...at('2026-10-01T10:15:00.000Z') })).toBeNull();
  });

  it('excludes the booking being edited', () => {
    expect(findConflict(existing, { staffId: 'staff-a', chairId: 'chair-1', excludeId: 'b1', ...at('2026-10-01T10:15:00.000Z') })).toBeNull();
  });

  it('returns null without a start time or duration', () => {
    expect(findConflict(existing, { staffId: 'staff-a', chairId: 'chair-1', startTime: '', duration: 30 })).toBeNull();
    expect(findConflict(existing, { staffId: 'staff-a', chairId: 'chair-1', ...at('2026-10-01T10:15:00.000Z', 0) })).toBeNull();
  });
});

describe('bookingsInWindow', () => {
  it('includes bookings that cross the window edge', () => {
    const b = booking({ startTime: '2026-10-01T23:30:00.000Z', endTime: '2026-10-02T00:30:00.000Z' });
    expect(bookingsInWindow([b], new Date('2026-10-02T00:00:00.000Z'), new Date('2026-10-03T00:00:00.000Z'))).toHaveLength(1);
    expect(bookingsInWindow([b], new Date('2026-10-02T00:30:00.000Z'), new Date('2026-10-03T00:00:00.000Z'))).toHaveLength(0);
  });
});

describe('normalizePhone', () => {
  it('normalises Pakistani formats to 03XXXXXXXXX', () => {
    expect(normalizePhone('0300-123 4567')).toBe('03001234567');
    expect(normalizePhone('+92 300 1234567')).toBe('03001234567');
    expect(normalizePhone('923001234567')).toBe('03001234567');
  });
  it('leaves other numbers as digits', () => {
    expect(normalizePhone('+1 (555) 010-9999')).toBe('15550109999');
  });
});
