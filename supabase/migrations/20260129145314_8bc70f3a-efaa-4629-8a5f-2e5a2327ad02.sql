-- =============================================
-- SISTEMA DE BETA CERRADA
-- =============================================

-- 1. Enum para roles de beta
CREATE TYPE public.beta_role AS ENUM ('admin', 'tester');

-- 2. Enum para estado de invitación
CREATE TYPE public.invitation_status AS ENUM ('pending', 'accepted', 'expired');

-- 3. Enum para preferencia de modelo de pago
CREATE TYPE public.payment_preference AS ENUM ('one_time', 'subscription', 'undecided');

-- 4. Tabla de invitaciones
CREATE TABLE public.beta_invitations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    invitation_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    status invitation_status NOT NULL DEFAULT 'pending',
    role beta_role NOT NULL DEFAULT 'tester',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE
);

-- 5. Tabla de usuarios beta (perfiles)
CREATE TABLE public.beta_users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    email TEXT NOT NULL,
    role beta_role NOT NULL DEFAULT 'tester',
    gdpr_accepted BOOLEAN NOT NULL DEFAULT false,
    gdpr_accepted_at TIMESTAMP WITH TIME ZONE,
    welcome_shown BOOLEAN NOT NULL DEFAULT false,
    first_login_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    invitation_id UUID REFERENCES public.beta_invitations(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Tabla de feedback
CREATE TABLE public.beta_feedback (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.beta_users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    what_liked TEXT,
    what_to_improve TEXT,
    would_recommend BOOLEAN,
    recommend_comment TEXT,
    payment_preference payment_preference,
    payment_comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Tabla de métricas de uso (anónimas)
CREATE TABLE public.usage_metrics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.beta_users(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    page_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para mejor rendimiento
CREATE INDEX idx_beta_invitations_email ON public.beta_invitations(email);
CREATE INDEX idx_beta_invitations_code ON public.beta_invitations(invitation_code);
CREATE INDEX idx_beta_users_user_id ON public.beta_users(user_id);
CREATE INDEX idx_beta_users_email ON public.beta_users(email);
CREATE INDEX idx_usage_metrics_user_id ON public.usage_metrics(user_id);
CREATE INDEX idx_usage_metrics_created_at ON public.usage_metrics(created_at);
CREATE INDEX idx_usage_metrics_event_type ON public.usage_metrics(event_type);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Función helper para verificar rol de beta
CREATE OR REPLACE FUNCTION public.get_beta_role(p_user_id UUID)
RETURNS beta_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.beta_users WHERE user_id = p_user_id LIMIT 1
$$;

-- Función helper para verificar si es admin
CREATE OR REPLACE FUNCTION public.is_beta_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.beta_users 
    WHERE user_id = p_user_id AND role = 'admin'
  )
$$;

-- RLS para beta_invitations
ALTER TABLE public.beta_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all invitations"
ON public.beta_invitations
FOR ALL
USING (public.is_beta_admin(auth.uid()));

CREATE POLICY "Anyone can view invitation by code for registration"
ON public.beta_invitations
FOR SELECT
USING (true);

-- RLS para beta_users
ALTER TABLE public.beta_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.beta_users
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.beta_users
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all users"
ON public.beta_users
FOR SELECT
USING (public.is_beta_admin(auth.uid()));

CREATE POLICY "System can insert beta users"
ON public.beta_users
FOR INSERT
WITH CHECK (true);

-- RLS para beta_feedback
ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own feedback"
ON public.beta_feedback
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.beta_users 
    WHERE id = beta_feedback.user_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own feedback"
ON public.beta_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.beta_users 
    WHERE id = beta_feedback.user_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all feedback"
ON public.beta_feedback
FOR SELECT
USING (public.is_beta_admin(auth.uid()));

-- RLS para usage_metrics
ALTER TABLE public.usage_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert metrics"
ON public.usage_metrics
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all metrics"
ON public.usage_metrics
FOR SELECT
USING (public.is_beta_admin(auth.uid()));

-- =============================================
-- STORAGE BUCKETS
-- =============================================

-- Bucket para datos de usuario (JSON)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('user-data', 'user-data', false, 52428800);

-- Bucket para imágenes de usuario
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('user-images', 'user-images', true, 10485760);

-- Políticas de storage para user-data
CREATE POLICY "Users can upload their own data"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-data' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own data"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'user-data' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own data"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-data' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own data"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-data' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Políticas de storage para user-images
CREATE POLICY "Users can upload their own images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-images');

CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);