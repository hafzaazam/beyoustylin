import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType } from 'react';
import { Booking, Chair, Customer, Deal, Invoice, Service, Staff, AppointmentRequest, DiscountCode, GiftVoucher, Sale } from '@/types/salon';

// ---- fixtures -------------------------------------------------------------
const now = new Date();
const at = (h: number, m = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m).toISOString();

const staff: Staff[] = [
  { id: 'st1', name: 'Hina', role: 'Makeup Artist', phone: '03001111111', status: 'active', createdAt: at(8) },
  { id: 'st2', name: 'Sara', role: 'Hairdresser', phone: '03002222222', status: 'active', createdAt: at(8) },
];
const chairs: Chair[] = [{ id: 'ch1', name: 'Chair 1', status: 'active' }, { id: 'ch2', name: 'Bridal Suite', status: 'active' }];
const customers: Customer[] = [
  { id: 'c1', name: 'Ayesha Khan', phone: '03003333333', email: 'a@x.com', status: 'active', createdAt: at(8), userId: 'u1' },
  { id: 'c2', name: 'Walk In', phone: '03004444444', status: 'active', createdAt: at(8) },
];
const services: Service[] = [
  { id: 's1', name: 'Haircut', category: 'Hair Cutting', price: 1500, duration: 30, status: 'active', description: 'Signature cut' },
  { id: 's2', name: 'Hydra Facial', category: 'Facial', price: 6000, duration: 60, status: 'active' },
  { id: 's3', name: 'Bridal Makeup', category: 'Makeup', price: 0, duration: 180, status: 'disabled' },
];
const deals: Deal[] = [{ id: 'd1', name: 'Glow Combo', serviceIds: ['s1', 's2'], discountedPrice: 6500, totalDuration: 90, status: 'active' }];
const bookings: Booking[] = [
  { id: 'b1', customerId: 'c1', staffId: 'st1', chairId: 'ch1', serviceIds: ['s1'], startTime: at(10), endTime: at(10, 30), totalPrice: 1500, totalDuration: 30, status: 'confirmed', createdAt: at(8) },
  { id: 'b2', customerId: 'c2', staffId: 'st2', chairId: 'ch2', serviceIds: [], dealId: 'd1', startTime: at(12), endTime: at(13, 30), totalPrice: 6500, totalDuration: 90, status: 'started', createdAt: at(9), notes: 'Sensitive skin' },
  { id: 'b3', customerId: 'c1', staffId: 'st2', chairId: 'ch1', serviceIds: ['s2'], startTime: at(7), endTime: at(8), totalPrice: 6000, totalDuration: 60, status: 'completed', createdAt: at(6) },
];
const invoices: Invoice[] = [
  { id: 'i1', invoiceNumber: 'BYS-2026-00001', bookingId: 'b1', customerId: 'c1', staffId: 'st1', items: [{ name: 'Haircut', price: 1500, type: 'service' }], totalAmount: 1200, createdAt: at(8), status: 'unpaid', subtotal: 1500, discountCode: 'EID20', discountAmount: 300, giftVoucherId: 'gv1', voucherAmount: 500 },
  { id: 'i3', invoiceNumber: 'BYS-2026-00003', bookingId: 'b3', customerId: 'c1', staffId: 'st2', items: [{ name: 'Hydra Facial', price: 6000, type: 'service' }], totalAmount: 6000, createdAt: at(6), status: 'paid', paidAt: at(8), paymentMethod: 'Cash', subtotal: 6000, discountAmount: 0, voucherAmount: 0 },
];
const appointmentRequests: AppointmentRequest[] = [
  { id: 'r1', type: 'booking', name: 'Sana', phone: '03005555555', serviceId: 's1', preferredDate: '2026-10-01', preferredTime: '11:00', status: 'pending', createdAt: at(8) },
  { id: 'r2', type: 'quote', name: 'Hira', phone: '03006666666', budget: '50k', notes: 'Wedding party of 5', status: 'dismissed', createdAt: at(8) },
];


const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const discountCodes: DiscountCode[] = [
  { id: 'dc1', code: 'EID20', description: 'Eid offer', kind: 'percent', value: 20, appliesTo: 'all', minSpend: 0, uses: 3, maxUses: 10, status: 'active', createdAt: at(8) },
  { id: 'dc2', code: 'OLD500', kind: 'fixed', value: 500, appliesTo: 'services', minSpend: 2000, uses: 1, endsOn: '2020-01-01', status: 'active', createdAt: at(8) },
  { id: 'dc3', code: 'SOON', kind: 'percent', value: 10, appliesTo: 'products', minSpend: 0, uses: 0, startsOn: iso(new Date(today.getTime() + 7 * 86400000)), status: 'active', createdAt: at(8) },
];
const giftVouchers: GiftVoucher[] = [
  { id: 'gv1', code: 'GV-ABCDE-12345', initialValue: 5000, balance: 4500, recipientName: 'Mahnoor', recipientPhone: '03007777777', purchaserCustomerId: 'c1', saleId: 's1', status: 'active', createdAt: at(8) },
  { id: 'gv2', code: 'GV-ZZZZZ-00000', initialValue: 2000, balance: 0, status: 'active', createdAt: at(8) },
];
const sales: Sale[] = [
  { id: 's1', saleNumber: 'BYS-S-2026-00001', subtotal: 5000, discountAmount: 0, total: 5000, voucherAmount: 0, paymentMethod: 'Cash', status: 'paid', createdAt: at(8), items: [] },
];

const byId = <T extends { id: string }>(list: T[]) => (id: string) => list.find(x => x.id === id);
const ok = vi.fn(async () => true);

