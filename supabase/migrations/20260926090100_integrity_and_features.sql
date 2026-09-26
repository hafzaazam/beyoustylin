-- =====================================================================
-- t-main: data integrity, security fixes and the server side of the
-- new features (booking edits, invoices, customer portal, team roles).
-- Depends on 20260926090000_enum_additions.sql ('void', 'withdrawn').
-- =====================================================================

-- ============ 1. SECURITY FIXES ============

-- 1a. Profiles were readable by every signed-in user (emails, phones, birthdays).
DROP POLICY IF EXISTS "Profiles readable by authenticated" ON public.profiles;
DROP POLICY IF EXISTS "Profiles readable by self or staff" ON public.profiles;
CREATE POLICY "Profiles readable by self or staff" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_staff(auth.uid()));

-- 1b. Users could raise their own loyalty_points through the update policy.
--     Only personal fields stay writable; points are changed by triggers only.
REVOKE INSERT, UPDATE ON public.profiles FROM authenticated;
GRANT INSERT (id, full_name, phone, avatar_url, address, birthday) ON public.profiles TO authenticated;
GRANT UPDATE (full_name, phone, avatar_url, address, birthday) ON public.profiles TO authenticated;

-- Backfill emails for profiles created before the email column existed.
UPDATE public.profiles p SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND p.email IS NULL;

-- 1c. Anyone could file a request "as" another user by sending their user_id.
--     (booking_id links an approved request to the booking created from it.)
ALTER TABLE public.appointment_requests
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Requests public insert" ON public.appointment_requests;
CREATE POLICY "Requests public insert"
ON public.appointment_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(btrim(name)) BETWEEN 2 AND 100
  AND length(btrim(phone)) BETWEEN 7 AND 20
  AND type IN ('booking'::request_type, 'quote'::request_type)
  AND status = 'pending'::request_status
  AND booking_id IS NULL
  AND (email IS NULL OR length(btrim(email)) <= 255)
  AND (notes IS NULL OR length(notes) <= 2000)
  AND (budget IS NULL OR length(budget) <= 100)
  AND (user_id IS NULL OR user_id = auth.uid())
);

-- 1d. A customer editing their own record must not be able to change
--     its status or re-point user_id. Not SECURITY DEFINER on purpose:
--     current_user is 'authenticated' only for direct client updates, so
--     trusted server functions (e.g. ensure_customer_record) are unaffected.
CREATE OR REPLACE FUNCTION public.customers_guard_self_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT public.is_staff(auth.uid()) THEN
    NEW.status := OLD.status;
    NEW.user_id := OLD.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customers_guard_self_update ON public.customers;
CREATE TRIGGER trg_customers_guard_self_update
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.customers_guard_self_update();

-- ============ 2. NEW COLUMNS ============

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS custom_total numeric(10,2);

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_custom_total_non_negative;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_custom_total_non_negative CHECK (custom_total IS NULL OR custom_total >= 0);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_method text;

CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start ON public.bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking ON public.invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.appointment_requests(status);

-- ============ 3. DELETE SAFETY ============

-- Deleting a customer used to cascade-delete all of their bookings.
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_customer_id_fkey;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_customer_id_fkey
  FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;

-- Any staff member could delete bookings; now only owners and managers.
DROP POLICY IF EXISTS "Bookings staff manage" ON public.bookings;
DROP POLICY IF EXISTS "Bookings staff insert" ON public.bookings;
DROP POLICY IF EXISTS "Bookings staff update" ON public.bookings;
DROP POLICY IF EXISTS "Bookings delete owner/manager" ON public.bookings;
CREATE POLICY "Bookings staff insert" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Bookings staff update" ON public.bookings FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Bookings delete owner/manager" ON public.bookings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

-- A booking with a paid invoice is financial history: cancel it, don't delete it.
CREATE OR REPLACE FUNCTION public.bookings_guard_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.invoices WHERE booking_id = OLD.id AND status = 'paid') THEN
    RAISE EXCEPTION 'This booking has a paid invoice and cannot be deleted. Cancel it instead.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_guard_delete ON public.bookings;
CREATE TRIGGER trg_bookings_guard_delete
  BEFORE DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_guard_delete();

