
-- Trial status enum
CREATE TYPE public.trial_status AS ENUM ('pending', 'approved', 'rejected', 'completed', 'no_show');

-- Trial requests table
CREATE TABLE public.trial_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  preferred_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  preferred_date DATE,
  status trial_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trial_requests ENABLE ROW LEVEL SECURITY;

-- Anon can create trial requests
CREATE POLICY "Anyone can create trial requests"
ON public.trial_requests FOR INSERT TO anon
WITH CHECK (status = 'pending'::trial_status);

-- Authenticated can also create
CREATE POLICY "Authenticated can create trial requests"
ON public.trial_requests FOR INSERT TO authenticated
WITH CHECK (status = 'pending'::trial_status);

-- Anon can read trial requests (for confirmation screen)
CREATE POLICY "Anon can read trial requests"
ON public.trial_requests FOR SELECT TO anon USING (true);

-- Admins can manage all trial requests
CREATE POLICY "Admins can manage trial requests"
ON public.trial_requests FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_trial_requests_updated_at
  BEFORE UPDATE ON public.trial_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_trial_requests_status ON public.trial_requests(status);
CREATE INDEX idx_trial_requests_created_at ON public.trial_requests(created_at DESC);

-- Anon policies for classes, plans, enrollments (needed for landing page without login)
CREATE POLICY "Public can view active classes"
ON public.classes FOR SELECT TO anon
USING (status = 'active'::class_status);

CREATE POLICY "Public can view active plans"
ON public.plans FOR SELECT TO anon
USING (is_active = true);

CREATE POLICY "Public can count enrollments"
ON public.enrollments FOR SELECT TO anon
USING (status = 'active'::enrollment_status);

-- Anon needs to read courts for class info
CREATE POLICY "Anon can view active courts"
ON public.courts FOR SELECT TO anon
USING (is_active = true);

-- Anon needs to read teacher profiles for class info
CREATE POLICY "Anon can view teacher profiles"
ON public.teacher_profiles FOR SELECT TO anon
USING (true);

-- Anon needs to read profiles for teacher names
CREATE POLICY "Anon can view profiles"
ON public.profiles FOR SELECT TO anon
USING (true);
