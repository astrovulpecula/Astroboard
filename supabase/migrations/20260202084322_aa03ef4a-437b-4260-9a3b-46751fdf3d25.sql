-- Add explicit SELECT policy for beta_invitations to prevent accidental exposure
-- Only admins can SELECT from beta_invitations
CREATE POLICY "Only admins can select invitations" 
  ON public.beta_invitations 
  FOR SELECT 
  USING (is_beta_admin(auth.uid()));