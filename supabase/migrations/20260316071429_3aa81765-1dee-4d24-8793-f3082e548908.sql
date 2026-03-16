
-- Add a deny-all policy for login_attempts since it should only be accessed via service role
CREATE POLICY "No client access to login_attempts"
ON public.login_attempts FOR ALL TO authenticated
USING (false);