-- service_ids are uuid[] (no foreign keys), so guard deletes by hand.
CREATE OR REPLACE FUNCTION public.services_guard_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.deals WHERE OLD.id = ANY(service_ids)) THEN
    RAISE EXCEPTION 'This service is part of a deal. Remove it from the deal, or disable the service instead.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.bookings WHERE OLD.id = ANY(service_ids)) THEN
    RAISE EXCEPTION 'This service has booking history. Disable it instead of deleting it.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_services_guard_delete ON public.services;
CREATE TRIGGER trg_services_guard_delete
  BEFORE DELETE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.services_guard_delete();

CREATE OR REPLACE FUNCTION public.deals_guard_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.bookings WHERE deal_id = OLD.id) THEN
    RAISE EXCEPTION 'This deal has booking history. Disable it instead of deleting it.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_deals_guard_delete ON public.deals;
CREATE TRIGGER trg_deals_guard_delete
  BEFORE DELETE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.deals_guard_delete();

-- ============ 4. DEALS: server-side duration ============

CREATE OR REPLACE FUNCTION public.deals_compute_duration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n_ids int;
  n_found int;
  dur int;
BEGIN
  -- de-duplicate while keeping the chosen order
  NEW.service_ids := ARRAY(
    SELECT x FROM unnest(NEW.service_ids) WITH ORDINALITY AS t(x, n)
    GROUP BY x ORDER BY min(n)
  );
  n_ids := coalesce(array_length(NEW.service_ids, 1), 0);
  IF n_ids = 0 THEN
    RAISE EXCEPTION 'A deal needs at least one service.';
  END IF;
  SELECT count(*), coalesce(sum(duration), 0) INTO n_found, dur
  FROM public.services WHERE id = ANY(NEW.service_ids);
  IF n_found <> n_ids THEN
    RAISE EXCEPTION 'One or more services in this deal no longer exist.';
  END IF;
  NEW.total_duration := dur;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deals_compute_duration ON public.deals;
CREATE TRIGGER trg_deals_compute_duration
  BEFORE INSERT OR UPDATE OF service_ids ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.deals_compute_duration();

-- When a service's duration changes, refresh every deal that contains it.
CREATE OR REPLACE FUNCTION public.services_refresh_deal_durations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.duration IS DISTINCT FROM OLD.duration THEN
    UPDATE public.deals SET service_ids = service_ids WHERE NEW.id = ANY(service_ids);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_services_refresh_deal_durations ON public.services;
CREATE TRIGGER trg_services_refresh_deal_durations
  AFTER UPDATE OF duration ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.services_refresh_deal_durations();

-- ============ 5. BOOKINGS: totals + overlap enforced in the database ============

-- Totals, duration and end time are computed here so the client cannot
-- send a wrong price, and they only change when the booked items change
-- (a later price change on a service never rewrites old bookings).
CREATE OR REPLACE FUNCTION public.bookings_compute_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n_ids int;
  n_found int;
  dur int := 0;
  price numeric(10,2) := 0;
  deal_row record;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.service_ids IS NOT DISTINCT FROM OLD.service_ids
     AND NEW.deal_id IS NOT DISTINCT FROM OLD.deal_id
     AND NEW.custom_total IS NOT DISTINCT FROM OLD.custom_total THEN
    NEW.total_price := OLD.total_price;
    NEW.total_duration := OLD.total_duration;
    NEW.end_time := NEW.start_time + make_interval(mins => OLD.total_duration);
    RETURN NEW;
  END IF;

  IF NEW.deal_id IS NOT NULL THEN
    SELECT discounted_price, total_duration INTO deal_row FROM public.deals WHERE id = NEW.deal_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'The selected deal no longer exists.';
    END IF;
    dur := deal_row.total_duration;
    price := deal_row.discounted_price;
    NEW.service_ids := '{}';
  ELSE
    NEW.service_ids := ARRAY(
      SELECT x FROM unnest(NEW.service_ids) WITH ORDINALITY AS t(x, n)
      GROUP BY x ORDER BY min(n)
    );
    n_ids := coalesce(array_length(NEW.service_ids, 1), 0);
    IF n_ids = 0 THEN
      RAISE EXCEPTION 'Select at least one service or a deal.';
    END IF;
    SELECT count(*), coalesce(sum(duration), 0), coalesce(sum(s.price), 0)
      INTO n_found, dur, price
    FROM public.services s WHERE s.id = ANY(NEW.service_ids);
    IF n_found <> n_ids THEN
      RAISE EXCEPTION 'One or more selected services no longer exist.';
    END IF;
  END IF;

  IF dur <= 0 THEN
    RAISE EXCEPTION 'The booking duration must be greater than zero.';
  END IF;

  NEW.total_duration := dur;
  NEW.total_price := coalesce(NEW.custom_total, price);
  NEW.end_time := NEW.start_time + make_interval(mins => dur);
  RETURN NEW;
