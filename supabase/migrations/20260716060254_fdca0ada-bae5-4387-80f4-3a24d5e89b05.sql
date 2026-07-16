DROP POLICY IF EXISTS "Users can update their own profile" ON public.beta_users;
CREATE POLICY "Users can update their own profile" ON public.beta_users
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);