-- Drop existing public read policy on profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a view that excludes phone for public access
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
  SELECT id, user_id, display_name, avatar_url, rating, created_at, updated_at
  FROM public.profiles;

-- Allow users to see their own full profile (including phone)
CREATE POLICY "Users can view their own full profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Allow viewing basic profile info (no phone) for other users via the profiles table
-- This is needed for transaction partners - but we restrict to non-phone columns via the view
-- For the base table, only allow own profile access
