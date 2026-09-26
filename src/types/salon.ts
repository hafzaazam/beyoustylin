export type BookingStatus = 'pending' | 'confirmed' | 'started' | 'completed' | 'canceled';
export type EntityStatus = 'active' | 'disabled';
export type InvoiceStatus = 'paid' | 'unpaid' | 'void';
export type AppRole = 'owner' | 'manager' | 'stylist' | 'receptionist';

export const BOOKING_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'started', 'completed', 'canceled'];
/** Statuses that occupy a staff member and a chair (used by the overlap rule). */
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'started'];

export interface Staff {
  id: string;
  name: string;
  role: string;
  phone: string;
  status: EntityStatus;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  status: EntityStatus;
  createdAt: string;
  /** Set when the customer has a login and can use the customer portal. */
  userId?: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  duration: number; // minutes
  status: EntityStatus;
}

export interface Deal {
  id: string;
  name: string;
  serviceIds: string[];
  discountedPrice: number;
  totalDuration: number; // auto-calculated
  status: EntityStatus;
}

export interface Chair {
  id: string;
  name: string;
  status: EntityStatus;
}

export interface Booking {
  id: string;
  customerId: string;
  staffId: string;
  chairId: string;
  serviceIds: string[];
  dealId?: string;
  startTime: string; // ISO
  endTime: string; // ISO
  totalPrice: number;
  totalDuration: number; // minutes
  /** Overrides the computed price (custom quotes, "on request" services, discounts). */
  customTotal?: number;
  notes?: string;
  status: BookingStatus;
  createdAt: string;
}

/** What the booking form sends; totals and end time are computed by the database. */
export interface BookingInput {
  customerId: string;
  staffId: string;
  chairId: string;
  serviceIds: string[];
  dealId?: string;
  startTime: string; // ISO
  customTotal?: number;
  notes?: string;
  status: BookingStatus;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  bookingId: string;
  customerId: string;
  staffId: string;
  items: InvoiceItem[];
  totalAmount: number;
  createdAt: string;
  status: InvoiceStatus;
  paidAt?: string;
  paymentMethod?: string;
  /** Booking price before any discount code. */
  subtotal: number;
  discountCode?: string;
  discountAmount: number;
  giftVoucherId?: string;
  /** Part of totalAmount covered by a gift voucher. */
  voucherAmount: number;
}

/** What the customer still has to pay (total minus gift voucher cover). */
export const amountDue = (x: { totalAmount?: number; total?: number; voucherAmount: number }) =>
  Math.max(0, (x.totalAmount ?? x.total ?? 0) - x.voucherAmount);

export interface InvoiceItem {
  name: string;
  price: number;
  type: 'service' | 'deal' | 'adjustment';
}

export const PAYMENT_METHODS = ['Cash', 'Card', 'Bank transfer', 'JazzCash', 'Easypaisa'] as const;

export type AppointmentRequestStatus = 'pending' | 'approved' | 'dismissed' | 'withdrawn';
export type AppointmentRequestType = 'booking' | 'quote';

export interface AppointmentRequest {
  id: string;
  type: AppointmentRequestType;
  name: string;
  phone: string;
  email?: string;
  serviceId?: string;
  dealId?: string;
  preferredDate?: string; // YYYY-MM-DD
  preferredTime?: string; // HH:MM
  eventDate?: string; // for quotes — YYYY-MM-DD (optional)
  budget?: string; // for quotes — freeform e.g. "50k-80k"
  notes?: string;
  status: AppointmentRequestStatus;
  createdAt: string;
  /** Booking created when staff converted this request. */
  bookingId?: string;
}


export const SERVICE_CATEGORIES = [
  'Makeup', 'Hair Cutting', 'Hair Treatment', 'Mehndi', 'Wax', 'Threading', 'Nails', 'Facial', 'Add-on', 'Other'
];

export const STAFF_ROLES = [
  'Hairdresser', 'Makeup Artist', 'Nail Technician', 'Esthetician', 'Spa Therapist', 'Other'
];

// ---------------- Vouchers, products & point of sale ----------------

export type DiscountKind = 'percent' | 'fixed';
export type DiscountAppliesTo = 'all' | 'services' | 'products';

export interface DiscountCode {
  id: string;
  code: string;
  description?: string;
  kind: DiscountKind;
  value: number;
  appliesTo: DiscountAppliesTo;
  minSpend: number;
  startsOn?: string; // YYYY-MM-DD
  endsOn?: string;   // YYYY-MM-DD
  maxUses?: number;
  uses: number;
  status: EntityStatus;
  createdAt: string;
}

export interface GiftVoucher {
  id: string;
  code: string;
  initialValue: number;
  balance: number;
  recipientName?: string;
  recipientPhone?: string;
  purchaserCustomerId?: string;
  saleId?: string;
  expiresOn?: string; // YYYY-MM-DD
  status: EntityStatus;
  notes?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  category: string;
  sku?: string;
  description?: string;
  price: number;
  cost?: number;
  stock: number;
  lowStockAt: number;
  status: EntityStatus;
}

export interface SaleItem {
  id: string;
  kind: 'product' | 'voucher';
  productId?: string;
  giftVoucherId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  saleNumber: string;
  customerId?: string;
  customerName?: string;
  staffId?: string;
  subtotal: number;
  discountCode?: string;
  discountAmount: number;
  total: number;
  giftVoucherId?: string;
  voucherAmount: number;
  paymentMethod?: string;
  status: 'paid' | 'void';
  notes?: string;
  createdAt: string;
  voidedAt?: string;
  voidReason?: string;
  items: SaleItem[];
}

export type CartLine =
  | { kind: 'product'; productId: string; quantity: number }
  | { kind: 'voucher'; value: number; recipientName?: string; recipientPhone?: string; expiresOn?: string };

export interface SaleInput {
  items: CartLine[];
  customerId?: string;
  customerName?: string;
  staffId?: string;
  discountCode?: string;
  giftVoucherCode?: string;
  paymentMethod?: string;
  notes?: string;
}

export const PRODUCT_CATEGORIES = ['Hair care', 'Skin care', 'Makeup', 'Nails', 'Tools', 'Gift sets', 'Other'];