END;
$$;

-- Same rule the UI shows: (new_start < existing_end) AND (new_end > existing_start)
-- for the same staff member or the same chair. Advisory locks serialize
-- concurrent bookings for the same staff/chair so two receptionists
-- cannot double-book at the same moment.
CREATE OR REPLACE FUNCTION public.bookings_prevent_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clash record;
BEGIN
  IF NEW.status NOT IN ('pending', 'confirmed', 'started') THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('booking-staff:' || NEW.staff_id::text));
  PERFORM pg_advisory_xact_lock(hashtext('booking-chair:' || NEW.chair_id::text));

  SELECT b.id, b.staff_id, b.chair_id INTO clash
  FROM public.bookings b
  WHERE b.id <> NEW.id
    AND b.status IN ('pending', 'confirmed', 'started')
    AND (b.staff_id = NEW.staff_id OR b.chair_id = NEW.chair_id)
    AND b.start_time < NEW.end_time
    AND b.end_time > NEW.start_time
  LIMIT 1;

  IF FOUND THEN
    IF clash.staff_id = NEW.staff_id THEN
      RAISE EXCEPTION 'This staff member already has a booking that overlaps this time.';
    ELSE
      RAISE EXCEPTION 'This chair is already booked for part of this time.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- BEFORE triggers run in name order: totals first, then the overlap check.
DROP TRIGGER IF EXISTS trg_bookings_10_totals ON public.bookings;
CREATE TRIGGER trg_bookings_10_totals
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_compute_totals();

DROP TRIGGER IF EXISTS trg_bookings_20_overlap ON public.bookings;
CREATE TRIGGER trg_bookings_20_overlap
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_prevent_overlap();

-- ============ 6. INVOICES: sequential numbers, created by the database ============

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq;

CREATE OR REPLACE FUNCTION public.next_invoice_number()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'BYS-' || to_char(now() AT TIME ZONE 'Asia/Karachi', 'YYYY') || '-'
         || lpad(nextval('public.invoice_number_seq')::text, 5, '0');
$$;

ALTER TABLE public.invoices ALTER COLUMN invoice_number SET DEFAULT public.next_invoice_number();

-- Line items snapshot for a booking (names/prices frozen at booking time).
CREATE OR REPLACE FUNCTION public.booking_invoice_items(_deal_id uuid, _service_ids uuid[], _total numeric)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb;
  v_sum numeric;
BEGIN
  IF _deal_id IS NOT NULL THEN
    SELECT jsonb_build_array(jsonb_build_object('name', d.name, 'price', d.discounted_price, 'type', 'deal'))
      INTO v_items
    FROM public.deals d WHERE d.id = _deal_id;
  ELSE
    SELECT jsonb_agg(jsonb_build_object('name', s.name, 'price', s.price, 'type', 'service') ORDER BY t.n)
      INTO v_items
    FROM unnest(_service_ids) WITH ORDINALITY AS t(sid, n)
    JOIN public.services s ON s.id = t.sid;
  END IF;
  v_items := coalesce(v_items, '[]'::jsonb);

  SELECT coalesce(sum((i->>'price')::numeric), 0) INTO v_sum FROM jsonb_array_elements(v_items) i;
  IF _total IS NOT NULL AND _total <> v_sum THEN
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'name', CASE WHEN _total < v_sum THEN 'Discount' ELSE 'Price adjustment' END,
      'price', _total - v_sum,
      'type', 'adjustment'
    ));
  END IF;
  RETURN v_items;
