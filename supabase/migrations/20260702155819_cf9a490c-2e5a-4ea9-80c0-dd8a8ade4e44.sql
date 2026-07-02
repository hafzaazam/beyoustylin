
-- 1. Extend profiles for customer data
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS birthday date,
  ADD COLUMN IF NOT EXISTS loyalty_points integer NOT NULL DEFAULT 0;

-- 2. Link customers table to auth users (optional; used for self-service)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_user_id ON public.customers(user_id);

-- 3. Link appointment_requests to auth users when submitted while signed in
ALTER TABLE public.appointment_requests
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointment_requests_user_id ON public.appointment_requests(user_id);

-- 4. Favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT favorites_one_target CHECK (
    (service_id IS NOT NULL AND deal_id IS NULL) OR
    (service_id IS NULL AND deal_id IS NOT NULL)
  ),
  CONSTRAINT favorites_unique_service UNIQUE (user_id, service_id),
  CONSTRAINT favorites_unique_deal UNIQUE (user_id, deal_id)
);

GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own favorites"
  ON public.favorites FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Update handle_new_user: first user = owner; everyone else = customer (no user_roles row)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  END IF;
  -- Non-first users get no role by default => treated as customer

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. RLS additions so customers can read their own data

-- customers: allow customer to view/update their linked row
DROP POLICY IF EXISTS "Customers can view their own record" ON public.customers;
CREATE POLICY "Customers can view their own record"
  ON public.customers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Customers can update their own record" ON public.customers;
CREATE POLICY "Customers can update their own record"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- bookings: customer can view bookings tied to their customer row
DROP POLICY IF EXISTS "Customers can view their own bookings" ON public.bookings;
CREATE POLICY "Customers can view their own bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (
    public.is_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = bookings.customer_id AND c.user_id = auth.uid()
    )
  );

-- invoices: customer can view their own invoices
DROP POLICY IF EXISTS "Customers can view their own invoices" ON public.invoices;
CREATE POLICY "Customers can view their own invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    public.is_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = invoices.customer_id AND c.user_id = auth.uid()
    )
  );

-- appointment_requests: customer can view/update their own submitted requests
DROP POLICY IF EXISTS "Customers can view their own requests" ON public.appointment_requests;
CREATE POLICY "Customers can view their own requests"
  ON public.appointment_requests FOR SELECT
  TO authenticated
  USING (
    public.is_staff(auth.uid())
    OR auth.uid() = user_id
  );

-- 7. Loyalty: award 10 points on booking completion
CREATE OR REPLACE FUNCTION public.award_loyalty_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cust_user_id uuid;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    SELECT user_id INTO cust_user_id FROM public.customers WHERE id = NEW.customer_id;
    IF cust_user_id IS NOT NULL THEN
      UPDATE public.profiles
        SET loyalty_points = loyalty_points + 10
        WHERE id = cust_user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS award_loyalty_on_booking_completion ON public.bookings;
CREATE TRIGGER award_loyalty_on_booking_completion
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.award_loyalty_on_completion();
