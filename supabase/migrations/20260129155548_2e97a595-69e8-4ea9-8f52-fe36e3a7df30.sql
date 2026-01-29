-- Fix: Remove overly permissive SELECT policy and restrict to admins only
-- Invitation verification will now be done via edge function with service role

DROP POLICY IF EXISTS "Anyone can view invitation by code for registration" ON public.beta_invitations;

-- Note: The "Admins can manage all invitations" policy already handles admin access
-- No new policy needed - admins can still manage invitations, and verification 
-- is handled server-side via the verify-invitation edge function