END;
$$;

CREATE OR REPLACE FUNCTION public.bookings_sync_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb;
  items_changed boolean;
BEGIN
  v_items := public.booking_invoice_items(NEW.deal_id, NEW.service_ids, NEW.total_price);

  IF TG_OP = 'INSERT' OR NOT EXISTS (SELECT 1 FROM public.invoices WHERE booking_id = NEW.id) THEN
    INSERT INTO public.invoices (booking_id, customer_id, staff_id, items, total_amount, status)
    VALUES (
      NEW.id, NEW.customer_id, NEW.staff_id, v_items, NEW.total_price,
      CASE WHEN NEW.status = 'canceled' THEN 'void'::invoice_status ELSE 'unpaid'::invoice_status END
    );
    RETURN NEW;
  END IF;

  items_changed := OLD.total_price IS DISTINCT FROM NEW.total_price
    OR OLD.service_ids IS DISTINCT FROM NEW.service_ids
    OR OLD.deal_id IS DISTINCT FROM NEW.deal_id
    OR OLD.customer_id IS DISTINCT FROM NEW.customer_id
    OR OLD.staff_id IS DISTINCT FROM NEW.staff_id;

  IF items_changed THEN
    IF EXISTS (SELECT 1 FROM public.invoices WHERE booking_id = NEW.id AND status = 'paid') THEN
      RAISE EXCEPTION 'This booking''s invoice is already paid. Mark the invoice unpaid before changing customer, staff, services or price.';
    END IF;
    UPDATE public.invoices
      SET items = v_items, total_amount = NEW.total_price,
          customer_id = NEW.customer_id, staff_id = NEW.staff_id
    WHERE booking_id = NEW.id AND status IN ('unpaid', 'void');
  END IF;

  IF NEW.status = 'canceled' AND OLD.status <> 'canceled' THEN
    UPDATE public.invoices SET status = 'void' WHERE booking_id = NEW.id AND status = 'unpaid';
  ELSIF OLD.status = 'canceled' AND NEW.status <> 'canceled' THEN
    UPDATE public.invoices SET status = 'unpaid' WHERE booking_id = NEW.id AND status = 'void';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_sync_invoice ON public.bookings;
CREATE TRIGGER trg_bookings_sync_invoice
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_sync_invoice();

-- paid_at / payment_method follow the status.
CREATE OR REPLACE FUNCTION public.invoices_track_payment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status = 'void' THEN
    RAISE EXCEPTION 'A void invoice cannot be marked paid. Re-open the booking first.';
  END IF;
  IF NEW.status = 'paid' THEN
    NEW.paid_at := coalesce(NEW.paid_at, OLD.paid_at, now());
  ELSE
    NEW.paid_at := NULL;
    NEW.payment_method := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoices_track_payment ON public.invoices;
CREATE TRIGGER trg_invoices_track_payment
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.invoices_track_payment();

-- ============ 7. LOYALTY: also take points back if a completion is reverted ============

CREATE OR REPLACE FUNCTION public.award_loyalty_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cust_user_id uuid;
  delta int := 0;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    delta := 10;
  ELSIF OLD.status = 'completed' AND NEW.status IS DISTINCT FROM 'completed' THEN
    delta := -10;
  END IF;
  IF delta <> 0 THEN
    SELECT user_id INTO cust_user_id FROM public.customers WHERE id = NEW.customer_id;
    IF cust_user_id IS NOT NULL THEN
      UPDATE public.profiles
        SET loyalty_points = greatest(0, loyalty_points + delta)
        WHERE id = cust_user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Walk-ins are inserted directly as completed; award those too.
CREATE OR REPLACE FUNCTION public.award_loyalty_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cust_user_id uuid;
BEGIN
  IF NEW.status = 'completed' THEN
    SELECT user_id INTO cust_user_id FROM public.customers WHERE id = NEW.customer_id;
    IF cust_user_id IS NOT NULL THEN
      UPDATE public.profiles SET loyalty_points = loyalty_points + 10 WHERE id = cust_user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_loyalty_on_booking_insert ON public.bookings;
