# BeYou Stylin

Salon & bridal studio web app: a public website with online booking/quote requests,
a customer portal, and an admin panel for bookings, schedule, services, packages,
staff, chairs, customers, invoices and team access.

Live: https://beyoustylin.lovable.app · Lovable project: https://lovable.dev/projects/7d760cbf-72ab-409b-b3a5-445552489598

## Stack

- **Frontend:** Vite + React 18 + TypeScript, Tailwind + shadcn/ui (Radix), react-router, sonner toasts, recharts, jsPDF.
- **Backend:** Supabase (Postgres + Row Level Security + Auth + Realtime). There is no custom server —
  business rules that must hold for everyone (no double-booking, prices, invoices) live in the database.

## Run locally

```sh
npm install
npm run dev        # http://localhost:8080
npm test           # unit tests (vitest)
npm run lint
npm run build
```

Supabase URL and publishable (anon) key are in `.env` / `src/integrations/supabase/client.ts`.
The anon key is public by design; access is controlled by RLS policies.

## Database migrations

Migrations live in `supabase/migrations/` and must be applied in filename order.
**The app on this branch requires the two `20260926…` migrations** (new columns, RPC functions and triggers).

Easiest way — one command, run by the owner of the Supabase project:

```sh
npm install
npm run db:setup
```

It opens the Supabase token page; click **Generate new token**, copy it and paste it into the terminal.
The script then applies only the migrations that are missing, records them in the migration history,
and checks that everything works (it's safe to run again). The token is not saved anywhere; delete it afterwards.

Alternatives: Supabase dashboard → SQL editor → run each new file in order, or
`supabase link --project-ref tcdoebddgkwxgcexuhrx && supabase db push`.

## Roles

| Role | Can do |
|---|---|
| **Owner** | Everything, including granting any role (the first account to sign up becomes owner). |
| **Manager** | Everything including deletes and the team page; cannot change owners or create managers. |
| **Receptionist / Stylist** | Bookings, schedule, customers, invoices, requests. No deletes. |
| **Customer** | Any signed-up account without a role. Uses `/account`: appointments (with online cancellation up to 2 h before), requests, invoices, favourites, profile, loyalty points. |

Grant roles under **Admin → Team & Access** (the person must create an account first).

## How the core rules work

- **No overlapping bookings** for the same staff member or chair: `(new_start < existing_end) AND (new_end > existing_start)`
  across pending/confirmed/in-progress bookings. Checked instantly in the form and enforced by the
  `bookings_prevent_overlap` trigger (with advisory locks so two receptionists can't race).
- **Prices and durations** are computed by the `bookings_compute_totals` trigger from the chosen services or package
  (optional custom total for quotes/discounts). Old bookings keep their price when a service price changes later.
- **Invoices** are created by the database for every booking, numbered `BYS-YYYY-00001`. Canceling a booking voids an
  unpaid invoice; reopening restores it. Staff record payments (method + date) on the Invoices page. PDFs are generated
  on demand in the browser.
- **Customer accounts** are linked to customer records by verified email (`ensure_customer_record`), or manually by
  staff from the Customers page.
- **Delete safety:** customers, services, packages, staff and chairs with history can't be deleted (disable them instead);
  bookings with a paid invoice can't be deleted (cancel them instead).

## Business details

Contact details, opening hours and social links are in `src/config/site.ts` — update them there.
