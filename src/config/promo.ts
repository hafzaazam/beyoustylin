// The promotional popup shown to visitors on the public site.
// Set `enabled: false` to switch it off, or change the copy for a new campaign.
//
// TODO(owner): confirm the offer. If you add a discount `code`, create the same
// code under Admin → Vouchers & codes so it works at checkout.
export const PROMO = {
  enabled: true,
  /** Bump this when the campaign changes so visitors who closed the old one see the new one. */
  id: '2026-bridal-season',
  eyebrow: 'Bridal season 2026',
  title: 'Your big day, beautifully planned.',
  body: 'Book a free bridal consultation — we’ll map out your makeup, hair and mehndi across every event and share a personalised quote within 24 hours.',
  /** Optional discount code shown with a copy button. Leave empty to hide. */
  code: '',
  ctaLabel: 'Book a free consultation',
  ctaHref: '/#book',
  /** Show after this long on the page, or once the visitor scrolls halfway — whichever comes first. */
  delayMs: 12000,
  /** Days before the popup can appear again after being closed. */
  snoozeDays: 7,
  /** Paths where the popup never appears (checkout-style or legal pages). */
  hideOn: ['/auth', '/reset-password', '/privacy', '/terms', '/refund-policy'],
} as const;
