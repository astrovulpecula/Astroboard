-- Allow admins to delete feedback for reset functionality
CREATE POLICY "Admins can delete feedback"
ON public.beta_feedback
FOR DELETE
USING (is_beta_admin(auth.uid()));