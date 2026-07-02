import { jsPDF } from 'jspdf';
import { Booking, Customer, Invoice, Staff } from '@/types/salon';

interface BuildArgs {
  invoice: Invoice;
  booking?: Booking;
  customer?: Customer;
  staff?: Staff;
}

export function buildInvoicePdf({ invoice, booking, customer, staff }: BuildArgs): string {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 40;
  let y = 60;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(193, 86, 107);
  doc.setFontSize(24);
  doc.text('BeYou Stylin', pageW / 2, y, { align: 'center' });
  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(10);
  doc.text('Premium Salon & Bridal Studio', pageW / 2, y, { align: 'center' });
  y += 25;

  doc.setDrawColor(229, 161, 170);
  doc.setLineWidth(1);
  doc.line(marginX, y, pageW - marginX, y);
  y += 25;

  // Invoice meta
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('INVOICE', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`# ${invoice.invoiceNumber}`, pageW - marginX, y, { align: 'right' });
  y += 20;

  const meta: Array<[string, string]> = [
    ['Customer', customer?.name || 'Walk-in'],
    ['Phone', customer?.phone || '-'],
    ['Staff', staff?.name || '-'],
    ['Date', new Date(invoice.createdAt).toLocaleString()],
    ['Booking', booking ? `#${booking.id.slice(0, 8)}` : '-'],
    ['Status', invoice.status.toUpperCase()],
  ];
  doc.setFontSize(10);
  meta.forEach(([k, v], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = marginX + col * ((pageW - marginX * 2) / 2);
    doc.setTextColor(140, 140, 140);
    doc.text(`${k}:`, x, y + row * 16);
    doc.setTextColor(40, 40, 40);
    doc.text(v, x + 60, y + row * 16);
  });
  y += Math.ceil(meta.length / 2) * 16 + 15;

  // Items table
  doc.setFillColor(250, 245, 245);
  doc.rect(marginX, y, pageW - marginX * 2, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.text('Item', marginX + 10, y + 15);
  doc.text('Type', marginX + 300, y + 15);
  doc.text('Price (Rs.)', pageW - marginX - 10, y + 15, { align: 'right' });
  y += 30;

  doc.setFont('helvetica', 'normal');
  invoice.items.forEach(item => {
    doc.setTextColor(40, 40, 40);
    doc.text(item.name, marginX + 10, y);
    doc.setTextColor(120, 120, 120);
    doc.text(item.type, marginX + 300, y);
    doc.setTextColor(40, 40, 40);
    doc.text(item.price.toLocaleString(), pageW - marginX - 10, y, { align: 'right' });
    y += 16;
    doc.setDrawColor(240, 240, 240);
    doc.line(marginX, y - 6, pageW - marginX, y - 6);
  });

  y += 15;
  doc.setDrawColor(193, 86, 107);
  doc.setLineWidth(1);
  doc.line(pageW - marginX - 200, y, pageW - marginX, y);
  y += 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(193, 86, 107);
  doc.text('Total', pageW - marginX - 200, y);
  doc.text(`Rs. ${invoice.totalAmount.toLocaleString()}`, pageW - marginX, y, { align: 'right' });

  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(140, 140, 140);
  doc.text('Thank you for choosing BeYou Stylin — where you shine your way.', pageW / 2, doc.internal.pageSize.getHeight() - 40, { align: 'center' });

  return doc.output('datauristring');
}
