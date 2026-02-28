-- Remove the overly permissive public read policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Only allow users to see their own profile (with phone) from the base table
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Grant SELECT on the view to anon and authenticated roles
-- The view excludes phone and uses security_invoker=on, 
-- but since it reads from profiles which now requires auth.uid() = user_id,
-- we need a SECURITY DEFINER function or a separate approach.
-- Instead, let's recreate the view WITHOUT security_invoker so it runs as definer
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public AS
  SELECT id, user_id, display_name, avatar_url, rating, created_at, updated_at
  FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_public TO anon, authenticated;
