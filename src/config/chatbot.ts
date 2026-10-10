// Knowledge for the website assistant. No AI: the assistant matches the
// visitor's words against the keywords below and replies with these answers,
// plus live prices from the services and packages in Admin.
//
// To teach it something new, add an entry: a few keywords people would type
// (English or Roman Urdu) and the answer. Facts come from SITE / POLICY /
// PROMO so the assistant never disagrees with the rest of the site.
//
// TODO(owner): add answers for questions only you can answer, e.g. home
// service, walk-ins, parking, men's services, bridal trials. Until then the
// assistant sends those visitors to the phone number instead of guessing.
import { POLICY, SITE } from '@/config/site';
import { PROMO } from '@/config/promo';
import { formatDuration, formatPKR } from '@/lib/format';
import type { Deal, Service } from '@/types/salon';

export type ChatLink = { label: string; to: string };
export type ChatAnswer = { text: string; links?: ChatLink[] };
export type ChatData = { services: Service[]; deals: Deal[]; loading: boolean };

export type KnowledgeEntry = {
  id: string;
  /** Short label used for suggestion chips. */
  label: string;
  /** Words or phrases that point to this answer. Multi-word phrases score higher. */
  keywords: string[];
  answer: ChatAnswer | ((data: ChatData) => ChatAnswer);
};

const BOOK: ChatLink = { label: 'Book appointment', to: '/#book' };
const CALL: ChatLink = { label: `Call ${SITE.phoneDisplay}`, to: SITE.phoneHref };

const isMehndi = (s: Service) => /mehndi|henna/i.test(`${s.category} ${s.name}`);
const cheapest = (prices: number[]) => {
  const valid = prices.filter(p => p > 0);
  return valid.length ? Math.min(...valid) : null;
};
const MENU_LOADING: ChatAnswer = { text: 'Our menu is still loading. Please ask again in a moment.' };

