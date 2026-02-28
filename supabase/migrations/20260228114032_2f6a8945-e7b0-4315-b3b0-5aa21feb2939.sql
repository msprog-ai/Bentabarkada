
-- Create bids table for listing bidding/comments
CREATE TABLE public.bids (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- Anyone can view bids on any listing
CREATE POLICY "Anyone can view bids" ON public.bids
  FOR SELECT USING (true);

-- Authenticated users can place bids
CREATE POLICY "Users can place bids" ON public.bids
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own bids
CREATE POLICY "Users can delete own bids" ON public.bids
  FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for bids
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
