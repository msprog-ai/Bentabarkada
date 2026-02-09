-- Add delivery tracking fields to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_method text CHECK (delivery_method IN ('buyer_book', 'seller_book')) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS delivery_status text CHECK (delivery_status IN ('pending', 'pickup_scheduled', 'picked_up', 'in_transit', 'delivered')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS proof_of_delivery_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rider_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rider_phone text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tracking_number text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS delivery_provider text DEFAULT NULL;

-- Update RLS policy to allow buyers to update delivery method
DROP POLICY IF EXISTS "Buyers can update delivery method" ON public.orders;
CREATE POLICY "Buyers can update delivery method"
ON public.orders
FOR UPDATE
USING (auth.uid() = buyer_id)
WITH CHECK (auth.uid() = buyer_id);

-- Create storage bucket for proof of delivery images
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for delivery proofs
CREATE POLICY "Anyone can view delivery proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'delivery-proofs');

CREATE POLICY "Authenticated users can upload delivery proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'delivery-proofs' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their uploaded proofs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'delivery-proofs' AND auth.role() = 'authenticated');