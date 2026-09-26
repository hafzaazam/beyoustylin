-- =====================================================================
-- Discount codes, gift vouchers, retail products and point-of-sale.
--
-- Money rules (cash basis, nothing counted twice):
--   * Selling a gift voucher is revenue when it is sold (a sale line).
--   * Paying with a gift voucher later is NOT new revenue: it reduces the
--     voucher balance and the amount the customer still has to pay.
--   * Discount codes reduce an invoice or a sale; they never go below zero.
-- All money/stock changes go through SECURITY DEFINER functions so the
-- rules can't be bypassed from the browser. Safe to re-run.
-- =====================================================================

-- ============ 1. DISCOUNT CODES ============

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'discount_kind' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.discount_kind AS ENUM ('percent', 'fixed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  kind public.discount_kind NOT NULL,
  value numeric(10,2) NOT NULL,
  -- what the code can be used on
  applies_to text NOT NULL DEFAULT 'all',
  min_spend numeric(10,2) NOT NULL DEFAULT 0,
  starts_on date,
  ends_on date,
  max_uses int,
  uses int NOT NULL DEFAULT 0,
  status public.entity_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discount_codes_code_format CHECK (code ~ '^[A-Z0-9_-]{3,30}$'),
  CONSTRAINT discount_codes_value_positive CHECK (value > 0),
  CONSTRAINT discount_codes_percent_max CHECK (kind <> 'percent' OR value <= 100),
  CONSTRAINT discount_codes_applies_to CHECK (applies_to IN ('all', 'services', 'products')),
  CONSTRAINT discount_codes_min_spend CHECK (min_spend >= 0),
  CONSTRAINT discount_codes_dates CHECK (ends_on IS NULL OR starts_on IS NULL OR ends_on >= starts_on),
  CONSTRAINT discount_codes_max_uses CHECK (max_uses IS NULL OR max_uses > 0),
  CONSTRAINT discount_codes_uses CHECK (uses >= 0)
);

-- Codes are case-insensitive for staff: store them upper-case.
CREATE OR REPLACE FUNCTION public.discount_codes_normalize()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.code := upper(btrim(NEW.code));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_discount_codes_normalize ON public.discount_codes;
CREATE TRIGGER trg_discount_codes_normalize
  BEFORE INSERT OR UPDATE OF code ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.discount_codes_normalize();

DROP TRIGGER IF EXISTS trg_discount_codes_updated ON public.discount_codes;
CREATE TRIGGER trg_discount_codes_updated
  BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.discount_codes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_codes TO service_role;
DROP POLICY IF EXISTS "Discount codes staff read" ON public.discount_codes;
DROP POLICY IF EXISTS "Discount codes staff insert" ON public.discount_codes;
DROP POLICY IF EXISTS "Discount codes staff update" ON public.discount_codes;
DROP POLICY IF EXISTS "Discount codes delete owner/manager" ON public.discount_codes;
CREATE POLICY "Discount codes staff read" ON public.discount_codes FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Discount codes staff insert" ON public.discount_codes FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Discount codes staff update" ON public.discount_codes FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Discount codes delete owner/manager" ON public.discount_codes FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

-- ============ 2. GIFT VOUCHERS ============

CREATE OR REPLACE FUNCTION public.next_gift_voucher_code()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  -- 10 hex characters from a random UUID: ~1 trillion combinations.
  SELECT 'GV-' || upper(substr(h, 1, 5)) || '-' || upper(substr(h, 6, 5))
  FROM (SELECT replace(gen_random_uuid()::text, '-', '') AS h) t;
$$;

CREATE TABLE IF NOT EXISTS public.gift_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT public.next_gift_voucher_code(),
  initial_value numeric(10,2) NOT NULL,
  balance numeric(10,2) NOT NULL,
  recipient_name text,
  recipient_phone text,
  purchaser_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  sale_id uuid,
  expires_on date,
  status public.entity_status NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gift_vouchers_value_positive CHECK (initial_value > 0),
  CONSTRAINT gift_vouchers_balance_range CHECK (balance >= 0 AND balance <= initial_value)
);

DROP TRIGGER IF EXISTS trg_gift_vouchers_updated ON public.gift_vouchers;
CREATE TRIGGER trg_gift_vouchers_updated
  BEFORE UPDATE ON public.gift_vouchers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.gift_vouchers ENABLE ROW LEVEL SECURITY;
