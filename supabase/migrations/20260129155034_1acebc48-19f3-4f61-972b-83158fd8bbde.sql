-- Fix 1: Revoke public execution on SECURITY DEFINER functions
-- These functions are only needed internally by RLS policies
REVOKE EXECUTE ON FUNCTION public.get_beta_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_beta_admin(uuid) FROM PUBLIC, anon, authenticated;

-- Fix 2: Update usage_metrics policy to require user_id (no anonymous tracking without consent)
DROP POLICY IF EXISTS "Authenticated users can insert their own metrics" ON public.usage_metrics;

CREATE POLICY "Authenticated users can insert their own metrics"
ON public.usage_metrics
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND user_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM beta_users
    WHERE beta_users.id = usage_metrics.user_id 
    AND beta_users.user_id = auth.uid()
  )
);