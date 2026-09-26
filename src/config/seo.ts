// Per-route search and social-share metadata. <RouteMeta /> applies it on
// every navigation; index.html holds the same defaults for crawlers that
// don't run JavaScript. Keep public/sitemap.xml in step with PUBLIC_ROUTES.

/** Public origin used for canonical and share URLs. Override with VITE_SITE_URL. */
// TODO(owner): switch to the custom domain once it is live.
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://beyoustylin.lovable.app').replace(/\/$/, '');

export const DEFAULT_OG_IMAGE = '/og-image.jpg';

export interface RouteSeo {
  title: string;
  description: string;
}

export const DEFAULT_SEO: RouteSeo = {
  title: 'BeYou Stylin — Premium Salon & Bridal Studio in Karachi',
  description: 'Luxury bridal makeup, hair styling, mehndi, facials and salon packages in Karachi. Book your appointment online with BeYou Stylin.',
};

export const PUBLIC_ROUTES: Record<string, RouteSeo> = {
  '/': DEFAULT_SEO,
  '/services': {
    title: 'Salon Services & Prices — BeYou Stylin Karachi',
    description: 'Hair cuts and colour, bridal and party makeup, Hydra and 3D facials, nails and more. See prices and durations and book online.',
  },
  '/packages': {
    title: 'Bridal & Party Packages — BeYou Stylin Karachi',
    description: 'All-inclusive bridal, barat, walima and party packages that bundle makeup, hair and skin services at a single package price.',
  },
  '/mehndi': {
    title: 'Mehndi Artists & Bridal Henna — BeYou Stylin Karachi',
    description: 'Intricate bridal, Arabic and party mehndi designs by our henna artists, at the studio or at home. Request a quote.',
  },
  '/privacy': {
    title: 'Privacy Policy — BeYou Stylin',
    description: 'How BeYou Stylin collects, uses and protects your personal information.',
  },
  '/terms': {
    title: 'Terms & Conditions — BeYou Stylin',
    description: 'Booking, payment, voucher and studio terms for BeYou Stylin appointments.',
  },
  '/refund-policy': {
    title: 'Refund & Cancellation Policy — BeYou Stylin',
    description: 'Cancelling or rescheduling appointments and bridal bookings, and refunds for services, products and gift vouchers.',
  },
};

/** Signed-in areas and utility pages that should stay out of search results. */
export const NOINDEX_PREFIXES = ['/admin', '/account', '/auth', '/reset-password'];