-- Vouchers are created by create_sale() and balances change only through
-- the redeem/refund functions; staff may edit the descriptive fields only.
REVOKE ALL ON public.gift_vouchers FROM anon, authenticated;
GRANT SELECT ON public.gift_vouchers TO authenticated;
GRANT UPDATE (recipient_name, recipient_phone, expires_on, status, notes) ON public.gift_vouchers TO authenticated;
GRANT ALL ON public.gift_vouchers TO service_role;
DROP POLICY IF EXISTS "Gift vouchers staff read" ON public.gift_vouchers;
DROP POLICY IF EXISTS "Gift vouchers staff update" ON public.gift_vouchers;
CREATE POLICY "Gift vouchers staff read" ON public.gift_vouchers FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Gift vouchers staff update" ON public.gift_vouchers FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============ 3. PRODUCTS ============

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text,
  category text NOT NULL DEFAULT 'Other',
  sku text UNIQUE,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  cost numeric(10,2),
  stock int NOT NULL DEFAULT 0,
  low_stock_at int NOT NULL DEFAULT 3,
  status public.entity_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_price CHECK (price >= 0),
  CONSTRAINT products_cost CHECK (cost IS NULL OR cost >= 0),
  CONSTRAINT products_stock CHECK (stock >= 0),
  CONSTRAINT products_low_stock CHECK (low_stock_at >= 0)
);

DROP TRIGGER IF EXISTS trg_products_updated ON public.products;
CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.products FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
DROP POLICY IF EXISTS "Products staff read" ON public.products;
DROP POLICY IF EXISTS "Products staff insert" ON public.products;
DROP POLICY IF EXISTS "Products staff update" ON public.products;
DROP POLICY IF EXISTS "Products delete owner/manager" ON public.products;
CREATE POLICY "Products staff read" ON public.products FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Products staff insert" ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Products staff update" ON public.products FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Products delete owner/manager" ON public.products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

-- ============ 4. SALES (point of sale) ============

CREATE SEQUENCE IF NOT EXISTS public.sale_number_seq;

CREATE OR REPLACE FUNCTION public.next_sale_number()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'BYS-S-' || to_char(now() AT TIME ZONE 'Asia/Karachi', 'YYYY') || '-'
         || lpad(nextval('public.sale_number_seq')::text, 5, '0');
$$;

CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number text NOT NULL UNIQUE DEFAULT public.next_sale_number(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE RESTRICT,
  customer_name text,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  discount_code_id uuid REFERENCES public.discount_codes(id) ON DELETE SET NULL,
  discount_code text,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  gift_voucher_id uuid REFERENCES public.gift_vouchers(id) ON DELETE RESTRICT,
  voucher_amount numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text,
  status public.invoice_status NOT NULL DEFAULT 'paid',
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  void_reason text,
  CONSTRAINT sales_amounts CHECK (subtotal >= 0 AND discount_amount >= 0 AND total >= 0 AND voucher_amount >= 0 AND voucher_amount <= total)
);

