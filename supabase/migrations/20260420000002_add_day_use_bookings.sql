CREATE TABLE IF NOT EXISTS public.day_use_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  people_count INTEGER NOT NULL DEFAULT 1,
  requester_name TEXT NOT NULL,
  requester_phone TEXT NOT NULL,
  price_per_person NUMERIC,
  status TEXT NOT NULL DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.day_use_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "day_use_public_insert" ON public.day_use_bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "day_use_authed_select" ON public.day_use_bookings
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "day_use_authed_update" ON public.day_use_bookings
  FOR UPDATE USING (auth.role() = 'authenticated');
