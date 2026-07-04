-- 1) beta_users: revoke column-level UPDATE on sensitive columns from authenticated
REVOKE UPDATE (role, email, invitation_id, user_id) ON public.beta_users FROM authenticated;

-- 2) usage_metrics: restrict insert policy to the authenticated role only
DROP POLICY IF EXISTS "Authenticated users can insert their own metrics" ON public.usage_metrics;

CREATE POLICY "Authenticated users can insert their own metrics"
ON public.usage_metrics
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.beta_users
    WHERE beta_users.id = usage_metrics.user_id
      AND beta_users.user_id = auth.uid()
  )
);