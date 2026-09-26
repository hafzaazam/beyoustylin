import { Customer, GiftVoucher, Sale, Staff } from '@/types/salon';
import { SalePdfExtras } from '@/lib/salePdf';

/** Everything the receipt needs besides the sale itself. */
export const receiptExtras = (
  sale: Sale,
  lookups: {
    getStaffById: (id: string) => Staff | undefined;
    getCustomerById: (id: string) => Customer | undefined;
    getGiftVoucherById: (id: string) => GiftVoucher | undefined;
    giftVouchers: GiftVoucher[];
  },
): SalePdfExtras => ({
  soldBy: sale.staffId ? lookups.getStaffById(sale.staffId)?.name : undefined,
  customerPhone: sale.customerId ? lookups.getCustomerById(sale.customerId)?.phone : undefined,
  vouchers: lookups.giftVouchers.filter(v => v.saleId === sale.id),
  paidWithVoucherCode: sale.giftVoucherId ? lookups.getGiftVoucherById(sale.giftVoucherId)?.code : undefined,
});
