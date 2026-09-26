// Single source of truth for business details shown across the site,
// invoices and emails. Previously these were hard-coded in several places
// and disagreed with each other (Karachi vs Lahore, two phone numbers,
// two sets of opening hours).
//
// TODO(owner): confirm these values. Leave a social URL empty to hide its icon.
export const SITE = {
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
