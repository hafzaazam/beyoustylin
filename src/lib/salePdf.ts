import { jsPDF } from 'jspdf';
import { GiftVoucher, Sale } from '@/types/salon';
import { SITE } from '@/config/site';

export interface SalePdfExtras {
  /** Staff member who made the sale. */
  soldBy?: string;
  customerPhone?: string;
  /** Gift vouchers created by this sale (for code + expiry lines). */
  vouchers?: GiftVoucher[];
  /** Code of the gift voucher used to pay, if any. */
  paidWithVoucherCode?: string;
}

const PLUM: [number, number, number] = [110, 24, 92];
const PINK: [number, number, number] = [214, 51, 132];
const INK: [number, number, number] = [40, 40, 40];
const MUTED: [number, number, number] = [130, 130, 130];

const money = (n: number) => `Rs. ${Math.round(n).toLocaleString('en-PK')}`;
const when = (iso: string) => new Date(iso).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });
const day = (ymd: string) => new Date(`${ymd}T00:00`).toLocaleDateString('en-PK', { dateStyle: 'medium' });

/** Receipt for a point-of-sale sale, in the same brand style as invoices. */
export function buildSalePdf(sale: Sale, extras: SalePdfExtras = {}): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const right = pageW - marginX;
  let y = 64;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...PLUM);
  doc.text(SITE.name, marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(SITE.tagline, marginX, y + 16);
  doc.text([SITE.city, SITE.phoneDisplay, SITE.email], right, y - 10, { align: 'right' });
  y += 40;
  doc.setDrawColor(...PINK);
  doc.setLineWidth(1.2);
  doc.line(marginX, y, right, y);
  y += 32;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text('RECEIPT', marginX, y);
  doc.setFontSize(11);
  doc.text(sale.saleNumber, right, y, { align: 'right' });
  y += 26;

  const meta: Array<[string, string]> = [
    ['Customer', sale.customerName || 'Walk-in customer'],
    ['Date', when(sale.createdAt)],
    ['Phone', extras.customerPhone || '—'],
    ['Sold by', extras.soldBy || '—'],
  ];
  doc.setFontSize(9.5);
  const colW = (right - marginX) / 2;
  meta.forEach(([k, v], i) => {
    const x = marginX + (i % 2) * colW;
    const rowY = y + Math.floor(i / 2) * 18;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(k, x, rowY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text(doc.splitTextToSize(v, colW - 80)[0] ?? '', x + 72, rowY);
  });
  y += Math.ceil(meta.length / 2) * 18 + 18;

  // Lines
  doc.setFillColor(250, 244, 248);
  doc.rect(marginX, y, right - marginX, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Item', marginX + 10, y + 16);
  doc.text('Qty', marginX + 300, y + 16, { align: 'right' });
  doc.text('Unit', marginX + 380, y + 16, { align: 'right' });
  doc.text('Amount', right - 10, y + 16, { align: 'right' });
  y += 40;

  doc.setFont('helvetica', 'normal');
  for (const item of sale.items) {
    const voucher = item.giftVoucherId ? extras.vouchers?.find(v => v.id === item.giftVoucherId) : undefined;
    const lines: string[] = doc.splitTextToSize(item.name, 270);
    if (voucher?.expiresOn) lines.push(`Valid until ${day(voucher.expiresOn)}`);
    if (y + lines.length * 13 > pageH - 170) { doc.addPage(); y = 64; }
    doc.setTextColor(...INK);
    doc.text(lines[0], marginX + 10, y);
    if (lines.length > 1) {
      doc.setTextColor(...MUTED);
      doc.text(lines.slice(1), marginX + 10, y + 13);
      doc.setTextColor(...INK);
    }
    doc.text(String(item.quantity), marginX + 300, y, { align: 'right' });
    doc.text(money(item.unitPrice), marginX + 380, y, { align: 'right' });
    doc.text(money(item.lineTotal), right - 10, y, { align: 'right' });
    y += lines.length * 13 + 8;
    doc.setDrawColor(236, 236, 236);
    doc.setLineWidth(0.6);
    doc.line(marginX, y - 12, right, y - 12);
  }

  // Totals
  y += 10;
  const row = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 12 : 10);
    doc.setTextColor(...(bold ? PLUM : INK));
    doc.text(label, right - 220, y);
    doc.text(value, right, y, { align: 'right' });
    y += bold ? 20 : 16;
  };
  row('Subtotal', money(sale.subtotal));
  if (sale.discountAmount > 0) row(`Discount${sale.discountCode ? ` (${sale.discountCode})` : ''}`, `- ${money(sale.discountAmount)}`);
  doc.setDrawColor(...PINK);
  doc.setLineWidth(1);
  doc.line(right - 220, y - 8, right, y - 8);
  y += 6;
  row('Total', money(sale.total), true);
  if (sale.voucherAmount > 0) {
    row(`Gift voucher${extras.paidWithVoucherCode ? ` ${extras.paidWithVoucherCode}` : ''}`, `- ${money(sale.voucherAmount)}`);
  }
  const paid = Math.max(0, sale.total - sale.voucherAmount);
  row(`Paid${paid > 0 && sale.paymentMethod ? ` (${sale.paymentMethod})` : ''}`, money(paid));

  // New voucher codes, prominent
  const newVouchers = (extras.vouchers ?? []).filter(v => v.saleId === sale.id);
  if (newVouchers.length) {
    y += 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...PLUM);
    doc.text('Gift voucher codes', marginX, y);
    y += 16;
    doc.setFont('courier', 'bold');
    doc.setFontSize(13);
    newVouchers.forEach(v => {
      doc.setTextColor(...INK);
      doc.text(`${v.code}   ${money(v.initialValue)}${v.recipientName ? `  for ${v.recipientName}` : ''}`, marginX, y);
      y += 18;
    });
  }

  if (sale.status === 'void') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(96);
    doc.setTextColor(230, 200, 210);
    doc.text('VOID', pageW / 2, pageH / 2, { align: 'center', angle: 30 });
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Thank you for shopping at ${SITE.name}.`, pageW / 2, pageH - 40, { align: 'center' });
  return doc;
}

export const downloadSalePdf = (sale: Sale, extras?: SalePdfExtras) =>
  buildSalePdf(sale, extras).save(`${sale.saleNumber}.pdf`);

export const printSalePdf = (sale: Sale, extras?: SalePdfExtras) => {
  const doc = buildSalePdf(sale, extras);
  doc.autoPrint();
  const url = URL.createObjectURL(doc.output('blob'));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
