
CREATE TABLE public.seller_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (order_id, reviewer_id)
);

ALTER TABLE public.seller_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews" ON public.seller_reviews FOR SELECT USING (true);
CREATE POLICY "Buyers can create reviews for their orders" ON public.seller_reviews FOR INSERT WITH CHECK (
  auth.uid() = reviewer_id AND EXISTS (
    SELECT 1 FROM orders WHERE orders.id = seller_reviews.order_id AND orders.buyer_id = auth.uid() AND orders.status = 'delivered'
  )
);
CREATE POLICY "Users can update own reviews" ON public.seller_reviews FOR UPDATE USING (auth.uid() = reviewer_id);
CREATE POLICY "Users can delete own reviews" ON public.seller_reviews FOR DELETE USING (auth.uid() = reviewer_id);

-- Function to recalculate seller average rating
CREATE OR REPLACE FUNCTION public.update_seller_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET rating = (
    SELECT COALESCE(AVG(rating), 0)
    FROM public.seller_reviews
    WHERE seller_id = COALESCE(NEW.seller_id, OLD.seller_id)
  )
  WHERE user_id = COALESCE(NEW.seller_id, OLD.seller_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_seller_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.seller_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_seller_rating();

-- Set all existing profiles to 0 rating (no reviews yet)
UPDATE public.profiles SET rating = 0;
-- Change default rating to 0
ALTER TABLE public.profiles ALTER COLUMN rating SET DEFAULT 0;
