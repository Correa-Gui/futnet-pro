
-- Allow anonymous/public users to view active courts (for public booking page)
CREATE POLICY "Public can view active courts"
ON public.courts
FOR SELECT
TO anon
USING (is_active = true);

-- Allow anonymous/public users to insert bookings (public booking form)
CREATE POLICY "Anyone can create bookings"
ON public.court_bookings
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anon can create bookings"
ON public.court_bookings
FOR INSERT
TO anon
WITH CHECK (status = 'requested'::booking_status);

-- Allow public to view class_sessions for availability checking
CREATE POLICY "Public can view sessions"
ON public.class_sessions
FOR SELECT
TO anon
USING (true);
