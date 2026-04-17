-- SECURITY DEFINER RPC so that students (who cannot update their own profile
-- via RLS) can mark their first-login password change as completed.
CREATE OR REPLACE FUNCTION public.mark_password_changed()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles SET force_password_change = false WHERE user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.mark_password_changed() TO authenticated;
