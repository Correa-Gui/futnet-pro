
-- =============================================
-- FutVôlei Arena - Schema Completo
-- =============================================

-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');
CREATE TYPE public.user_status AS ENUM ('active', 'inactive', 'suspended', 'defaulter');
CREATE TYPE public.skill_level AS ENUM ('beginner', 'elementary', 'intermediate', 'advanced');
CREATE TYPE public.class_status AS ENUM ('active', 'paused', 'closed');
CREATE TYPE public.enrollment_status AS ENUM ('active', 'cancelled', 'transferred');
CREATE TYPE public.session_status AS ENUM ('scheduled', 'completed', 'cancelled');
CREATE TYPE public.attendance_status AS ENUM ('confirmed', 'cancelled', 'not_confirmed', 'present', 'absent');
CREATE TYPE public.invoice_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE public.booking_status AS ENUM ('requested', 'confirmed', 'paid', 'cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid');
CREATE TYPE public.notification_type AS ENUM ('class_reminder', 'attendance_pending', 'invoice_created', 'invoice_due_reminder', 'invoice_paid', 'welcome', 'class_full');
CREATE TYPE public.notification_channel AS ENUM ('push', 'whatsapp', 'both');

-- Timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- 1. PROFILES (linked to auth.users)
-- =============================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf TEXT UNIQUE,
  birth_date DATE,
  avatar_url TEXT,
  status user_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. USER_ROLES (RBAC - separate table)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- =============================================
-- 3. COURTS (quadras)
-- =============================================
CREATE TABLE public.courts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  surface_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. PLANS (planos de mensalidade)
-- =============================================
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  classes_per_week INT NOT NULL,
  monthly_price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. TEACHER_PROFILES
-- =============================================
CREATE TABLE public.teacher_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  rate_per_class DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. STUDENT_PROFILES
-- =============================================
CREATE TABLE public.student_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_level skill_level NOT NULL DEFAULT 'beginner',
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. CLASSES (turmas)
-- =============================================
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  level skill_level NOT NULL DEFAULT 'beginner',
  day_of_week INT[] NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_students INT NOT NULL DEFAULT 12,
  status class_status NOT NULL DEFAULT 'active',
  court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 8. ENROLLMENTS (matrículas)
-- =============================================
CREATE TABLE public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status enrollment_status NOT NULL DEFAULT 'active',
  UNIQUE (student_id, class_id)
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 9. CLASS_SESSIONS (instâncias de aula)
-- =============================================
CREATE TABLE public.class_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status session_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (class_id, date)
);

ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 10. ATTENDANCES (presenças)
-- =============================================
CREATE TABLE public.attendances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  status attendance_status NOT NULL DEFAULT 'not_confirmed',
  confirmed_at TIMESTAMPTZ,
  UNIQUE (session_id, student_id)
);

ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 11. INVOICES (faturas)
-- =============================================
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  reference_month TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status invoice_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  payment_id TEXT,
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  discount DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 12. COURT_BOOKINGS (aluguel avulso)
-- =============================================
CREATE TABLE public.court_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL,
  requester_phone TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  status booking_status NOT NULL DEFAULT 'requested',
  payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.court_bookings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 13. TEACHER_PAYMENTS (pagamentos de professores)
-- =============================================
CREATE TABLE public.teacher_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  reference_month TEXT NOT NULL,
  total_classes INT NOT NULL DEFAULT 0,
  rate_per_class DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_payments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 14. NOTIFICATIONS
-- =============================================
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  channel notification_channel NOT NULL DEFAULT 'push',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_notifications_user_sent ON public.notifications(user_id, sent_at);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 15. SYSTEM_CONFIG
-- =============================================
CREATE TABLE public.system_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TRIGGERS for updated_at
-- =============================================
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courts_updated_at BEFORE UPDATE ON public.courts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teacher_profiles_updated_at BEFORE UPDATE ON public.teacher_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_court_bookings_updated_at BEFORE UPDATE ON public.court_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teacher_payments_updated_at BEFORE UPDATE ON public.teacher_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON public.system_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS POLICIES
-- =============================================

