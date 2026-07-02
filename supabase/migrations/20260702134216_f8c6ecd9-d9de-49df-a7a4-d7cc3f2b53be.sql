
-- 1) Replace the permissive "Requests public insert" policy with validated checks
DROP POLICY IF EXISTS "Requests public insert" ON public.appointment_requests;

CREATE POLICY "Requests public insert"
ON public.appointment_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(btrim(name)) BETWEEN 2 AND 100
  AND length(btrim(phone)) BETWEEN 7 AND 20
  AND type IN ('booking'::request_type, 'quote'::request_type)
  AND (email IS NULL OR length(btrim(email)) <= 255)
  AND (notes IS NULL OR length(notes) <= 2000)
  AND (budget IS NULL OR length(budget) <= 100)
);

-- 2) Revoke EXECUTE on SECURITY DEFINER helpers from anon (RLS still works for authenticated)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
