
-- 1. Create shipping_couriers table
CREATE TABLE public.shipping_couriers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  estimated_days TEXT NOT NULL,
  base_fee NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS: anyone can read, no write for regular users
ALTER TABLE public.shipping_couriers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view shipping couriers" ON public.shipping_couriers FOR SELECT USING (true);

-- 2. Create listing_couriers junction table
CREATE TABLE public.listing_couriers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  courier_id UUID NOT NULL REFERENCES public.shipping_couriers(id) ON DELETE CASCADE,
  shipping_fee NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(listing_id, courier_id)
);

ALTER TABLE public.listing_couriers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view listing couriers" ON public.listing_couriers FOR SELECT USING (true);
CREATE POLICY "Listing owners can insert couriers" ON public.listing_couriers FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.listings WHERE id = listing_couriers.listing_id AND user_id = auth.uid()));
CREATE POLICY "Listing owners can delete couriers" ON public.listing_couriers FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.listings WHERE id = listing_couriers.listing_id AND user_id = auth.uid()));

-- 3. Add courier_id to orders
ALTER TABLE public.orders ADD COLUMN courier_id UUID REFERENCES public.shipping_couriers(id);

-- 4. Seed courier data
INSERT INTO public.shipping_couriers (name, estimated_days, base_fee) VALUES
  ('J&T Express', '3-5 days', 85),
  ('Flash Express', '2-4 days', 90),
  ('Ninja Van', '3-5 days', 85),
  ('LBC Express', '2-3 days', 100),
  ('GoGo Xpress', '3-7 days', 75);
