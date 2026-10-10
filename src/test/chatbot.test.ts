import { describe, expect, it } from 'vitest';
import { reply } from '@/lib/chatbot';
import type { Deal, Service } from '@/types/salon';

const svc = (id: string, name: string, category: string, price: number, duration = 60): Service =>
  ({ id, name, category, price, duration, status: 'active' });

const services: Service[] = [
  svc('s1', 'Bridal Makeup', 'Makeup', 45000, 180),
  svc('s2', 'Party Makeup', 'Makeup', 12000, 90),
  svc('s3', 'Facial', 'Skin', 5000),
  svc('s4', 'Hydra Facial', 'Skin', 9000),
  svc('s5', 'Haircut', 'Hair', 2500, 45),
  svc('s6', 'Keratin Treatment', 'Hair', 18000, 150),
  svc('s7', 'Bridal Mehndi', 'Mehndi', 15000, 240),
  svc('s8', 'Arabic Mehndi', 'Mehndi', 4000),
];
const deals: Deal[] = [
  { id: 'd1', name: 'Bridal Glam Package', serviceIds: ['s1', 's7'], discountedPrice: 55000, totalDuration: 420, status: 'active' },
];
const data = { services, deals, loading: false };
const source = (q: string) => reply(q, data).source;

describe('website assistant', () => {
  it.each([
    ['hi', 'greeting'],
    ['Assalam o alaikum', 'greeting'],
    ['thanks!', 'thanks'],
    ['What are your timings?', 'hours'],
    ['are you open on sunday', 'hours'],
    ['Where are you located?', 'location'],
    ['kahan hai salon', 'location'],
    ['what is your phone number', 'contact'],
    ['bridal packages', 'packages'],
    ['dulhan package kitne ka hai', 'packages'],
    ['mehndi rates', 'mehndi'],
    ['How do I book an appointment?', 'book'],
    ['can i cancel my facial', 'cancel'],
    ['reschedule appointment', 'cancel'],
    ['do you accept card', 'payment'],
    ['advance kitna dena hoga', 'advance'],
    ['i want a refund', 'refund'],
    ['gift voucher', 'vouchers'],
    ['any discount?', 'offers'],
    ['price list', 'prices'],
    ['what services do you offer', 'prices'],
    ['do you do home service', 'ask-team'],
    ['running late', 'late'],
    ['hair prices', 'category:Hair'],
    ['makeup', 'category:Makeup'],
    ['keratin', 'service-partial'],
    ['asdkjh qwe', 'fallback'],
  ])('%s → %s', (question, expected) => {
    expect(source(question)).toBe(expected);
  });

  it('quotes the live price for a named service', () => {
    const r = reply('facial kitne ka hai', data);
    expect(r.source).toBe('service');
    expect(r.text).toContain('Facial');
    expect(r.text).toContain('5,000');
    expect(r.links?.[0].to).toBe('/?service=s3#book');
  });

  it('copes with a typo', () => {
    expect(reply('facil price', data).text).toContain('Facial');
  });

  it('prefers the full service over a package for "bridal makeup price"', () => {
    const r = reply('how much is bridal makeup', data);
    expect(r.source).toBe('service');
    expect(r.text).toContain('45,000');
  });

  it('lists live packages with prices', () => {
    expect(reply('bridal package', data).text).toContain('Bridal Glam Package');
  });

  it('ignores inactive services', () => {
    const r = reply('facial', { ...data, services: services.map(s => (s.id === 's3' ? { ...s, status: 'disabled' as const } : s)) });
    expect(r.text).not.toContain('5,000');
  });

  it('asks to wait while the menu loads instead of saying there are no prices', () => {
    expect(reply('price list', { services: [], deals: [], loading: true }).text).toMatch(/loading/i);
  });

  it('falls back to the phone number when it has no answer', () => {
    const r = reply('do you sell cars', data);
    expect(r.source).toBe('fallback');
    expect(r.links?.some(l => l.to.startsWith('tel:'))).toBe(true);
  });
});
