import type { Tables } from '@/integrations/supabase/types';
import { Invoice } from '@/types/salon';

/** Shared by the admin data layer and the customer portal so both read invoices the same way. */
export const mapInvoice = (r: Tables<'invoices'>): Invoice => ({
  id: r.id, invoiceNumber: r.invoice_number, bookingId: r.booking_id,
  customerId: r.customer_id, staffId: r.staff_id,
  items: (Array.isArray(r.items) ? r.items : []) as unknown as Invoice['items'],
  totalAmount: Number(r.total_amount),
  createdAt: r.created_at, status: r.status,
  paidAt: r.paid_at ?? undefined, paymentMethod: r.payment_method ?? undefined,
  subtotal: Number(r.subtotal ?? r.total_amount),
  discountCode: r.discount_code ?? undefined,
  discountAmount: Number(r.discount_amount ?? 0),
  giftVoucherId: r.gift_voucher_id ?? undefined,
  voucherAmount: Number(r.voucher_amount ?? 0),
});
