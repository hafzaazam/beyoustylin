import { z } from 'zod';
import { DiscountCode, GiftVoucher } from '@/types/salon';
import { formatPKR, toLocalDateKey } from '@/lib/format';

export type DiscountState = 'active' | 'scheduled' | 'expired' | 'used_up' | 'disabled';
export type VoucherState = 'active' | 'partly_used' | 'used_up' | 'expired' | 'disabled';

const today = () => toLocalDateKey(new Date());

/** Mirrors the checks in validate_discount_code(), so staff see why a code won't work. */
export const discountState = (d: DiscountCode, now = today()): DiscountState => {
  if (d.status !== 'active') return 'disabled';
  if (d.maxUses !== undefined && d.uses >= d.maxUses) return 'used_up';
  if (d.endsOn && now > d.endsOn) return 'expired';
  if (d.startsOn && now < d.startsOn) return 'scheduled';
  return 'active';
};

export const voucherState = (v: GiftVoucher, now = today()): VoucherState => {
  if (v.status !== 'active') return 'disabled';
  if (v.balance <= 0) return 'used_up';
  if (v.expiresOn && now > v.expiresOn) return 'expired';
  if (v.balance < v.initialValue) return 'partly_used';
  return 'active';
};

export const STATE_LABEL: Record<DiscountState | VoucherState, string> = {
  active: 'Active',
  scheduled: 'Scheduled',
  expired: 'Expired',
  used_up: 'Used up',
  disabled: 'Disabled',
  partly_used: 'Partly used',
};

export const STATE_CLASS: Record<DiscountState | VoucherState, string> = {
  active: 'status-completed',
  partly_used: 'status-confirmed',
  scheduled: 'status-pending',
  expired: 'status-canceled',
  used_up: 'status-muted',
  disabled: 'status-muted',
};

export const discountLabel = (d: Pick<DiscountCode, 'kind' | 'value'>) =>
  d.kind === 'percent' ? `${d.value}% off` : `${formatPKR(d.value)} off`;

export const APPLIES_TO_LABEL: Record<DiscountCode['appliesTo'], string> = {
  all: 'Services & products',
  services: 'Services only',
  products: 'Products only',
};

// No 0/O/1/I so codes read clearly over the phone or on a flyer.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const randomCode = (prefix = 'BYS', length = 5) => {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return `${prefix}${Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('')}`;
};

// Same rules as the discount_codes table constraints.
export const discountCodeSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, 'Code must be 3–30 letters, numbers, - or _'),
  description: z.string().trim().max(200).optional(),
  kind: z.enum(['percent', 'fixed']),
  value: z.coerce.number({ invalid_type_error: 'Enter a value' }).positive('Value must be more than 0'),
  appliesTo: z.enum(['all', 'services', 'products']),
  minSpend: z.coerce.number({ invalid_type_error: 'Minimum spend must be a number' }).min(0, 'Minimum spend cannot be negative'),
  startsOn: z.string().optional(),
  endsOn: z.string().optional(),
  maxUses: z.union([z.literal(''), z.coerce.number().int('Whole number').positive('Must be at least 1')]).optional(),
}).superRefine((d, ctx) => {
  if (d.kind === 'percent' && d.value > 100) ctx.addIssue({ code: 'custom', message: 'A percentage cannot be more than 100', path: ['value'] });
  if (d.startsOn && d.endsOn && d.endsOn < d.startsOn) ctx.addIssue({ code: 'custom', message: 'End date is before the start date', path: ['endsOn'] });
});

export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