vi.mock('@/context/SalonContext', () => ({
  useSalon: () => ({
    staff, customers, services, deals, chairs, bookings, invoices, appointmentRequests,
    discountCodes, giftVouchers, sales, products: [],
    addDiscountCode: ok, updateDiscountCode: ok, toggleDiscountCodeStatus: ok, deleteDiscountCode: ok, updateGiftVoucher: ok,
    applyInvoiceDiscount: vi.fn(async () => null), removeInvoiceDiscount: ok, applyInvoiceGiftVoucher: vi.fn(async () => null), removeInvoiceGiftVoucher: ok,
    getGiftVoucherById: byId(giftVouchers), getProductById: () => undefined,
    loading: false, privateLoaded: true, live: true, refresh: ok,
    addStaff: ok, updateStaff: ok, toggleStaffStatus: ok, deleteStaff: ok,
    addCustomer: vi.fn(async () => customers[0]), updateCustomer: ok, toggleCustomerStatus: ok, deleteCustomer: ok,
    linkCustomerAccount: ok, findCustomerByPhone: () => undefined,
    addService: ok, updateService: ok, toggleServiceStatus: ok, deleteService: ok,
    addDeal: ok, updateDeal: ok, toggleDealStatus: ok, deleteDeal: ok,
    addChair: ok, updateChair: ok, toggleChairStatus: ok, deleteChair: ok,
    addBooking: vi.fn(async () => bookings[0]), updateBooking: vi.fn(async () => bookings[0]),
    updateBookingStatus: ok, deleteBooking: ok, checkConflict: () => null,
    markInvoicePaid: ok, markInvoiceUnpaid: ok, payBooking: ok,
    addAppointmentRequest: vi.fn(async () => ({ error: null })), updateAppointmentRequestStatus: ok,
    markRequestConverted: ok, deleteAppointmentRequest: ok,
    getStaffById: byId(staff), getCustomerById: byId(customers), getServiceById: byId(services),
    getDealById: byId(deals), getChairById: byId(chairs), getBookingById: byId(bookings),
    getInvoiceByBookingId: (bid: string) => invoices.find(i => i.bookingId === bid),
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'owner', email: 'owner@beyoustylin.com' }, session: null, roles: ['owner'], loading: false,
    rolesLoaded: true, isStaff: true, isCustomer: false, canManage: true, passwordRecovery: false,
    hasRole: (r: string) => r === 'owner', signIn: ok, signUp: ok, signOut: ok, sendPasswordReset: ok, updatePassword: ok,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(async (fn: string) => fn === 'list_team_members'
      ? { data: [{ user_id: 'owner', email: 'owner@beyoustylin.com', full_name: 'Owner', role: 'owner', created_at: at(8) }], error: null }
      : { data: null, error: null }),
  },
}));

beforeAll(() => {
  // recharts' ResponsiveContainer needs ResizeObserver in jsdom
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView = vi.fn();
});

import { fireEvent } from '@testing-library/react';

const renderAt = async (load: () => Promise<{ default: ComponentType }>, path: string) => {
  const { default: Page } = await load();
  return render(<MemoryRouter initialEntries={[path]}><Page /></MemoryRouter>);
};

describe('vouchers & invoices pages', () => {
  it('lists discount codes with derived states', async () => {
    await renderAt(() => import('@/pages/VouchersPage'), '/admin/vouchers');
    expect(await screen.findByText('EID20')).toBeInTheDocument();
    expect(screen.getByText('20% off')).toBeInTheDocument();
    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  }, 30_000);

  it('lists gift vouchers and looks a code up', async () => {
    await renderAt(() => import('@/pages/VouchersPage'), '/admin/vouchers?tab=gift');
    expect(await screen.findByText('Mahnoor')).toBeInTheDocument();
    expect(screen.getByText('Partly used')).toBeInTheDocument();
    expect(screen.getByText('Used up')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Check a voucher code/i), { target: { value: 'gv-abcde-12345' } });
    expect(await screen.findByText(/^Balance/, { selector: 'span' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Check a voucher code/i), { target: { value: 'GV-NOPE' } });
    expect(await screen.findByText('No gift voucher with that code.')).toBeInTheDocument();
  }, 30_000);

  it('shows discount, voucher and amount due on invoices', async () => {
    await renderAt(() => import('@/pages/InvoicesPage'), '/admin/invoices');
    expect((await screen.findAllByText('BYS-2026-00001')).length).toBeGreaterThan(0);
    // Phone cards and the desktop table are both in the DOM (CSS decides which shows).
    expect(screen.getAllByText(/EID20/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Due Rs. 700').length).toBeGreaterThan(0);
    const more = screen.getAllByRole('button', { name: 'More actions for BYS-2026-00001' })[0];
    fireEvent.keyDown(more, { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: /Discount code or gift voucher/ }));
    expect(await screen.findByText('Amount due')).toBeInTheDocument();
  }, 30_000);
});

describe('invoice PDF', () => {
  it('builds with discount and gift voucher lines', async () => {
    const { buildInvoicePdf } = await import('@/lib/invoicePdf');
    const doc = buildInvoicePdf({ invoice: invoices[0], customerName: 'Ayesha Khan', staffName: 'Hina' });
    expect(doc.getNumberOfPages()).toBe(1);
    const paidByVoucher = buildInvoicePdf({ invoice: { ...invoices[0], status: 'paid', paymentMethod: 'Gift voucher', voucherAmount: 1200 } });
    expect(paidByVoucher.getNumberOfPages()).toBe(1);
  });
});