export const KNOWLEDGE: KnowledgeEntry[] = [
  {
    id: 'prices',
    label: 'Prices',
    keywords: ['price', 'menu', 'rate list', 'price list', 'services'],
    answer: ({ services, deals, loading }) => {
      const active = services.filter(s => s.status === 'active');
      if (loading && !active.length) return MENU_LOADING;
      const byCategory = new Map<string, number[]>();
      active.forEach(s => byCategory.set(s.category, [...(byCategory.get(s.category) ?? []), s.price]));
      const lines = [...byCategory].map(([cat, prices]) => {
        const from = cheapest(prices);
        return `• ${cat}${from !== null ? `: from ${formatPKR(from)}` : ''}`;
      });
      const bridalFrom = cheapest(deals.filter(d => d.status === 'active').map(d => d.discountedPrice));
      if (bridalFrom !== null) lines.push(`• Bridal packages: from ${formatPKR(bridalFrom)}`);
      return {
        text: lines.length
          ? `Here's a quick look at our prices:\n${lines.join('\n')}\n\nAsk me about any service by name, like "facial price".`
          : `Prices are shared on request. Call us on ${SITE.phoneDisplay}.`,
        links: [{ label: 'Full price list', to: '/services' }, BOOK],
      };
    },
  },
  {
    id: 'packages',
    label: 'Bridal packages',
    keywords: ['bridal', 'package', 'bridal package', 'bridal makeup'],
    answer: ({ deals, loading }) => {
      const active = deals.filter(d => d.status === 'active');
      if (loading && !active.length) return MENU_LOADING;
      const lines = active.slice(0, 6).map(d => `• ${d.name}: ${formatPKR(d.discountedPrice)} (${formatDuration(d.totalDuration)})`);
      const consult = PROMO.enabled ? '\n\nWe also offer a free bridal consultation and share a personalised quote within 24 hours.' : '';
      return {
        text: `${lines.length ? `Our bridal packages:\n${lines.join('\n')}` : 'We put together bridal looks around your events.'}\n\nA ${POLICY.bridalAdvancePercent}% advance holds your date.${consult}`,
        links: [{ label: 'See packages', to: '/packages' }, { label: 'Get a bridal quote', to: '/?mode=quote#book' }],
      };
    },
  },
  {
    id: 'mehndi',
    label: 'Mehndi',
    keywords: ['mehndi', 'mehndi design', 'mehndi price'],
    answer: ({ services, loading }) => {
      const list = services.filter(s => s.status === 'active' && isMehndi(s));
      if (loading && !list.length) return MENU_LOADING;
      const lines = list.slice(0, 6).map(s => `• ${s.name}: ${formatPKR(s.price)}`);
      return {
        text: `${lines.length ? `Our mehndi options:\n${lines.join('\n')}\n\n` : ''}From Sodani bridal work to modern Arabic designs, our mehndi artists design every pattern around your outfit and event.`,
        links: [{ label: 'Explore mehndi', to: '/mehndi' }, BOOK],
      };
    },
  },
  {
    id: 'hours',
    label: 'Timings',
    keywords: ['hours', 'open', 'sunday', 'today', 'opening time', 'closing time'],
    answer: { text: `We're open ${SITE.hours}.`, links: [BOOK, CALL] },
  },
  {
    id: 'location',
    label: 'Location',
    keywords: ['location', 'branch', 'map', 'directions'],
    answer: {
      text: `We're in ${SITE.city}. Call us on ${SITE.phoneDisplay} and we'll guide you to the studio.`,
      links: [CALL],
    },
  },
  {
    id: 'contact',
    label: 'Contact',
    keywords: ['contact', 'talk to someone', 'human', 'staff'],
    answer: {
      text: `You can reach us on ${SITE.phoneDisplay} or email ${SITE.email}. We're available ${SITE.hours}.`,
      links: [CALL, { label: 'Email us', to: `mailto:${SITE.email}` }],
    },
  },
  {
    id: 'book',
    label: 'How to book',
    keywords: ['book', 'how to book', 'available', 'free slot'],
    answer: {
      text: `Choose a service, a date and a time in the booking form. We confirm every appointment by WhatsApp or phone call, so it's only booked once you hear from us.\n\nPlease arrive 10 minutes early.`,
      links: [BOOK, { label: 'Browse services', to: '/services' }],
    },
  },
  {
    id: 'cancel',
    label: 'Cancel or reschedule',
    keywords: ['cancel', 'no show'],
    answer: {
      text: `You can cancel or reschedule a regular appointment free of charge up to ${POLICY.cancelNoticeHours} hours before it starts. Call, message us, or use your account.\n\nFor bridal and event bookings, cancel ${POLICY.bridalCancelNoticeDays} days or more before the event to get your advance back.`,
      links: [{ label: 'Refund & cancellation policy', to: '/refund-policy' }, { label: 'My appointments', to: '/account/appointments' }],
    },
  },
  {
    id: 'late',
    label: 'Running late',
    keywords: ['late'],
    answer: {
      text: `Please let us know as soon as you can. If you're more than ${POLICY.lateGraceMinutes} minutes late, we may need to shorten your service or move you to another slot.`,
      links: [CALL],
    },
  },
  {
    id: 'advance',
    label: 'Advance payment',
    keywords: ['advance', 'advance payment'],
    answer: {
      text: `Bridal and event bookings are secured with a ${POLICY.bridalAdvancePercent}% advance. Your date is held only once the advance is received.`,
      links: [{ label: 'Get a bridal quote', to: '/?mode=quote#book' }],
    },
  },
  {
    id: 'payment',
    label: 'Payment',
    keywords: ['payment', 'payment method'],
    answer: {
      text: 'We accept cash, card and bank transfer. Payment is due when your service ends, unless agreed otherwise. All prices are in Pakistani Rupees.',
    },
  },
  {
    id: 'refund',
    label: 'Refunds',
    keywords: ['refund', 'unhappy', 'complaint', 'return'],
    answer: {
      text: `If something isn't right, tell us before you leave or within ${POLICY.serviceComplaintDays} days, and we'll fix it free of charge.\n\nUnopened products can be returned within ${POLICY.productReturnDays} days with your receipt. Approved refunds are paid within ${POLICY.refundProcessingDays} working days.`,
      links: [{ label: 'Full refund policy', to: '/refund-policy' }],
    },
  },
  {
    id: 'vouchers',
    label: 'Gift vouchers',
    keywords: ['voucher', 'gift'],
    answer: {
      text: `Gift vouchers make a lovely present. Unless a different date is printed on it, a voucher is valid for ${POLICY.voucherValidityMonths} months, and any unused balance stays on it until then. Vouchers can't be exchanged for cash.`,
      links: [CALL],
    },
  },
  {
    id: 'offers',
    label: 'Offers',
    keywords: ['discount', 'offer'],
    answer: ({ deals }) => {
      const count = deals.filter(d => d.status === 'active').length;
      const promo = PROMO.enabled ? `${PROMO.title} ${PROMO.body}` : '';
      const code = PROMO.enabled && PROMO.code ? `\n\nUse code ${PROMO.code} at checkout.` : '';
      return {
        text: `${promo || 'Our packages bundle services at a better price than booking them one by one.'}${count ? `\n\nWe currently have ${count} package${count > 1 ? 's' : ''} available.` : ''}${code}`,
        links: [{ label: 'See packages', to: '/packages' }],
      };
    },
  },
  {
    id: 'artists',
    label: 'Our artists',
    keywords: ['artist', 'experience', 'who'],
    answer: {
      text: `${SITE.name} is a ${SITE.tagline.toLowerCase()} in ${SITE.city.split(',')[0]}. Our senior artists bring over a decade of experience in bridal makeup, hair styling, mehndi and skincare.`,
      links: [{ label: 'About us', to: '/#about' }],
    },
  },
  {
    id: 'account',
    label: 'My account',
    keywords: ['account', 'login', 'sign up', 'my appointment', 'track'],
    answer: {
      text: 'With an account you can see your appointments, requests, invoices and saved favourites in one place.',
      links: [{ label: 'Sign in or sign up', to: '/auth' }, { label: 'My appointments', to: '/account/appointments' }],
    },
  },
  {
    // Questions only the team can answer. Move a topic into its own entry
    // once you have a confirmed answer for it.
    id: 'ask-team',
    label: 'Ask the team',
    keywords: ['home service', 'home', 'walk in', 'parking', 'men', 'gents', 'male', 'trial', 'kids', 'children'],
    answer: {
      text: `Our team can answer that one directly. Call us on ${SITE.phoneDisplay}, ${SITE.hours}.`,
      links: [CALL],
    },
  },
];

