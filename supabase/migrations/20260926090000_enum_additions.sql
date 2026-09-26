-- New enum values live in their own migration: Postgres cannot use a freshly
-- added enum value inside the same transaction that added it.

-- Invoices for canceled bookings are voided instead of silently kept as "unpaid".
ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'void';

-- Customers can withdraw their own pending requests from the portal.
ALTER TYPE public.request_status ADD VALUE IF NOT EXISTS 'withdrawn';
