
-- Fix permissive INSERT policy on court_bookings
-- Replace WITH CHECK (true) with a proper check
DROP POLICY IF EXISTS "Authenticated users can create bookings" ON public.court_bookings;

CREATE POLICY "Authenticated users can create bookings" ON public.court_bookings
FOR INSERT TO authenticated
WITH CHECK (
  -- Only allow creating bookings with status 'requested'
  status = 'requested'
);
