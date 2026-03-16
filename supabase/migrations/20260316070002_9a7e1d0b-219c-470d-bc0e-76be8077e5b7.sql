
-- Add shop_name and social_link to seller_verifications
ALTER TABLE public.seller_verifications ADD COLUMN IF NOT EXISTS shop_name text;
ALTER TABLE public.seller_verifications ADD COLUMN IF NOT EXISTS social_link text;

-- Add user_type to profiles (buyer or seller)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'buyer';

-- Add payment proof fields to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_proof_url text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending';

-- Add bank_transfer to payment_method enum
ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'bank_transfer';
