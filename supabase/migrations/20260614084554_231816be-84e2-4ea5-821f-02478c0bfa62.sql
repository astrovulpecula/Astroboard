
-- 1. Prevent role self-escalation via trigger on beta_users
CREATE OR REPLACE FUNCTION public.prevent_beta_user_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role to do anything
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Allow admins to change anything
  IF public.is_beta_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Non-admins cannot change role, user_id, email, or invitation_id
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Not allowed to change role';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Not allowed to change user_id';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Not allowed to change email';
  END IF;
  IF NEW.invitation_id IS DISTINCT FROM OLD.invitation_id THEN
    RAISE EXCEPTION 'Not allowed to change invitation_id';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS beta_users_prevent_escalation ON public.beta_users;
CREATE TRIGGER beta_users_prevent_escalation
BEFORE UPDATE ON public.beta_users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_beta_user_privilege_escalation();

-- 2. Tighten INSERT policy: remove unauthenticated branch
DROP POLICY IF EXISTS "Users can insert their own beta profile" ON public.beta_users;
CREATE POLICY "Users can insert their own beta profile"
ON public.beta_users
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'tester'::beta_role
);

-- 3. Revoke SECURITY DEFINER function execution from anon/PUBLIC
REVOKE EXECUTE ON FUNCTION public.is_beta_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_beta_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_beta_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_beta_role(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.prevent_beta_user_privilege_escalation() FROM PUBLIC, anon;

-- 4. Restrict listing of user-images bucket (public URLs still accessible)
DROP POLICY IF EXISTS "Anyone can view images" ON storage.objects;
CREATE POLICY "Authenticated users can view images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'user-images');
