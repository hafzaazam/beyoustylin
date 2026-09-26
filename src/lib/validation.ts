import { z } from 'zod';

// Matches the checks enforced by the appointment_requests insert policy.
const phone = z
  .string()
  .trim()
  .min(7, 'Enter a valid phone number')
  .max(20, 'Phone number is too long')
  .regex(/^[+\d][\d\s-]*$/, 'Phone can only contain digits, spaces, dashes and a leading +');

const optionalEmail = z
  .string()
  .trim()
  .max(255)
  .email('Enter a valid email address')
  .optional()
  .or(z.literal('').transform(() => undefined));

const name = z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name is too long');

export const staffSchema = z.object({
  name,
  role: z.string().min(1, 'Choose a role'),
  phone,
});

export const customerSchema = z.object({
  name,
  phone,
  email: optionalEmail,
  address: z.string().trim().max(300).optional(),
});

export const serviceSchema = z.object({
  name,
  category: z.string().min(1, 'Choose a category'),
  description: z.string().trim().max(1000).optional(),
  price: z.coerce.number({ invalid_type_error: 'Price must be a number' }).min(0, 'Price cannot be negative'),
  duration: z.coerce
    .number({ invalid_type_error: 'Duration must be a number' })
    .int('Duration must be whole minutes')
    .min(5, 'Duration must be at least 5 minutes')
    .max(720, 'Duration cannot exceed 12 hours'),
});

export const dealSchema = z.object({
  name,
  discountedPrice: z.coerce.number({ invalid_type_error: 'Price must be a number' }).min(0, 'Price cannot be negative'),
  serviceIds: z.array(z.string()).min(1, 'Select at least one service'),
});

export const chairSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50, 'Name is too long'),
});

export const bookingRequestSchema = z.object({
  name,
  phone,
  email: optionalEmail,
  selection: z.string().min(1, 'Please select a package or service'),
  date: z.string().min(1, 'Choose a date'),
  time: z.string().min(1, 'Choose a time'),
  notes: z.string().trim().max(500).optional(),
});

export const quoteRequestSchema = z.object({
  name,
  phone,
  email: optionalEmail,
  selection: z.string().optional(),
  eventDate: z.string().optional(),
  budget: z.string().trim().max(100).optional(),
  notes: z.string().trim().min(10, 'Tell us a little more (at least 10 characters)').max(2000),
});

export const signUpSchema = z.object({
  fullName: name,
  email: z.string().trim().email('Enter a valid email address'),
  phone: phone.optional().or(z.literal('').transform(() => undefined)),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/** First human-readable problem, or null when valid. */
export const firstError = (result: z.SafeParseReturnType<unknown, unknown>): string | null =>
  result.success ? null : result.error.issues[0]?.message ?? 'Please check the form';
