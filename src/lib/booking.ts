import { ACTIVE_BOOKING_STATUSES, Booking, Deal, Service } from '@/types/salon';

export interface BookingTotals {
  duration: number;
  /** Sum of the selected items before any custom total. */
  listPrice: number;
  /** What the customer pays: customTotal when given, otherwise listPrice. */
  price: number;
}

/**
 * Mirrors public.bookings_compute_totals() so the form preview matches what
 * the database stores. A deal wins over individual services.
 */
export const computeBookingTotals = (
  input: { serviceIds: string[]; dealId?: string; customTotal?: number },
  services: Service[],
  deals: Deal[],
): BookingTotals => {
  let duration = 0;
  let listPrice = 0;
  if (input.dealId) {
    const deal = deals.find(d => d.id === input.dealId);
    if (deal) {
      duration = deal.totalDuration;
      listPrice = deal.discountedPrice;
    }
  } else {
    for (const id of new Set(input.serviceIds)) {
      const svc = services.find(s => s.id === id);
      if (svc) {
        duration += svc.duration;
        listPrice += svc.price;
      }
    }
  }
  const price = input.customTotal !== undefined && input.customTotal >= 0 ? input.customTotal : listPrice;
  return { duration, listPrice, price };
};

/** (new_start < existing_end) AND (new_end > existing_start) — touching edges do not overlap. */
export const rangesOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
  aStart < bEnd && aEnd > bStart;

export type ConflictKind = 'staff' | 'chair';

export interface Conflict {
  kind: ConflictKind;
  booking: Booking;
}

/**
 * Finds the first active booking that clashes with the candidate on staff or chair.
 * Staff clashes are reported before chair clashes. The database enforces the same
 * rule; this is only for instant feedback in the form.
 */
export const findConflict = (
  bookings: Booking[],
  candidate: { staffId: string; chairId: string; startTime: string; duration: number; excludeId?: string },
): Conflict | null => {
  if (!candidate.startTime || candidate.duration <= 0) return null;
  const start = new Date(candidate.startTime).getTime();
  const end = start + candidate.duration * 60_000;
  let chairClash: Booking | null = null;
  for (const b of bookings) {
    if (b.id === candidate.excludeId) continue;
    if (!ACTIVE_BOOKING_STATUSES.includes(b.status)) continue;
    if (!rangesOverlap(start, end, new Date(b.startTime).getTime(), new Date(b.endTime).getTime())) continue;
    if (b.staffId === candidate.staffId) return { kind: 'staff', booking: b };
    if (!chairClash && b.chairId === candidate.chairId) chairClash = b;
  }
  return chairClash ? { kind: 'chair', booking: chairClash } : null;
};

export const conflictMessage = (c: Conflict) =>
  c.kind === 'staff'
    ? 'This staff member already has a booking that overlaps this time.'
    : 'This chair is already booked for part of this time.';

/** Bookings that overlap the [from, to) window, e.g. a day on the schedule. */
export const bookingsInWindow = (bookings: Booking[], from: Date, to: Date) =>
  bookings.filter(b =>
    rangesOverlap(from.getTime(), to.getTime(), new Date(b.startTime).getTime(), new Date(b.endTime).getTime()),
  );

/**
 * Normalises a Pakistani phone number for matching:
 * "0300-123 4567", "+92 300 1234567" and "923001234567" all become "03001234567".
 */
export const normalizePhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('92') && digits.length === 12) return `0${digits.slice(2)}`;
  return digits;
};
