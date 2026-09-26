import { Link } from 'react-router-dom';
import LegalPage, { LegalSection } from '@/components/layout/LegalPage';
import { POLICY, SITE } from '@/config/site';

const sections: LegalSection[] = [
  {
    id: 'about',
    title: 'About these terms',
    body: (
      <p>These terms apply when you book an appointment, buy a product or gift voucher, or use this website. By booking with {SITE.name} ({SITE.city}) you agree to them, together with our <Link to="/privacy">Privacy Policy</Link> and <Link to="/refund-policy">Refund &amp; Cancellation Policy</Link>.</p>
    ),
  },
  {
    id: 'bookings',
    title: 'Appointments & bookings',
    body: (
      <ul>
        <li>An appointment is confirmed only once we confirm it by phone, message or in your account. Online requests are not guaranteed until then.</li>
        <li>Please arrive 10 minutes early. If you are more than {POLICY.lateGraceMinutes} minutes late we may need to shorten your service or move you to another slot, and the full price may still apply.</li>
        <li>Bridal and event bookings are secured with a {POLICY.bridalAdvancePercent}% advance. Your date is held only once the advance is received.</li>
        <li>Durations are estimates. Your final time can change with hair length, thickness or added services.</li>
      </ul>
    ),
  },
  {
    id: 'pricing',
    title: 'Prices & payment',
    body: (
      <ul>
        <li>All prices are in Pakistani Rupees ({SITE.currency}). Prices shown on the website can change without notice. The price confirmed at booking is the price you pay.</li>
        <li>Package prices apply only when every service in the package is taken in the same visit. Unused parts of a package cannot be exchanged for cash.</li>
        <li>Quotes for bridal and event work are valid for 30 days unless stated otherwise.</li>
        <li>Payment is due in full when your service ends, unless agreed otherwise in writing.</li>
      </ul>
    ),
  },
  {
    id: 'vouchers',
    title: 'Discount codes & gift vouchers',
    body: (
      <ul>
        <li>Discount codes are subject to their own conditions: validity dates, minimum spend, which services or products they cover, and how many times they can be used. You can use only one code per invoice, and codes cannot be exchanged for cash.</li>
        <li>Gift vouchers are valid for {POLICY.voucherValidityMonths} months from purchase unless a different expiry is printed on them. You can use them across several visits until the balance runs out.</li>
        <li>Gift vouchers are not refundable or exchangeable for cash, and cannot be replaced if lost. Please keep your voucher code private — whoever presents it can use it.</li>
      </ul>
    ),
  },
  {
    id: 'health',
    title: 'Health, allergies & patch tests',
    body: (
      <>
        <p>Please tell us before your service about any allergies, skin conditions, pregnancy, medication or recent treatments. We may ask you to take a patch test 48 hours before colour, lash, henna or chemical services.</p>
        <p>We may refuse or change a service if we believe it could harm you. If you choose not to take a recommended patch test, or you do not share relevant health information, you proceed at your own risk.</p>
      </>
    ),
  },
  {
    id: 'conduct',
    title: 'At the studio',
    body: (
      <ul>
        <li>Please look after your own belongings. We are not responsible for items that are lost or damaged on our premises.</li>
        <li>We are not responsible for delays caused by power outages or other events outside our control. We will always try to reschedule you at no cost.</li>
        <li>We may photograph finished looks for our portfolio or social media only with your permission. You can withdraw that permission at any time.</li>
        <li>We may refuse service to anyone who is abusive towards our team or other guests.</li>
      </ul>
    ),
  },
  {
    id: 'accounts',
    title: 'Your online account',
    body: <p>Keep your password private. You are responsible for bookings made through your account. We can suspend accounts that are misused or used to make false bookings.</p>,
  },
  {
    id: 'liability',
    title: 'Our responsibility',
    body: (
      <p>We take care to deliver every service professionally. If something is not right, tell us within {POLICY.serviceComplaintDays} days (see our <Link to="/refund-policy">Refund Policy</Link>). As far as the law allows, our liability is limited to the price paid for the service concerned. Nothing in these terms limits your rights under Pakistani consumer protection law.</p>
    ),
  },
  {
    id: 'law',
    title: 'Governing law & changes',
    body: <p>These terms are governed by the laws of Pakistan, and the courts of Karachi will hear any dispute. We may update these terms from time to time. The version on this page when you book is the one that applies.</p>,
  },
];

const TermsPage = () => (
  <LegalPage
    eyebrow="Legal"
    title="Terms & Conditions"
    intro={<p>The simple rules that keep every appointment at {SITE.name} running smoothly — for you, for our artists and for the next guest in the chair.</p>}
    sections={sections}
  />
);

export default TermsPage;
