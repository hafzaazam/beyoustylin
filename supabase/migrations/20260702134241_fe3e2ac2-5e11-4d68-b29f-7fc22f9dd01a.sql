
-- Revoke anon SELECT on staff-only tables so they're not exposed via GraphQL/PostgREST to anonymous callers.
-- Services and deals intentionally keep anon SELECT (public menu).
REVOKE SELECT ON public.profiles FROM anon;
REVOKE SELECT ON public.user_roles FROM anon;
REVOKE SELECT ON public.staff FROM anon;
REVOKE SELECT ON public.customers FROM anon;
REVOKE SELECT ON public.chairs FROM anon;
REVOKE SELECT ON public.bookings FROM anon;
REVOKE SELECT ON public.invoices FROM anon;
REVOKE SELECT ON public.appointment_requests FROM anon;
