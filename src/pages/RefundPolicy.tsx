import LegalPage, { LegalSection } from '@/components/layout/LegalPage';
import { POLICY, SITE } from '@/config/site';

const sections: LegalSection[] = [
  {
    id: 'cancel-regular',
    title: 'Cancelling or rescheduling',
    body: (
      <ul>
        <li>You can cancel or reschedule a regular appointment <strong>free of charge up to {POLICY.cancelNoticeHours} hours</strong> before it starts. Call, message us, or use your account.</li>
        <li>With less than {POLICY.cancelNoticeHours} hours’ notice, or if you do not turn up, we may ask for part or full payment before your next booking.</li>
        <li>If we need to cancel or move your appointment we will give you as much notice as we can. You can choose a new time or get a full refund of anything you paid in advance.</li>
      </ul>
    ),
  },
  {
    id: 'cancel-bridal',
    title: 'Bridal & event bookings',
    body: (
      <ul>
        <li>We ask for a {POLICY.bridalAdvancePercent}% advance to hold your date. Your date is held for you only, so we turn away other clients once it is booked.</li>
        <li>Cancel <strong>{POLICY.bridalCancelNoticeDays} days or more</strong> before the event and we will refund your advance, minus any trial or products already used.</li>
        <li>With less than {POLICY.bridalCancelNoticeDays} days’ notice the advance is not refundable, but you can move it once to a new date within 6 months, subject to availability.</li>
        <li>Trial sessions are charged separately and are not refundable once they have taken place.</li>
      </ul>
    ),
  },
  {
    id: 'services',
    title: 'If you are unhappy with a service',
    body: (
      <>
        <p>We want you to leave happy. If something is not right, tell us before you leave or within <strong>{POLICY.serviceComplaintDays} days</strong> of your visit. We will offer to fix it free of charge with the same or a senior artist.</p>
        <p>Services cannot be refunded once they have been carried out, because our artists’ time and products have already been used. Refunds are decided case by case where we could not put things right. We cannot adjust results that follow from details you did not tell us, or from not following the aftercare advice we gave you.</p>
      </>
    ),
  },
  {
    id: 'products',
    title: 'Products',
    body: (
      <ul>
        <li>Unopened, unused products in their original packaging can be returned within <strong>{POLICY.productReturnDays} days</strong> with your receipt, for a refund or exchange.</li>
        <li>For hygiene reasons, opened cosmetics, skincare and haircare products cannot be returned unless they are faulty.</li>
        <li>If a product is faulty or causes a reaction, stop using it and contact us with your receipt. We will replace it or refund you.</li>
      </ul>
    ),
  },
  {
    id: 'vouchers',
    title: 'Gift vouchers & discount codes',
    body: <p>Gift vouchers cannot be refunded or exchanged for cash, but any unused balance stays on the voucher until it expires. Discounts are not refunded as cash. If a discounted service is refunded, you get back the amount you actually paid.</p>,
  },
  {
    id: 'how-refunds-work',
    title: 'How refunds are paid',
    body: <p>Approved refunds are paid by the original payment method where possible (cash, card or bank transfer), within {POLICY.refundProcessingDays} working days. Bank transfer refunds may take longer depending on your bank. We will need your invoice or receipt number.</p>,
  },
  {
    id: 'contact',
    title: 'How to ask',
    body: <p>To cancel, reschedule or request a refund, call <a href={SITE.phoneHref}>{SITE.phoneDisplay}</a> or email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> with your name, booking date and invoice number.</p>,
  },
];

const RefundPolicy = () => (
  <LegalPage
    eyebrow="Legal"
    title="Refund & Cancellation"
    intro={<p>What happens if your plans change, or if something isn’t quite right — for appointments, bridal bookings, products and gift vouchers.</p>}
    sections={sections}
  />
);

export default RefundPolicy;
