
-- Create seller_verifications table
CREATE TABLE public.seller_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  full_name text NOT NULL,
  phone text NOT NULL,
  phone_verified boolean NOT NULL DEFAULT false,
  address text NOT NULL,
  id_type text NOT NULL,
  id_front_url text,
  id_back_url text,
  selfie_url text,
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own verification
CREATE POLICY "Users can view own verification"
  ON public.seller_verifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own verification
CREATE POLICY "Users can submit verification"
  ON public.seller_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending verification
CREATE POLICY "Users can update pending verification"
  ON public.seller_verifications FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

-- Admins can view all verifications (via edge function with service role)

-- Create storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public) VALUES ('verification-documents', 'verification-documents', false);

-- Storage policies for verification-documents
CREATE POLICY "Users can upload verification docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own verification docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'verification-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admins need service role access via edge function, no public policy needed

-- Add updated_at trigger
CREATE TRIGGER update_seller_verifications_updated_at
  BEFORE UPDATE ON public.seller_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