CREATE TRIGGER award_loyalty_on_booking_insert
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.award_loyalty_on_insert();

-- ============ 8. CUSTOMER PORTAL: link logins to customer records ============

-- Called by the portal on sign-in. Links the signed-in user to an existing
-- customer record with the same (verified) email, or creates one.
-- Phone is deliberately NOT used for matching: it is not verified, so anyone
-- could claim another person's history by typing their number.
CREATE OR REPLACE FUNCTION public.ensure_customer_record()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cid uuid;
  p record;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  SELECT id INTO cid FROM public.customers WHERE user_id = uid;
  IF cid IS NOT NULL THEN
    RETURN cid;
  END IF;

  SELECT pr.full_name, pr.phone, u.email INTO p
  FROM auth.users u LEFT JOIN public.profiles pr ON pr.id = u.id
  WHERE u.id = uid;

  IF p.email IS NOT NULL THEN
    SELECT c.id INTO cid FROM public.customers c
    WHERE c.user_id IS NULL AND lower(c.email) = lower(p.email)
    ORDER BY c.created_at
    LIMIT 1;
  END IF;

  IF cid IS NOT NULL THEN
    UPDATE public.customers SET user_id = uid WHERE id = cid;
    RETURN cid;
  END IF;

  INSERT INTO public.customers (name, phone, email, user_id)
  VALUES (
    coalesce(nullif(btrim(p.full_name), ''), split_part(p.email, '@', 1), 'Customer'),
    coalesce(p.phone, ''),
    p.email,
    uid
  )
  RETURNING id INTO cid;
  RETURN cid;
END;
$$;

