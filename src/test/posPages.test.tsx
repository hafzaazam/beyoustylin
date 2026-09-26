import { describe, expect, it, vi, beforeAll } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType } from 'react';
import { Customer, DiscountCode, GiftVoucher, Product, Sale, Staff } from '@/types/salon';

const now = new Date();
const at = (h: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), h).toISOString();

const staff: Staff[] = [{ id: 'st1', name: 'Hina', role: 'Makeup Artist', phone: '03001111111', status: 'active', createdAt: at(8) }];
const customers: Customer[] = [{ id: 'c1', name: 'Ayesha Khan', phone: '03003333333', status: 'active', createdAt: at(8) }];
const products: Product[] = [
  { id: 'p1', name: 'Argan Hair Oil', brand: 'Moroccan', category: 'Hair care', sku: 'ARG-100', price: 2500, cost: 1400, stock: 8, lowStockAt: 3, status: 'active' },
  { id: 'p2', name: 'Matte Lipstick', category: 'Makeup', price: 1800, stock: 2, lowStockAt: 3, status: 'active' },
  { id: 'p3', name: 'Rose Toner', category: 'Skin care', price: 1200, stock: 0, lowStockAt: 3, status: 'active' },
];
const giftVouchers: GiftVoucher[] = [
  { id: 'g1', code: 'GV-7F3A9-C21B0', initialValue: 5000, balance: 5000, saleId: 's1', expiresOn: '2027-09-26', status: 'active', createdAt: at(9) },
];
const discountCodes: DiscountCode[] = [];
const sales: Sale[] = [
  {
    id: 's1', saleNumber: 'BYS-S-2026-00001', customerId: 'c1', customerName: 'Ayesha Khan', staffId: 'st1',
    subtotal: 7500, discountCode: 'EID10', discountAmount: 250, total: 7250, voucherAmount: 0, paymentMethod: 'Cash',
    status: 'paid', createdAt: at(9),
    items: [
      { id: 'i1', kind: 'product', productId: 'p1', name: 'Argan Hair Oil', quantity: 1, unitPrice: 2500, lineTotal: 2500 },
      { id: 'i2', kind: 'voucher', giftVoucherId: 'g1', name: 'Gift voucher GV-7F3A9-C21B0', quantity: 1, unitPrice: 5000, lineTotal: 5000 },
    ],
  },
  {
    id: 's2', saleNumber: 'BYS-S-2026-00002', customerName: 'Walk-in Sana', subtotal: 1800, discountAmount: 0, total: 1800,
    voucherAmount: 0, paymentMethod: 'Card', status: 'void', createdAt: at(10), voidReason: 'Returned',
    items: [{ id: 'i3', kind: 'product', productId: 'p2', name: 'Matte Lipstick', quantity: 1, unitPrice: 1800, lineTotal: 1800 }],
  },
];

const byId = <T extends { id: string }>(list: T[]) => (id: string) => list.find(x => x.id === id);
const ok = vi.fn(async () => true);
const createSale = vi.fn(async () => sales[0]);

vi.mock('@/context/SalonContext', () => ({
  useSalon: () => ({
    staff, customers, products, sales, giftVouchers, discountCodes,
    services: [], deals: [], chairs: [], bookings: [], invoices: [], appointmentRequests: [],
    loading: false, privateLoaded: true, live: true,
    addProduct: ok, updateProduct: ok, toggleProductStatus: ok, deleteProduct: ok, adjustStock: ok,
    createSale, voidSale: ok,
    getStaffById: byId(staff), getCustomerById: byId(customers), getProductById: byId(products),
    getGiftVoucherById: byId(giftVouchers),
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'owner', email: 'owner@beyoustylin.com' }, roles: ['owner'], loading: false, rolesLoaded: true,
    isStaff: true, isCustomer: false, canManage: true, hasRole: () => true, signOut: ok,
  }),
}));

beforeAll(() => {
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView = vi.fn();
});

const renderPage = async (load: () => Promise<{ default: ComponentType }>) => {
  const { default: Page } = await load();
  return render(<MemoryRouter><Page /></MemoryRouter>);
};

describe('point of sale pages', () => {
  it('Products lists stock states', async () => {
    await renderPage(() => import('@/pages/ProductsPage'));
    expect(await screen.findByText('Argan Hair Oil')).toBeInTheDocument();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
    expect(screen.getByText('44% margin')).toBeInTheDocument();
  }, 30_000);

  it('POS adds products to the cart and caps at stock', async () => {
    await renderPage(() => import('@/pages/PosPage'));
    const tile = (await screen.findByText('Matte Lipstick')).closest('button')!;
    fireEvent.click(tile);
    fireEvent.click(tile);
    fireEvent.click(tile); // only 2 in stock
    expect(screen.getByText('2', { selector: 'span[aria-live]' })).toBeInTheDocument();
    expect(screen.getAllByText('Rs. 3,600').length).toBeGreaterThan(0);
    // Out-of-stock product tile is disabled
    expect((await screen.findByText('Rose Toner')).closest('button')).toBeDisabled();
  }, 30_000);

  it('POS completes a sale and shows new voucher codes', async () => {
    await renderPage(() => import('@/pages/PosPage'));
    fireEvent.click((await screen.findByText('Argan Hair Oil')).closest('button')!);
    fireEvent.click(screen.getByRole('button', { name: /complete sale/i }));
    expect(await screen.findByText('Sale complete')).toBeInTheDocument();
    expect(screen.getByText('GV-7F3A9-C21B0')).toBeInTheDocument();
    expect(createSale).toHaveBeenCalledWith(expect.objectContaining({
      items: [{ kind: 'product', productId: 'p1', quantity: 1 }],
    }));
  }, 30_000);

  it('Sales history lists sales and opens details', async () => {
    await renderPage(() => import('@/pages/SalesPage'));
    const row = await screen.findByText('BYS-S-2026-00001');
    fireEvent.click(row);
    expect(await screen.findByText(/Discount \(EID10\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /void sale/i })).toBeInTheDocument();
  }, 30_000);
});
