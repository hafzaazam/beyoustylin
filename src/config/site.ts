// Single source of truth for business details shown across the site,
// invoices and emails. Previously these were hard-coded in several places
// and disagreed with each other (Karachi vs Lahore, two phone numbers,
// two sets of opening hours).
//
// TODO(owner): confirm these values. Leave a social URL empty to hide its icon.
import heroSalon from '@/assets/hero-salon.jpg';

export const SITE = {
  // TODO(owner): replace with real studio / bridal-client photography.
  // The current placeholder is a stock interior with another salon's sign on its
  // left side, so it is cropped to its right half (see heroImagePosition).
  // Ideal: 2400×1600 JPG/WebP, portrait-friendly subject on the right third.
  heroImage: heroSalon,
  heroImageAlt: 'Salon interior with styling chairs and lit mirrors',
  heroImagePosition: '85% center',
  name: 'BeYou Stylin',
  tagline: 'Premium Salon & Bridal Studio',
  city: 'Karachi, Pakistan',
  phoneDisplay: '+92 300 1234567',
  phoneHref: 'tel:+923001234567',
  email: 'hello@beyoustylin.com',
  hours: 'Mon – Sat · 10am – 8pm',
  instagramUrl: '',
  facebookUrl: '',
  currency: 'PKR',
  timeZone: 'Asia/Karachi',
  /** Opening hours used by the schedule grid (24h clock). */
  scheduleStartHour: 9,
  scheduleEndHour: 22,
} as const;

// Terms quoted on the Privacy, Terms and Refund pages. Change a number here
// and every page that mentions it updates.
//
// TODO(owner): confirm these match how the salon actually works.
export const POLICY = {
  lastUpdated: '2026-09-26',
  /** Free cancellation / reschedule window for regular appointments. */
  cancelNoticeHours: 24,
  /** Free cancellation window for bridal and event bookings. */
  bridalCancelNoticeDays: 14,
  /** Share of a bridal/event booking taken as an advance to secure the date. */
  bridalAdvancePercent: 30,
  /** Minutes late before an appointment may be shortened or rebooked. */
  lateGraceMinutes: 15,
  /** Days a customer has to raise a problem with a service. */
  serviceComplaintDays: 3,
  /** Days an unopened, unused product can be returned. */
  productReturnDays: 7,
  /** Default gift voucher validity when no expiry is printed on it. */
  voucherValidityMonths: 12,
  /** Days to process an approved refund. */
  refundProcessingDays: 10,
} as const;
