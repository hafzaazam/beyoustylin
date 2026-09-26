import LegalPage, { LegalSection } from '@/components/layout/LegalPage';
import { SITE } from '@/config/site';

const sections: LegalSection[] = [
  {
    id: 'what-we-collect',
    title: 'What we collect',
    body: (
      <>
        <p>We only collect what we need to book and look after your appointments:</p>
        <ul>
          <li><strong>Account details</strong> — your name, email address and password (stored securely; we never see it) when you create an account.</li>
          <li><strong>Contact details</strong> — your phone number and, if you choose to add them, your address and birthday.</li>
          <li><strong>Booking information</strong> — the services you book or ask a quote for, preferred dates and times, and any notes you share with us (for example skin sensitivities or allergies).</li>
          <li><strong>Visit and payment records</strong> — invoices, receipts, the payment method used, discount codes and gift vouchers redeemed.</li>
          <li><strong>Favourites</strong> — services and packages you save to your account.</li>
        </ul>
        <p>We do not take card numbers on this website, and we do not use advertising or tracking cookies.</p>
      </>
    ),
  },
  {
    id: 'how-we-use-it',
    title: 'How we use it',
    body: (
      <ul>
        <li>To confirm, schedule, reschedule and remind you about appointments.</li>
        <li>To prepare quotes for bridal and event bookings.</li>
        <li>To issue invoices and receipts, and to honour gift vouchers and discount codes.</li>
        <li>To note preferences and sensitivities so our artists can serve you safely.</li>
        <li>To contact you about your booking by phone, WhatsApp, SMS or email.</li>
        <li>With your consent only, to send occasional offers. You can opt out at any time.</li>
      </ul>
    ),
  },
  {
    id: 'sharing',
    title: 'Who we share it with',
    body: (
      <>
        <p>We never sell your information. It is seen only by our team members who need it to serve you, and by the service providers that run this website:</p>
        <ul>
          <li><strong>Supabase</strong> — secure hosting for our database and sign-in.</li>
          <li><strong>Our web host</strong> — to serve the website itself.</li>
        </ul>
        <p>We may disclose information if required by Pakistani law or to protect our clients and staff.</p>
      </>
    ),
  },
  {
    id: 'storage',
    title: 'Storage & security',
    body: (
      <>
        <p>Your data is stored with encryption in transit, and each person can only see what their role allows — customers see their own records, and staff see only what they need to run the salon.</p>
        <p>This site keeps you signed in using your browser’s local storage. Clearing your browser data signs you out.</p>
        <p>We keep booking and invoice records for as long as needed for accounting and tax purposes. Account details are kept until you ask us to delete them.</p>
      </>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your choices & rights',
    body: (
      <>
        <p>You can view and update your profile at any time from <strong>My account → Profile</strong>. You can also ask us to:</p>
        <ul>
          <li>send you a copy of the information we hold about you;</li>
          <li>correct anything that is wrong;</li>
          <li>delete your account and personal details (we may keep invoices where the law requires it);</li>
          <li>stop sending you offers.</li>
        </ul>
        <p>Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> and we will respond within 7 working days.</p>
      </>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: <p>Accounts are for adults. Appointments for anyone under 18 should be booked by a parent or guardian, who remains responsible for the information provided.</p>,
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: <p>If we change how we handle your information we will update this page and the “last updated” date above. Significant changes will be shown on the website or sent to your email.</p>,
  },
];

const PrivacyPolicy = () => (
  <LegalPage
    eyebrow="Legal"
    title="Privacy Policy"
    intro={<p>How {SITE.name} collects, uses and protects your personal information when you book with us, visit the studio or use this website.</p>}
    sections={sections}
  />
);

export default PrivacyPolicy;
