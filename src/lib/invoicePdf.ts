import { jsPDF } from 'jspdf';
import { Invoice } from '@/types/salon';
import { SITE } from '@/config/site';

export interface InvoicePdfData {
  invoice: Invoice;
  customerName?: string;
  customerPhone?: string;
  staffName?: string;
  /** ISO start time of the appointment. */
  appointmentTime?: string;
}

const PLUM: [number, number, number] = [110, 24, 92];
const PINK: [number, number, number] = [214, 51, 132];
const INK: [number, number, number] = [40, 40, 40];
const MUTED: [number, number, number] = [130, 130, 130];

const money = (n: number) => `Rs. ${Math.round(n).toLocaleString('en-PK')}`;
const when = (iso: string) =>
  new Date(iso).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' });

// PDFs are generated on demand instead of being stored as base64 in the
// database: they are small, always reflect the current invoice status,
// and keep the invoices table lean.
export function buildInvoicePdf(data: InvoicePdfData): jsPDF {
  const { invoice } = data;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const right = pageW - marginX;
  let y = 64;

  // Header band
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

  // Title + number
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text('INVOICE', marginX, y);
  doc.setFontSize(11);
  doc.text(invoice.invoiceNumber, right, y, { align: 'right' });
  y += 26;

  const statusLabel =
    invoice.status === 'paid'
      ? `PAID${invoice.paidAt ? ` · ${when(invoice.paidAt)}` : ''}${invoice.paymentMethod ? ` · ${invoice.paymentMethod}` : ''}`
      : invoice.status === 'void' ? 'VOID' : 'UNPAID';

  const meta: Array<[string, string]> = [
    ['Billed to', data.customerName || 'Walk-in customer'],
    ['Issued', when(invoice.createdAt)],
    ['Phone', data.customerPhone || '—'],
    ['Appointment', data.appointmentTime ? when(data.appointmentTime) : '—'],
    ['Stylist', data.staffName || '—'],
    ['Status', statusLabel],
  ];
  doc.setFontSize(9.5);
  const colW = (right - marginX) / 2;
  meta.forEach(([k, v], i) => {
    const x = marginX + (i % 2) * colW;
    const rowY = y + Math.floor(i / 2) * 18;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text(k, x, rowY);
    doc.setTextColor(...INK);
    doc.setFont('helvetica', 'bold');
    doc.text(doc.splitTextToSize(v, colW - 80)[0] ?? '', x + 72, rowY);
  });
  y += Math.ceil(meta.length / 2) * 18 + 18;

  // Items table
  doc.setFillColor(250, 244, 248);
  doc.rect(marginX, y, right - marginX, 24, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text('Item', marginX + 10, y + 16);
  doc.text('Type', marginX + 320, y + 16);
  doc.text('Amount', right - 10, y + 16, { align: 'right' });
  y += 40;

  doc.setFont('helvetica', 'normal');
  for (const item of invoice.items) {
    const lines: string[] = doc.splitTextToSize(item.name, 290);
    if (y + lines.length * 13 > pageH - 140) {
      doc.addPage();
      y = 64;
    }
    doc.setTextColor(...INK);
    doc.text(lines, marginX + 10, y);
    doc.setTextColor(...MUTED);
    doc.text(item.type === 'adjustment' ? 'adjustment' : item.type, marginX + 320, y);
    doc.setTextColor(...INK);
    doc.text(money(item.price), right - 10, y, { align: 'right' });
    y += lines.length * 13 + 8;
    doc.setDrawColor(236, 236, 236);
    doc.setLineWidth(0.6);
    doc.line(marginX, y - 12, right, y - 12);
  }

  // Totals: subtotal → discount → total → gift voucher → amount due / paid
  const discount = invoice.discountAmount ?? 0;
  const voucher = invoice.voucherAmount ?? 0;
  const labelX = right - 220;
  const summaryLine = (label: string, value: string, color: [number, number, number] = INK) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(label, labelX, y);
    doc.setTextColor(...color);
    doc.text(value, right, y, { align: 'right' });
    y += 16;
  };

  y += 10;
  if (discount > 0) {
    summaryLine('Subtotal', money(invoice.subtotal ?? invoice.totalAmount + discount));
    summaryLine(`Discount${invoice.discountCode ? ` (${invoice.discountCode})` : ''}`, `- ${money(discount)}`, [34, 120, 80]);
  }
  doc.setDrawColor(...PINK);
  doc.setLineWidth(1);
  doc.line(labelX, y - 4, right, y - 4);
  y += 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...PLUM);
  doc.text('Total', labelX, y);
  doc.text(money(invoice.totalAmount), right, y, { align: 'right' });
  y += 20;

  if (voucher > 0) {
    summaryLine('Paid with gift voucher', `- ${money(voucher)}`);
  }
  if (voucher > 0 || invoice.status === 'paid') {
    const rest = Math.max(0, invoice.totalAmount - voucher);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    const label = invoice.status === 'paid'
      ? `Paid${invoice.paymentMethod && invoice.paymentMethod !== 'Gift voucher' ? ` (${invoice.paymentMethod})` : ''}`
      : 'Amount due';
    doc.text(label, labelX, y);
    doc.text(money(rest), right, y, { align: 'right' });
  }

  if (invoice.status === 'void') {
    doc.setFontSize(96);
    doc.setTextColor(230, 200, 210);
    doc.text('VOID', pageW / 2, pageH / 2, { align: 'center', angle: 30 });
  }

  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`Thank you for choosing ${SITE.name} — where you shine your way.`, pageW / 2, pageH - 40, { align: 'center' });

  return doc;
}

const fileName = (invoice: Invoice) => `${invoice.invoiceNumber}.pdf`;

export const downloadInvoicePdf = (data: InvoicePdfData) => buildInvoicePdf(data).save(fileName(data.invoice));

/** Blob URL for previewing in an <iframe>. Revoke it when the preview closes. */
export const invoicePdfUrl = (data: InvoicePdfData) =>
  URL.createObjectURL(buildInvoicePdf(data).output('blob'));

/** Opens the PDF in a new tab with the print dialog. */
export const printInvoicePdf = (data: InvoicePdfData) => {
  const doc = buildInvoicePdf(data);
  doc.autoPrint();
  const url = URL.createObjectURL(doc.output('blob'));
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
