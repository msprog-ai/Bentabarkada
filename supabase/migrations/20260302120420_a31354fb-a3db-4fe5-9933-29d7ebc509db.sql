
-- 1. Fix delivery-proofs storage UPDATE policy (restrict to uploader)
DROP POLICY IF EXISTS "Users can update their uploaded proofs" ON storage.objects;
CREATE POLICY "Users can update their own uploaded proofs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'delivery-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 2. Recreate profiles_public view with security_invoker
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = on)
AS SELECT id, user_id, display_name, avatar_url, rating, created_at, updated_at
FROM public.profiles;

-- 3. Restrict bids visibility to authenticated users only
DROP POLICY IF EXISTS "Anyone can view bids" ON public.bids;
CREATE POLICY "Authenticated users can view bids"
ON public.bids FOR SELECT
TO authenticated
USING (true);
