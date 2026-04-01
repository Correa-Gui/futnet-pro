ALTER TABLE public.court_bookings
  ADD COLUMN booking_type TEXT NOT NULL DEFAULT 'rental'
  CHECK (booking_type IN ('rental', 'day_use'));
