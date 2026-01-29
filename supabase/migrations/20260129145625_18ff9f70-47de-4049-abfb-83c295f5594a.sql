-- Mejorar políticas de seguridad para evitar WITH CHECK (true)

-- 1. Eliminar política permisiva de beta_users
DROP POLICY IF EXISTS "System can insert beta users" ON public.beta_users;

-- Crear política más restrictiva: solo se puede insertar si el user_id coincide con auth.uid()
-- o si es una inserción durante el registro (sin auth aún)
CREATE POLICY "Users can insert their own beta profile"
ON public.beta_users
FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR
  -- Permitir inserción durante registro cuando aún no hay auth
  (auth.uid() IS NULL AND EXISTS (
    SELECT 1 FROM public.beta_invitations 
    WHERE email = beta_users.email 
    AND status = 'pending'
  ))
);

-- 2. Eliminar política permisiva de usage_metrics
DROP POLICY IF EXISTS "System can insert metrics" ON public.usage_metrics;

-- Crear política más restrictiva: solo usuarios autenticados pueden insertar métricas
-- y solo para su propio user_id o anónimas (user_id NULL)
CREATE POLICY "Authenticated users can insert their own metrics"
ON public.usage_metrics
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    user_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.beta_users 
      WHERE id = usage_metrics.user_id AND user_id = auth.uid()
    )
  )
);