-- Staff can link (or unlink with _email = NULL) a customer record to a login.
CREATE OR REPLACE FUNCTION public.link_customer_account(_customer_id uuid, _email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid;
  other uuid;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Only staff can link customer accounts.';
  END IF;

  IF _email IS NULL OR btrim(_email) = '' THEN
    UPDATE public.customers SET user_id = NULL WHERE id = _customer_id;
    RETURN NULL;
  END IF;

  SELECT id INTO target FROM auth.users WHERE lower(email) = lower(btrim(_email));
  IF target IS NULL THEN
    RAISE EXCEPTION 'No account found for %. Ask the customer to sign up first.', _email;
  END IF;
  IF public.is_staff(target) THEN
    RAISE EXCEPTION 'That email belongs to a team member, not a customer.';
  END IF;

  SELECT id INTO other FROM public.customers WHERE user_id = target AND id <> _customer_id;
  IF other IS NOT NULL THEN
    RAISE EXCEPTION 'That account is already linked to another customer record.';
  END IF;

  UPDATE public.customers SET user_id = target WHERE id = _customer_id;
  RETURN target;
END;
$$;

-- Customers cannot read staff/chairs tables, so the portal gets names here.
CREATE OR REPLACE FUNCTION public.my_bookings()
RETURNS TABLE (
  id uuid,
  start_time timestamptz,
  end_time timestamptz,
  status public.booking_status,
  service_ids uuid[],
  deal_id uuid,
  total_price numeric,
  total_duration int,
  notes text,
  staff_name text,
  chair_name text,
  invoice_id uuid,
  invoice_number text,
  invoice_status public.invoice_status
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.start_time, b.end_time, b.status, b.service_ids, b.deal_id,
         b.total_price, b.total_duration, b.notes,
         s.name, ch.name, i.id, i.invoice_number, i.status
  FROM public.bookings b
  JOIN public.customers c ON c.id = b.customer_id AND c.user_id = auth.uid()
  LEFT JOIN public.staff s ON s.id = b.staff_id
  LEFT JOIN public.chairs ch ON ch.id = b.chair_id
  LEFT JOIN public.invoices i ON i.booking_id = b.id
  ORDER BY b.start_time DESC;
$$;

CREATE OR REPLACE FUNCTION public.cancel_my_booking(_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b record;
BEGIN
  SELECT bk.status, bk.start_time INTO b
  FROM public.bookings bk
  JOIN public.customers c ON c.id = bk.customer_id
  WHERE bk.id = _booking_id AND c.user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.';
  END IF;
  IF b.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'This booking can no longer be canceled online.';
  END IF;
  IF b.start_time < now() + interval '2 hours' THEN
    RAISE EXCEPTION 'Online cancellation closes 2 hours before the appointment. Please call the salon.';
  END IF;

  UPDATE public.bookings SET status = 'canceled' WHERE id = _booking_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_my_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.appointment_requests
    SET status = 'withdrawn'
  WHERE id = _request_id AND user_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only pending requests can be withdrawn.';
  END IF;
END;
$$;

-- ============ 9. TEAM MANAGEMENT ============

CREATE OR REPLACE FUNCTION public.list_team_members()
RETURNS TABLE (user_id uuid, email text, full_name text, role public.app_role, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF NOT (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')) THEN
    RAISE EXCEPTION 'Only owners and managers can view the team.';
  END IF;
  RETURN QUERY
    SELECT DISTINCT ON (u.id) u.id, u.email::text, p.full_name, r.role, r.created_at
    FROM public.user_roles r
    JOIN auth.users u ON u.id = r.user_id
    LEFT JOIN public.profiles p ON p.id = u.id
    ORDER BY u.id, r.role;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_member_role(_email text, _role public.app_role)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  caller_is_owner boolean := public.has_role(auth.uid(), 'owner');
  target uuid;
  owner_count int;
BEGIN
  IF NOT (caller_is_owner OR public.has_role(caller, 'manager')) THEN
    RAISE EXCEPTION 'Only owners and managers can manage the team.';
  END IF;
  IF _role IN ('owner', 'manager') AND NOT caller_is_owner THEN
    RAISE EXCEPTION 'Only an owner can grant the owner or manager role.';
  END IF;

  SELECT id INTO target FROM auth.users WHERE lower(email) = lower(btrim(_email));
  IF target IS NULL THEN
    RAISE EXCEPTION 'No account found for %. Ask them to create an account first.', _email;
  END IF;

  IF (public.has_role(target, 'owner') OR public.has_role(target, 'manager')) AND NOT caller_is_owner THEN
    RAISE EXCEPTION 'Only an owner can change an owner or manager.';
  END IF;

  IF public.has_role(target, 'owner') AND _role <> 'owner' THEN
    SELECT count(DISTINCT r.user_id) INTO owner_count FROM public.user_roles r WHERE r.role = 'owner';
    IF owner_count <= 1 THEN
      RAISE EXCEPTION 'You cannot demote the last owner.';
    END IF;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = target;
  INSERT INTO public.user_roles (user_id, role) VALUES (target, _role);
  RETURN target;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_team_member(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_owner boolean := public.has_role(auth.uid(), 'owner');
  owner_count int;
BEGIN
  IF NOT (caller_is_owner OR public.has_role(auth.uid(), 'manager')) THEN
    RAISE EXCEPTION 'Only owners and managers can manage the team.';
  END IF;
  IF (public.has_role(_user_id, 'owner') OR public.has_role(_user_id, 'manager')) AND NOT caller_is_owner THEN
    RAISE EXCEPTION 'Only an owner can remove an owner or manager.';
  END IF;
  IF public.has_role(_user_id, 'owner') THEN
    SELECT count(DISTINCT r.user_id) INTO owner_count FROM public.user_roles r WHERE r.role = 'owner';
    IF owner_count <= 1 THEN
      RAISE EXCEPTION 'You cannot remove the last owner.';
    END IF;
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
END;
$$;

-- ============ 10. FUNCTION PRIVILEGES ============

REVOKE EXECUTE ON FUNCTION public.ensure_customer_record() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.link_customer_account(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_bookings() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_my_booking(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.withdraw_my_request(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_team_members() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_member_role(text, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.remove_team_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.booking_invoice_items(uuid, uuid[], numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.next_invoice_number() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.ensure_customer_record() TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_customer_account(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_bookings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_my_booking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_my_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_team_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_member_role(text, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_team_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.booking_invoice_items(uuid, uuid[], numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_invoice_number() TO authenticated;

-- ============ 11. REALTIME ============
-- Admin screens update live when another staff member books or a request arrives.
DO $$
DECLARE
  t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['bookings', 'invoices', 'appointment_requests'] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END;
$$;
