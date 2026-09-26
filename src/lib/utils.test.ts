import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';
import { friendlyError } from './errors';
import { formatDuration, formatPKR, toLocalInputValue } from './format';
import { bookingRequestSchema, customerSchema, firstError, serviceSchema, signUpSchema } from './validation';

describe('toCsv', () => {
  it('escapes commas, quotes and newlines', () => {
    expect(toCsv(['a', 'b'], [['x,y', 'say "hi"'], ['line\nbreak', null]]))
      .toBe('a,b\n"x,y","say ""hi"""\n"line\nbreak",');
  });
  it('writes numbers as-is', () => {
    expect(toCsv(['n'], [[1500]])).toBe('n\n1500');
  });
});

describe('friendlyError', () => {
  it('passes database trigger messages through', () => {
    expect(friendlyError({ code: 'P0001', message: 'This chair is already booked for part of this time.' }))
      .toBe('This chair is already booked for part of this time.');
  });
  it('explains foreign-key failures', () => {
    expect(friendlyError({ code: '23503', message: 'violates foreign key constraint' })).toMatch(/Disable it instead/);
  });
  it('explains permission failures', () => {
    expect(friendlyError({ code: '42501', message: 'permission denied' })).toMatch(/permission/);
  });
  it('handles strings and empty values', () => {
    expect(friendlyError('Plain')).toBe('Plain');
    expect(friendlyError(null)).toMatch(/Something went wrong/);
  });
});

describe('format', () => {
  it('formats rupees without decimals', () => {
    expect(formatPKR(25000)).toBe('Rs. 25,000');
    expect(formatPKR(1499.6)).toBe('Rs. 1,500');
  });
  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(135)).toBe('2h 15m');
  });
  it('produces a datetime-local value in local time', () => {
    const d = new Date(2026, 9, 1, 14, 5);
    expect(toLocalInputValue(d)).toBe('2026-10-01T14:05');
  });
});

describe('validation', () => {
  it('requires a real phone number', () => {
    expect(firstError(customerSchema.safeParse({ name: 'Ayesha', phone: '12' }))).toMatch(/phone/i);
    expect(firstError(customerSchema.safeParse({ name: 'Ayesha', phone: '0300 1234567' }))).toBeNull();
  });
  it('treats an empty email as absent', () => {
    const r = customerSchema.safeParse({ name: 'Ayesha', phone: '03001234567', email: '' });
    expect(r.success && r.data.email).toBeFalsy();
  });
  it('rejects negative prices and tiny durations', () => {
    expect(firstError(serviceSchema.safeParse({ name: 'Cut', category: 'Hair', price: '-1', duration: '30' }))).toMatch(/negative/);
    expect(firstError(serviceSchema.safeParse({ name: 'Cut', category: 'Hair', price: '100', duration: '2' }))).toMatch(/at least 5/);
  });
  it('requires a selection for booking requests', () => {
    expect(firstError(bookingRequestSchema.safeParse({ name: 'Sana', phone: '03001234567', selection: '', date: '2026-10-01', time: '10:00' })))
      .toMatch(/select/i);
  });
  it('requires 8+ character passwords at sign-up', () => {
    expect(firstError(signUpSchema.safeParse({ fullName: 'Hira', email: 'h@x.com', password: 'short' }))).toMatch(/8 characters/);
  });
});
