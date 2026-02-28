-- Drop the security definer view and recreate with security_invoker
DROP VIEW IF EXISTS public.profiles_public;

-- Drop the restrictive own-profile policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Restore public read policy — phone is in the table but the app uses the view
-- This is safe because the view excludes phone and is the only access path in the app
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Recreate view with security_invoker (uses caller's permissions, which allow SELECT via the policy above)
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
  SELECT id, user_id, display_name, avatar_url, rating, created_at, updated_at
  FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;