CREATE TABLE IF NOT EXISTS public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  kind text NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE RESTRICT,
  gift_voucher_id uuid REFERENCES public.gift_vouchers(id) ON DELETE RESTRICT,
  name text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  line_total numeric(10,2) NOT NULL,
  CONSTRAINT sale_items_kind CHECK (kind IN ('product', 'voucher')),
  CONSTRAINT sale_items_quantity CHECK (quantity > 0),
  CONSTRAINT sale_items_prices CHECK (unit_price >= 0 AND line_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sales_created ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.sale_items(product_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gift_vouchers_sale_id_fkey') THEN
    ALTER TABLE public.gift_vouchers
      ADD CONSTRAINT gift_vouchers_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Sales are written only by create_sale()/void_sale(); staff can read them.
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales, public.sale_items FROM anon, authenticated;
GRANT SELECT ON public.sales, public.sale_items TO authenticated;
GRANT ALL ON public.sales, public.sale_items TO service_role;
DROP POLICY IF EXISTS "Sales staff read" ON public.sales;
DROP POLICY IF EXISTS "Sale items staff read" ON public.sale_items;
CREATE POLICY "Sales staff read" ON public.sales FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "Sale items staff read" ON public.sale_items FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

-- ============ 5. INVOICES: discount + gift voucher columns ============

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS subtotal numeric(10,2),
  ADD COLUMN IF NOT EXISTS discount_code_id uuid REFERENCES public.discount_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gift_voucher_id uuid REFERENCES public.gift_vouchers(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS voucher_amount numeric(10,2) NOT NULL DEFAULT 0;

UPDATE public.invoices SET subtotal = total_amount WHERE subtotal IS NULL;
ALTER TABLE public.invoices ALTER COLUMN subtotal SET DEFAULT 0;
ALTER TABLE public.invoices ALTER COLUMN subtotal SET NOT NULL;

-- ============ 6. SHARED MONEY HELPERS ============

-- Whole rupees; never more than the eligible amount.
CREATE OR REPLACE FUNCTION public.discount_amount_for(_kind public.discount_kind, _value numeric, _eligible numeric)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _eligible <= 0 THEN 0
    WHEN _kind = 'percent' THEN least(_eligible, round(_eligible * _value / 100))
    ELSE least(_eligible, _value)
  END;
$$;

-- Validates a code for a purchase of `_eligible` rupees on `_target`
-- ('services' for booking invoices, 'products' for retail) and locks it.
CREATE OR REPLACE FUNCTION public.validate_discount_code(_code text, _eligible numeric, _target text)
RETURNS public.discount_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dc public.discount_codes;
  today date := (now() AT TIME ZONE 'Asia/Karachi')::date;
BEGIN
  SELECT * INTO dc FROM public.discount_codes WHERE code = upper(btrim(_code)) FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Discount code "%" does not exist.', upper(btrim(_code));
  END IF;
  IF dc.status <> 'active' THEN
    RAISE EXCEPTION 'Discount code % is disabled.', dc.code;
  END IF;
  IF dc.starts_on IS NOT NULL AND today < dc.starts_on THEN
    RAISE EXCEPTION 'Discount code % starts on %.', dc.code, to_char(dc.starts_on, 'DD Mon YYYY');
  END IF;
  IF dc.ends_on IS NOT NULL AND today > dc.ends_on THEN
    RAISE EXCEPTION 'Discount code % expired on %.', dc.code, to_char(dc.ends_on, 'DD Mon YYYY');
  END IF;
  IF dc.max_uses IS NOT NULL AND dc.uses >= dc.max_uses THEN
    RAISE EXCEPTION 'Discount code % has already been used the maximum % times.', dc.code, dc.max_uses;
  END IF;
  IF dc.applies_to <> 'all' AND dc.applies_to <> _target THEN
    RAISE EXCEPTION 'Discount code % only applies to %.', dc.code, dc.applies_to;
  END IF;
  IF _eligible < dc.min_spend THEN
    RAISE EXCEPTION 'Discount code % needs a minimum spend of Rs. %.', dc.code, to_char(dc.min_spend, 'FM999,999,990');
  END IF;
  RETURN dc;
END;
$$;

-- Validates and locks a gift voucher for redemption.
CREATE OR REPLACE FUNCTION public.validate_gift_voucher(_code text)
RETURNS public.gift_vouchers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gv public.gift_vouchers;
BEGIN
  SELECT * INTO gv FROM public.gift_vouchers WHERE code = upper(btrim(_code)) FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gift voucher "%" does not exist.', upper(btrim(_code));
  END IF;
  IF gv.status <> 'active' THEN
    RAISE EXCEPTION 'Gift voucher % is disabled.', gv.code;
  END IF;
  IF gv.expires_on IS NOT NULL AND (now() AT TIME ZONE 'Asia/Karachi')::date > gv.expires_on THEN
    RAISE EXCEPTION 'Gift voucher % expired on %.', gv.code, to_char(gv.expires_on, 'DD Mon YYYY');
  END IF;
  IF gv.balance <= 0 THEN
    RAISE EXCEPTION 'Gift voucher % has no balance left.', gv.code;
  END IF;
  RETURN gv;
END;
$$;

-- Recomputes discount, total and voucher cover of an invoice from its subtotal.
-- A percentage discount follows subtotal changes; a voucher never covers more
-- than the total (any excess goes back to the voucher).
CREATE OR REPLACE FUNCTION public.invoice_refresh(_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.invoices;
  dc public.discount_codes;
  d numeric := 0;
  tot numeric;
  va numeric;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE id = _invoice_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF inv.discount_code_id IS NOT NULL THEN
    SELECT * INTO dc FROM public.discount_codes WHERE id = inv.discount_code_id;
    d := CASE WHEN FOUND THEN public.discount_amount_for(dc.kind, dc.value, inv.subtotal) ELSE inv.discount_amount END;
  ELSIF inv.discount_code IS NOT NULL THEN
    d := inv.discount_amount; -- code was deleted: keep the amount granted
  END IF;
  d := least(greatest(d, 0), inv.subtotal);
  tot := inv.subtotal - d;

  va := inv.voucher_amount;
  IF va > tot THEN
    UPDATE public.gift_vouchers SET balance = balance + (va - tot) WHERE id = inv.gift_voucher_id;
    va := tot;
  END IF;

  UPDATE public.invoices
    SET discount_amount = d,
        total_amount = tot,
        voucher_amount = va,
        gift_voucher_id = CASE WHEN va = 0 THEN NULL ELSE gift_voucher_id END
  WHERE id = _invoice_id;

  -- If the voucher now covers everything, nothing is left to collect.
  IF inv.status = 'unpaid' AND va > 0 AND va >= tot THEN
    UPDATE public.invoices SET status = 'paid', payment_method = 'Gift voucher' WHERE id = _invoice_id;
  END IF;
END;
$$;

-- Gives back the voucher money and the discount use of an invoice.
CREATE OR REPLACE FUNCTION public.invoice_release_credits(_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.invoices;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE id = _invoice_id FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF inv.gift_voucher_id IS NOT NULL AND inv.voucher_amount > 0 THEN
    UPDATE public.gift_vouchers SET balance = balance + inv.voucher_amount WHERE id = inv.gift_voucher_id;
  END IF;
  IF inv.discount_code_id IS NOT NULL THEN
    UPDATE public.discount_codes SET uses = greatest(0, uses - 1) WHERE id = inv.discount_code_id;
  END IF;
  UPDATE public.invoices
    SET gift_voucher_id = NULL, voucher_amount = 0,
        discount_code_id = NULL, discount_code = NULL, discount_amount = 0,
        total_amount = subtotal
  WHERE id = _invoice_id;
END;
$$;

-- ============ 7. BOOKING → INVOICE SYNC (now aware of discounts/vouchers) ============

CREATE OR REPLACE FUNCTION public.bookings_sync_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items jsonb;
  items_changed boolean;
  inv_id uuid;
BEGIN
  v_items := public.booking_invoice_items(NEW.deal_id, NEW.service_ids, NEW.total_price);

  IF TG_OP = 'INSERT' OR NOT EXISTS (SELECT 1 FROM public.invoices WHERE booking_id = NEW.id) THEN
    INSERT INTO public.invoices (booking_id, customer_id, staff_id, items, subtotal, total_amount, status)
    VALUES (
      NEW.id, NEW.customer_id, NEW.staff_id, v_items, NEW.total_price, NEW.total_price,
      CASE WHEN NEW.status = 'canceled' THEN 'void'::invoice_status ELSE 'unpaid'::invoice_status END
    );
    RETURN NEW;
  END IF;

  SELECT id INTO inv_id FROM public.invoices WHERE booking_id = NEW.id;

  items_changed := OLD.total_price IS DISTINCT FROM NEW.total_price
    OR OLD.service_ids IS DISTINCT FROM NEW.service_ids
    OR OLD.deal_id IS DISTINCT FROM NEW.deal_id
    OR OLD.customer_id IS DISTINCT FROM NEW.customer_id
    OR OLD.staff_id IS DISTINCT FROM NEW.staff_id;

  IF items_changed THEN
    IF EXISTS (SELECT 1 FROM public.invoices WHERE id = inv_id AND status = 'paid') THEN
      RAISE EXCEPTION 'This booking''s invoice is already paid. Mark the invoice unpaid before changing customer, staff, services or price.';
    END IF;
    UPDATE public.invoices
      SET items = v_items, subtotal = NEW.total_price,
          customer_id = NEW.customer_id, staff_id = NEW.staff_id
    WHERE id = inv_id AND status IN ('unpaid', 'void');
    PERFORM public.invoice_refresh(inv_id);
  END IF;

  IF NEW.status = 'canceled' AND OLD.status <> 'canceled' THEN
    IF EXISTS (SELECT 1 FROM public.invoices WHERE id = inv_id AND status = 'unpaid') THEN
      PERFORM public.invoice_release_credits(inv_id);
      UPDATE public.invoices SET status = 'void' WHERE id = inv_id;
    END IF;
  ELSIF OLD.status = 'canceled' AND NEW.status <> 'canceled' THEN
    UPDATE public.invoices SET status = 'unpaid' WHERE id = inv_id AND status = 'void';
  END IF;

  RETURN NEW;
END;
$$;

-- ============ 8. INVOICE DISCOUNT / GIFT VOUCHER FUNCTIONS ============

CREATE OR REPLACE FUNCTION public.apply_invoice_discount(_invoice_id uuid, _code text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.invoices;
  dc public.discount_codes;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Only staff can apply discounts.'; END IF;
  SELECT * INTO inv FROM public.invoices WHERE id = _invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found.'; END IF;
  IF inv.status <> 'unpaid' THEN RAISE EXCEPTION 'Discounts can only be added to unpaid invoices.'; END IF;
  IF inv.discount_code_id IS NOT NULL OR inv.discount_code IS NOT NULL THEN
    RAISE EXCEPTION 'This invoice already has discount code %. Remove it first.', inv.discount_code;
  END IF;

  dc := public.validate_discount_code(_code, inv.subtotal, 'services');
  UPDATE public.discount_codes SET uses = uses + 1 WHERE id = dc.id;
  UPDATE public.invoices SET discount_code_id = dc.id, discount_code = dc.code WHERE id = _invoice_id;
  PERFORM public.invoice_refresh(_invoice_id);
  RETURN (SELECT discount_amount FROM public.invoices WHERE id = _invoice_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_invoice_discount(_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.invoices;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Only staff can remove discounts.'; END IF;
  SELECT * INTO inv FROM public.invoices WHERE id = _invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found.'; END IF;
  IF inv.status <> 'unpaid' THEN RAISE EXCEPTION 'Discounts can only be removed from unpaid invoices.'; END IF;
  IF inv.discount_code_id IS NOT NULL THEN
    UPDATE public.discount_codes SET uses = greatest(0, uses - 1) WHERE id = inv.discount_code_id;
  END IF;
  UPDATE public.invoices
    SET discount_code_id = NULL, discount_code = NULL, discount_amount = 0
  WHERE id = _invoice_id;
  PERFORM public.invoice_refresh(_invoice_id);
END;
$$;

-- Returns the amount covered by the voucher. If it covers everything the
-- invoice is marked paid with method "Gift voucher".
CREATE OR REPLACE FUNCTION public.apply_invoice_gift_voucher(_invoice_id uuid, _code text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.invoices;
  gv public.gift_vouchers;
  amt numeric;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Only staff can redeem gift vouchers.'; END IF;
  SELECT * INTO inv FROM public.invoices WHERE id = _invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found.'; END IF;
  IF inv.status <> 'unpaid' THEN RAISE EXCEPTION 'Gift vouchers can only be used on unpaid invoices.'; END IF;
  IF inv.gift_voucher_id IS NOT NULL THEN RAISE EXCEPTION 'A gift voucher is already applied to this invoice. Remove it first.'; END IF;
  IF inv.total_amount <= 0 THEN RAISE EXCEPTION 'Nothing left to pay on this invoice.'; END IF;

  gv := public.validate_gift_voucher(_code);
  amt := least(gv.balance, inv.total_amount);
  UPDATE public.gift_vouchers SET balance = balance - amt WHERE id = gv.id;
  UPDATE public.invoices SET gift_voucher_id = gv.id, voucher_amount = amt WHERE id = _invoice_id;
  IF amt >= inv.total_amount THEN
    UPDATE public.invoices SET status = 'paid', payment_method = 'Gift voucher' WHERE id = _invoice_id;
  END IF;
  RETURN amt;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_invoice_gift_voucher(_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv public.invoices;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Only staff can change gift vouchers.'; END IF;
  SELECT * INTO inv FROM public.invoices WHERE id = _invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found.'; END IF;
  IF inv.gift_voucher_id IS NULL THEN RETURN; END IF;
  IF inv.status = 'paid' AND inv.payment_method IS DISTINCT FROM 'Gift voucher' THEN
    RAISE EXCEPTION 'Mark the invoice unpaid before removing the gift voucher.';
  END IF;
  UPDATE public.gift_vouchers SET balance = balance + inv.voucher_amount WHERE id = inv.gift_voucher_id;
  UPDATE public.invoices
    SET gift_voucher_id = NULL, voucher_amount = 0,
        status = CASE WHEN status = 'paid' THEN 'unpaid'::invoice_status ELSE status END
  WHERE id = _invoice_id;
END;
$$;

-- ============ 9. POINT OF SALE ============

-- _items: [{"kind":"product","product_id":"…","quantity":2},
--          {"kind":"voucher","value":5000,"recipient_name":"…","recipient_phone":"…","expires_on":"2027-09-30"}]
-- Discount codes apply to products only; gift vouchers can pay for products
-- but not for other gift vouchers.
CREATE OR REPLACE FUNCTION public.create_sale(
  _items jsonb,
  _customer_id uuid DEFAULT NULL,
  _customer_name text DEFAULT NULL,
  _staff_id uuid DEFAULT NULL,
  _discount_code text DEFAULT NULL,
  _gift_voucher_code text DEFAULT NULL,
  _payment_method text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id uuid;
  item jsonb;
  p public.products;
  qty int;
  val numeric;
  gv public.gift_vouchers;
  dc public.discount_codes;
  product_sub numeric := 0;
  voucher_sub numeric := 0;
  d numeric := 0;
  va numeric := 0;
  tot numeric;
  new_voucher_id uuid;
  new_voucher_code text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Only staff can record sales.'; END IF;
  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'Add at least one item to the sale.';
  END IF;

  INSERT INTO public.sales (customer_id, customer_name, staff_id, notes)
  VALUES (
    _customer_id,
    coalesce(nullif(btrim(_customer_name), ''), (SELECT name FROM public.customers WHERE id = _customer_id)),
    _staff_id,
    nullif(btrim(_notes), '')
  )
  RETURNING id INTO v_sale_id;

  FOR item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    IF item->>'kind' = 'product' THEN
      qty := coalesce((item->>'quantity')::int, 1);
      IF qty <= 0 THEN RAISE EXCEPTION 'Quantity must be at least 1.'; END IF;
      SELECT * INTO p FROM public.products WHERE id = (item->>'product_id')::uuid FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'A product in the basket no longer exists.'; END IF;
      IF p.status <> 'active' THEN RAISE EXCEPTION '% is disabled and cannot be sold.', p.name; END IF;
      IF p.stock < qty THEN
        RAISE EXCEPTION 'Only % of % left in stock.', p.stock, p.name;
      END IF;
      UPDATE public.products SET stock = stock - qty WHERE id = p.id;
      INSERT INTO public.sale_items (sale_id, kind, product_id, name, quantity, unit_price, line_total)
      VALUES (v_sale_id, 'product', p.id, p.name, qty, p.price, p.price * qty);
      product_sub := product_sub + p.price * qty;

    ELSIF item->>'kind' = 'voucher' THEN
      val := round((item->>'value')::numeric);
      IF val IS NULL OR val < 100 THEN RAISE EXCEPTION 'Gift vouchers must be worth at least Rs. 100.'; END IF;
      IF val > 1000000 THEN RAISE EXCEPTION 'Gift voucher value is too large.'; END IF;
      INSERT INTO public.gift_vouchers (initial_value, balance, recipient_name, recipient_phone, purchaser_customer_id, sale_id, expires_on)
      VALUES (
        val, val,
        nullif(btrim(item->>'recipient_name'), ''),
        nullif(btrim(item->>'recipient_phone'), ''),
        _customer_id, v_sale_id,
        coalesce((item->>'expires_on')::date, ((now() AT TIME ZONE 'Asia/Karachi')::date + interval '1 year')::date)
      )
      RETURNING id, code INTO new_voucher_id, new_voucher_code;
      INSERT INTO public.sale_items (sale_id, kind, gift_voucher_id, name, quantity, unit_price, line_total)
      VALUES (v_sale_id, 'voucher', new_voucher_id, 'Gift voucher ' || new_voucher_code, 1, val, val);
      voucher_sub := voucher_sub + val;

    ELSE
      RAISE EXCEPTION 'Unknown item type in the basket.';
    END IF;
  END LOOP;

  IF nullif(btrim(_discount_code), '') IS NOT NULL THEN
    IF product_sub <= 0 THEN
      RAISE EXCEPTION 'Discount codes apply to products, not to gift vouchers.';
    END IF;
    dc := public.validate_discount_code(_discount_code, product_sub, 'products');
    d := public.discount_amount_for(dc.kind, dc.value, product_sub);
    UPDATE public.discount_codes SET uses = uses + 1 WHERE id = dc.id;
  END IF;

  tot := product_sub + voucher_sub - d;

  IF nullif(btrim(_gift_voucher_code), '') IS NOT NULL THEN
    IF product_sub - d <= 0 THEN
      RAISE EXCEPTION 'A gift voucher can pay for products, not for other gift vouchers.';
    END IF;
    gv := public.validate_gift_voucher(_gift_voucher_code);
    va := least(gv.balance, product_sub - d);
    UPDATE public.gift_vouchers SET balance = balance - va WHERE id = gv.id;
  END IF;

  IF tot - va > 0 AND nullif(btrim(_payment_method), '') IS NULL THEN
    RAISE EXCEPTION 'Choose how the customer paid.';
  END IF;

  UPDATE public.sales SET
    subtotal = product_sub + voucher_sub,
    discount_code_id = dc.id,
    discount_code = dc.code,
    discount_amount = d,
    total = tot,
    gift_voucher_id = gv.id,
    voucher_amount = va,
    payment_method = CASE WHEN tot - va <= 0 THEN 'Gift voucher' ELSE btrim(_payment_method) END
  WHERE id = v_sale_id;

  RETURN v_sale_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.void_sale(_sale_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.sales;
  it record;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')) THEN
    RAISE EXCEPTION 'Only an owner or manager can void a sale.';
  END IF;
  SELECT * INTO s FROM public.sales WHERE id = _sale_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale not found.'; END IF;
  IF s.status = 'void' THEN RAISE EXCEPTION 'This sale is already void.'; END IF;

  -- Vouchers sold in this sale must be unused to take the money back.
  IF EXISTS (
    SELECT 1 FROM public.gift_vouchers g
    JOIN public.sale_items si ON si.gift_voucher_id = g.id
    WHERE si.sale_id = _sale_id AND g.balance < g.initial_value
  ) THEN
    RAISE EXCEPTION 'A gift voucher from this sale has already been used, so the sale cannot be voided.';
  END IF;

  FOR it IN SELECT * FROM public.sale_items WHERE sale_id = _sale_id LOOP
    IF it.kind = 'product' AND it.product_id IS NOT NULL THEN
      UPDATE public.products SET stock = stock + it.quantity WHERE id = it.product_id;
    ELSIF it.kind = 'voucher' AND it.gift_voucher_id IS NOT NULL THEN
      UPDATE public.gift_vouchers SET balance = 0, status = 'disabled' WHERE id = it.gift_voucher_id;
    END IF;
  END LOOP;

  IF s.gift_voucher_id IS NOT NULL AND s.voucher_amount > 0 THEN
    UPDATE public.gift_vouchers SET balance = balance + s.voucher_amount WHERE id = s.gift_voucher_id;
  END IF;
  IF s.discount_code_id IS NOT NULL THEN
    UPDATE public.discount_codes SET uses = greatest(0, uses - 1) WHERE id = s.discount_code_id;
  END IF;

  UPDATE public.sales
    SET status = 'void', voided_at = now(), void_reason = nullif(btrim(_reason), '')
  WHERE id = _sale_id;
END;
$$;

-- ============ 10. PRIVILEGES ============

DO $$
DECLARE
  f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'public.validate_discount_code(text, numeric, text)',
    'public.validate_gift_voucher(text)',
    'public.invoice_refresh(uuid)',
    'public.invoice_release_credits(uuid)',
    'public.apply_invoice_discount(uuid, text)',
    'public.remove_invoice_discount(uuid)',
    'public.apply_invoice_gift_voucher(uuid, text)',
    'public.remove_invoice_gift_voucher(uuid)',
    'public.create_sale(jsonb, uuid, text, uuid, text, text, text, text)',
    'public.void_sale(uuid, text)',
    'public.next_sale_number()',
    'public.next_gift_voucher_code()'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', f);
  END LOOP;
END $$;

-- Internal helpers: not callable from the browser at all.
REVOKE EXECUTE ON FUNCTION public.validate_discount_code(text, numeric, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_gift_voucher(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.invoice_refresh(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.invoice_release_credits(uuid) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.apply_invoice_discount(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_invoice_discount(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_invoice_gift_voucher(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_invoice_gift_voucher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_sale(jsonb, uuid, text, uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_sale(uuid, text) TO authenticated;
-- Column defaults run as the inserting role (inside create_sale: the definer).
GRANT EXECUTE ON FUNCTION public.next_sale_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_gift_voucher_code() TO authenticated;

-- ============ 11. REALTIME ============
DO $$
DECLARE
  t text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY ARRAY['sales', 'products', 'gift_vouchers'] LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;
