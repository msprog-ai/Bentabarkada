
-- Add quantity to listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1;

-- Add approval_status to listings (admin must approve before visible)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';

-- Add is_approved to profiles (admin must approve new users)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;

-- Add pickup_photo_url to orders (evidence of rider pickup)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS pickup_photo_url text;

-- Add rider_tracking_link to orders (link to rider app tracking)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rider_tracking_link text;

-- Add delivery_checkpoint to orders (predefined checkpoint status)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_checkpoint text DEFAULT 'preparing';
