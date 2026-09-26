import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Booking, Customer, Invoice, Product, Sale, Service, Staff } from '@/types/salon';

const now = new Date();
const at = (h: number, m = 0) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m).toISOString();

const staff: Staff[] = [{ id: 'st1', name: 'Hina', role: 'Makeup Artist', phone: '', status: 'active', createdAt: at(8) }];
const customers: Customer[] = [{ id: 'c1', name: 'Ayesha Khan', phone: '03003333333', status: 'active', createdAt: at(8) }];
const services: Service[] = [{ id: 's1', name: 'Hydra Facial', category: 'Facial', price: 3000, duration: 60, status: 'active' }];
const products: Product[] = [
  { id: 'p1', name: 'Argan Oil', category: 'Hair care', price: 600, stock: 2, lowStockAt: 3, status: 'active' },
  { id: 'p2', name: 'Serum', category: 'Skin care', price: 2500, stock: 20, lowStockAt: 3, status: 'active' },
];
const bookings: Booking[] = [
  { id: 'b1', customerId: 'c1', staffId: 'st1', chairId: 'ch1', serviceIds: ['s1'], startTime: at(0, 5), endTime: at(1, 5), totalPrice: 3000, totalDuration: 60, status: 'completed', createdAt: at(0) },
];
const invoices: Invoice[] = [
  {
    id: 'i1', invoiceNumber: 'BYS-2026-00001', bookingId: 'b1', customerId: 'c1', staffId: 'st1',
    items: [{ name: 'Hydra Facial', price: 3000, type: 'service' }], subtotal: 3000, discountCode: 'EID20',
    discountAmount: 600, totalAmount: 2400, voucherAmount: 400, createdAt: at(0, 10), status: 'paid',
    paidAt: at(0, 15), paymentMethod: 'Cash',
  },
];
const sales: Sale[] = [
  {
    id: 'sa1', saleNumber: 'BYS-S-2026-00001', subtotal: 6200, discountAmount: 0, total: 6200, voucherAmount: 0,
    paymentMethod: 'Card', status: 'paid', createdAt: at(0, 20), customerId: 'c1', customerName: 'Ayesha Khan',
    items: [
      { id: 'x', kind: 'product', productId: 'p1', name: 'Argan Oil', quantity: 2, unitPrice: 600, lineTotal: 1200 },
      { id: 'y', kind: 'voucher', giftVoucherId: 'gv1', name: 'Gift voucher GV-1', quantity: 1, unitPrice: 5000, lineTotal: 5000 },
    ],
  },
];

const byId = <T extends { id: string }>(list: T[]) => (id: string) => list.find(x => x.id === id);

vi.mock('@/context/SalonContext', () => ({
  useSalon: () => ({
    staff, customers, services, deals: [], chairs: [{ id: 'ch1', name: 'Chair 1', status: 'active' }],
    bookings, invoices, appointmentRequests: [], products, sales, giftVouchers: [], discountCodes: [],
    loading: false, privateLoaded: true, live: true,
    getStaffById: byId(staff), getCustomerById: byId(customers), getServiceById: byId(services),
    getDealById: () => undefined, getChairById: () => ({ id: 'ch1', name: 'Chair 1', status: 'active' }),
    getBookingById: byId(bookings), getInvoiceByBookingId: (bid: string) => invoices.find(i => i.bookingId === bid),
    getProductById: byId(products), getGiftVoucherById: () => undefined,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'owner', email: 'owner@beyoustylin.com' }, roles: ['owner'], loading: false, rolesLoaded: true,
    isStaff: true, isCustomer: false, canManage: true, hasRole: () => true, signOut: vi.fn(),
  }),
}));

beforeAll(() => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
});

describe('ReportsPage', () => {
  it('shows cash-basis totals without double counting vouchers', async () => {
    const { default: ReportsPage } = await import('@/pages/ReportsPage');
    render(<MemoryRouter><ReportsPage /></MemoryRouter>);
    // services 2400 − 400 voucher = 2000; products 1200; vouchers sold 5000 → 8200
    expect(await screen.findAllByText('Rs. 8,200')).not.toHaveLength(0);
    expect(screen.getAllByText('Rs. 2,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rs. 5,000').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rs. 600').length).toBeGreaterThan(0); // discounts given
    expect(screen.getAllByText('Rs. 400').length).toBeGreaterThan(0); // paid with vouchers
    expect(screen.getByText('Argan Oil')).toBeInTheDocument();
    expect(screen.getAllByText('Hydra Facial').length).toBeGreaterThan(0);
  }, 30_000);

  it('shows an empty state for a period without sales', async () => {
    const { default: ReportsPage } = await import('@/pages/ReportsPage');
    render(<MemoryRouter><ReportsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Yesterday' }));
    expect(await screen.findByText('No sales in this period')).toBeInTheDocument();
  }, 30_000);
});

describe('Dashboard', () => {
  it('counts retail and voucher sales in collected revenue and flags low stock', async () => {
    const { default: Dashboard } = await import('@/pages/Dashboard');
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    expect((await screen.findAllByText('Rs. 8,200')).length).toBeGreaterThan(0);
    expect(screen.getByText(/Low stock:/)).toBeInTheDocument();
    expect(screen.getByText(/Argan Oil \(2 left\)/)).toBeInTheDocument();
  }, 30_000);
});