-- PROFILES: users see own, admin sees all
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES: only admin can manage, users can read own
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- COURTS: everyone authenticated can read, admin manages
CREATE POLICY "Authenticated users can view courts" ON public.courts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage courts" ON public.courts FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- PLANS: everyone can read active, admin manages
CREATE POLICY "Authenticated users can view plans" ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage plans" ON public.plans FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- TEACHER_PROFILES: teacher sees own, admin sees all
CREATE POLICY "Teachers can view own profile" ON public.teacher_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage teacher profiles" ON public.teacher_profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- STUDENT_PROFILES: student sees own, admin sees all
CREATE POLICY "Students can view own profile" ON public.student_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage student profiles" ON public.student_profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- CLASSES: all authenticated can read, admin manages
CREATE POLICY "Authenticated users can view classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage classes" ON public.classes FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ENROLLMENTS: student sees own, admin manages
CREATE POLICY "Students can view own enrollments" ON public.enrollments FOR SELECT USING (
  student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can manage enrollments" ON public.enrollments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- CLASS_SESSIONS: all authenticated can read, admin manages
CREATE POLICY "Authenticated users can view sessions" ON public.class_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage sessions" ON public.class_sessions FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ATTENDANCES: student sees/manages own, teacher sees class attendances, admin all
CREATE POLICY "Students can view own attendances" ON public.attendances FOR SELECT USING (
  student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Students can update own attendance" ON public.attendances FOR UPDATE USING (
  student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Teachers can view class attendances" ON public.attendances FOR SELECT USING (
  public.has_role(auth.uid(), 'teacher')
);
CREATE POLICY "Teachers can update attendances" ON public.attendances FOR UPDATE USING (
  public.has_role(auth.uid(), 'teacher')
);
CREATE POLICY "Admins can manage attendances" ON public.attendances FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- INVOICES: student sees own, admin manages
CREATE POLICY "Students can view own invoices" ON public.invoices FOR SELECT USING (
  student_id IN (SELECT id FROM public.student_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can manage invoices" ON public.invoices FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- COURT_BOOKINGS: all can read, admin manages
CREATE POLICY "Authenticated users can view bookings" ON public.court_bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create bookings" ON public.court_bookings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage bookings" ON public.court_bookings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- TEACHER_PAYMENTS: teacher sees own, admin manages
CREATE POLICY "Teachers can view own payments" ON public.teacher_payments FOR SELECT USING (
  teacher_id IN (SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can manage teacher payments" ON public.teacher_payments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- NOTIFICATIONS: users see own
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage notifications" ON public.notifications FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- SYSTEM_CONFIG: only admin
CREATE POLICY "Admins can manage system config" ON public.system_config FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can read system config" ON public.system_config FOR SELECT TO authenticated USING (true);

-- =============================================
-- TRIGGER: Auto-create profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  -- Default role is student
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  -- Create student profile
  INSERT INTO public.student_profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_classes_court_id ON public.classes(court_id);
CREATE INDEX idx_classes_teacher_id ON public.classes(teacher_id);
CREATE INDEX idx_enrollments_student_id ON public.enrollments(student_id);
CREATE INDEX idx_enrollments_class_id ON public.enrollments(class_id);
CREATE INDEX idx_class_sessions_class_id ON public.class_sessions(class_id);
CREATE INDEX idx_class_sessions_date ON public.class_sessions(date);
CREATE INDEX idx_attendances_session_id ON public.attendances(session_id);
CREATE INDEX idx_attendances_student_id ON public.attendances(student_id);
CREATE INDEX idx_invoices_student_id ON public.invoices(student_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_court_bookings_court_id ON public.court_bookings(court_id);
CREATE INDEX idx_court_bookings_date ON public.court_bookings(date);

-- =============================================
-- DEFAULT SYSTEM CONFIG VALUES
-- =============================================
INSERT INTO public.system_config (key, value) VALUES
  ('attendance_reminder_hours_before', '3'),
  ('invoice_due_day', '10'),
  ('defaulter_days_threshold', '15'),
  ('court_rental_price_regular', '80.00'),
  ('court_rental_price_premium', '120.00');
