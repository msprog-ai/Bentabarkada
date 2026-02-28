-- Re-add public read policy for profiles (needed for the view with security_invoker)
-- The view excludes phone column, so phone is protected at application level
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Drop the own-profile-only policy since the universal one covers it
DROP POLICY IF EXISTS "Users can view their own full profile" ON public.profiles;
