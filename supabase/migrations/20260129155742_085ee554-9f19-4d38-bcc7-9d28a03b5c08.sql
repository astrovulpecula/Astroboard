-- Allow authenticated users to update their own invitation status to 'accepted'
-- This is needed after signup when the user marks their invitation as accepted
CREATE POLICY "Users can accept their own invitation"
ON public.beta_invitations
FOR UPDATE
USING (
  auth.uid() IS NOT NULL 
  AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND status = 'pending'
)
WITH CHECK (
  status = 'accepted'
);