/** Chips shown when the chat opens. */
export const STARTERS = ['prices', 'packages', 'book', 'hours', 'mehndi', 'contact'];

export const GREETING = `Hi! I'm the ${SITE.name} assistant. Ask me about prices, bridal packages, mehndi, timings or booking.`;

export const FALLBACK: ChatAnswer = {
  text: `Sorry, I don't have an answer for that yet. Our team can help on ${SITE.phoneDisplay}, ${SITE.hours}.`,
  links: [CALL, BOOK],
};

/**
 * Words people use for the same thing, mapped to the keyword the knowledge
 * above uses. Includes common Roman Urdu spellings.
 */
export const SYNONYMS: Record<string, string> = {
  prices: 'price', pricing: 'price', rate: 'price', rates: 'price', charges: 'price', charge: 'price',
  cost: 'price', costs: 'price', fee: 'price', fees: 'price', kitna: 'price', kitne: 'price', kitni: 'price',
  qeemat: 'price', qimat: 'price', paise: 'price', paisay: 'price', expensive: 'price', cheap: 'price',
  cheapest: 'price', budget: 'price', rs: 'price', rupees: 'price',
  timing: 'hours', timings: 'hours', time: 'hours', opening: 'open', khula: 'open', khulta: 'open',
  closed: 'open', close: 'open', band: 'open', waqt: 'hours', schedule: 'hours', hour: 'hours',
  where: 'location', address: 'location', located: 'location', kahan: 'location', kidhar: 'location', area: 'location',
  phone: 'contact', number: 'contact', call: 'contact', whatsapp: 'contact', email: 'contact', reach: 'contact',
  booking: 'book', booked: 'book', appointment: 'book', appointments: 'book', reserve: 'book', reservation: 'book',
  slot: 'book', slots: 'book', availability: 'available',
  cancellation: 'cancel', reschedule: 'cancel', postpone: 'cancel', change: 'cancel',
  bride: 'bridal', dulhan: 'bridal', shaadi: 'bridal', shadi: 'bridal', wedding: 'bridal', barat: 'bridal',
  baraat: 'bridal', walima: 'bridal', nikah: 'bridal', nikkah: 'bridal', engagement: 'bridal',
  mehendi: 'mehndi', henna: 'mehndi', heena: 'mehndi', mehandi: 'mehndi',
  packages: 'package', deal: 'package', deals: 'package', bundle: 'package', combo: 'package',
  discounts: 'discount', offers: 'offer', promo: 'offer', coupon: 'offer', sale: 'offer', code: 'offer',
  pay: 'payment', card: 'payment', cash: 'payment', easypaisa: 'payment', jazzcash: 'payment', transfer: 'payment',
  refunds: 'refund', returns: 'return', vouchers: 'voucher', giftcard: 'voucher',
  deposit: 'advance', token: 'advance',
  delay: 'late', artists: 'artist', experienced: 'experience', signup: 'sign up', register: 'sign up',
};

export const GREETING_WORDS = ['hi', 'hii', 'hello', 'helo', 'hey', 'salam', 'salaam', 'assalam', 'assalamualaikum', 'aoa', 'asalam', 'salams', 'o', 'alaikum', 'alaykum', 'walaikum', 'good', 'morning', 'evening'];
export const THANKS_WORDS = ['thanks', 'thank', 'thx', 'shukriya', 'shukria', 'jazakallah', 'great', 'ok', 'okay', 'bye'];

/** Words that carry no meaning on their own, ignored when matching. */
export const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'am', 'do', 'does', 'did', 'you', 'your', 'i', 'me', 'my', 'we', 'our', 'us',
  'what', 'whats', 'how', 'can', 'could', 'would', 'for', 'of', 'to', 'in', 'on', 'at', 'and', 'or', 'with',
  'please', 'pls', 'plz', 'tell', 'about', 'know', 'want', 'need', 'get', 'have', 'has', 'it', 'this', 'that',
  'kya', 'ka', 'ki', 'ke', 'hai', 'hain', 'mujhe', 'batao', 'bata', 'dein', 'se', 'ko', 'ye', 'yeh', 'aap', 'ap',
  'much', 'many', 'any', 'there', 'be', 'will', 'some', 'like', 'koi', 'bhi', 'hy', 'he', 'h',
]);
