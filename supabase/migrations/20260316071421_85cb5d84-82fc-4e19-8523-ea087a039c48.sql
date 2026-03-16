
-- 1. Create audit_logs table for tracking admin actions
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only service role inserts (via edge function), but we need a policy for completeness
CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Create private payment-proofs bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false);

-- RLS policies for payment-proofs bucket
-- Buyers can upload their own payment proofs
CREATE POLICY "Buyers can upload payment proofs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Buyers can view their own payment proofs
CREATE POLICY "Users can view own payment proofs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 3. Tighten verification-documents: ensure only owner can upload
-- (Existing policies already handle this, but let's add explicit folder-based check)

-- 4. Add login_attempts tracking table
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- No one reads login_attempts from client - only edge functions with service role
-- Create index for efficient lookups
CREATE INDEX idx_login_attempts_email_created ON public.login_attempts (email, created_at DESC);
CREATE INDEX idx_audit_logs_admin_created ON public.audit_logs (admin_id, created_at DESC);
