ALTER TABLE public.student_profiles
ADD COLUMN IF NOT EXISTS invoice_due_day INTEGER,
ADD COLUMN IF NOT EXISTS billing_started_at DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_profiles_invoice_due_day_check'
  ) THEN
    ALTER TABLE public.student_profiles
    ADD CONSTRAINT student_profiles_invoice_due_day_check
    CHECK (invoice_due_day IS NULL OR invoice_due_day BETWEEN 1 AND 31);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.invoice_due_date_for_month(
  p_year INTEGER,
  p_month INTEGER,
  p_due_day INTEGER
)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_first_day DATE;
  v_last_day DATE;
  v_day INTEGER;
BEGIN
  IF p_due_day IS NULL OR p_due_day < 1 OR p_due_day > 31 THEN
    RAISE EXCEPTION 'Invalid invoice due day: %', p_due_day;
  END IF;

  v_first_day := make_date(p_year, p_month, 1);
  v_last_day := (v_first_day + INTERVAL '1 month - 1 day')::DATE;
  v_day := LEAST(p_due_day, EXTRACT(DAY FROM v_last_day)::INTEGER);

  RETURN make_date(p_year, p_month, v_day);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_invoice_for_student(
  p_student_id UUID,
  p_due_date DATE,
  p_reference_month TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_price DECIMAL(10,2);
  v_reference_month TEXT;
  v_invoice_id UUID;
BEGIN
  SELECT plans.monthly_price
  INTO v_plan_price
  FROM public.student_profiles sp
  JOIN public.plans ON plans.id = sp.plan_id
  WHERE sp.id = p_student_id;

  IF v_plan_price IS NULL THEN
    RETURN NULL;
  END IF;

  v_reference_month := COALESCE(p_reference_month, to_char(p_due_date, 'YYYY-MM'));

  SELECT id
  INTO v_invoice_id
  FROM public.invoices
  WHERE student_id = p_student_id
    AND reference_month = v_reference_month
    AND status IN ('pending', 'paid', 'overdue')
  LIMIT 1;

  IF v_invoice_id IS NOT NULL THEN
    RETURN v_invoice_id;
  END IF;

  INSERT INTO public.invoices (student_id, amount, due_date, reference_month, status)
  VALUES (p_student_id, v_plan_price, p_due_date, v_reference_month, 'pending')
  RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_automatic_invoices(p_run_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_due_date DATE := p_run_date + 7;
  v_created_count INTEGER := 0;
  v_due_date DATE;
  v_invoice_id UUID;
  v_student RECORD;
BEGIN
  FOR v_student IN
    SELECT sp.id, sp.invoice_due_day
    FROM public.student_profiles sp
    JOIN public.profiles p ON p.user_id = sp.user_id
    WHERE sp.plan_id IS NOT NULL
      AND sp.billing_started_at IS NOT NULL
      AND sp.invoice_due_day IS NOT NULL
      AND p.status = 'active'
  LOOP
    v_due_date := public.invoice_due_date_for_month(
      EXTRACT(YEAR FROM v_target_due_date)::INTEGER,
      EXTRACT(MONTH FROM v_target_due_date)::INTEGER,
      v_student.invoice_due_day
    );

    IF v_due_date = v_target_due_date THEN
      v_invoice_id := public.create_invoice_for_student(v_student.id, v_due_date, to_char(v_due_date, 'YYYY-MM'));
      IF v_invoice_id IS NOT NULL THEN
        v_created_count := v_created_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_created_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.select_student_plan(p_plan_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_id uuid;
  v_plan       plans%ROWTYPE;
  v_today      date := CURRENT_DATE;
BEGIN
  SELECT id INTO v_student_id
  FROM student_profiles
  WHERE user_id = auth.uid();

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Student profile not found';
  END IF;

  PERFORM 1 FROM student_profiles WHERE id = v_student_id AND plan_id IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan already assigned';
  END IF;

  SELECT * INTO v_plan FROM plans WHERE id = p_plan_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;

  UPDATE student_profiles SET plan_id = p_plan_id WHERE id = v_student_id;

  PERFORM public.create_invoice_for_student(v_student_id, v_today, to_char(v_today, 'YYYY-MM'));
END;
$$;

UPDATE public.student_profiles sp
SET
  invoice_due_day = COALESCE(
    sp.invoice_due_day,
    paid_anchor.paid_day
  ),
  billing_started_at = COALESCE(sp.billing_started_at, paid_anchor.paid_date)
FROM (
  SELECT DISTINCT ON (i.student_id)
    i.student_id,
    (i.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE AS paid_date,
    EXTRACT(DAY FROM i.paid_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER AS paid_day
  FROM public.invoices i
  WHERE i.status = 'paid'
    AND i.paid_at IS NOT NULL
  ORDER BY i.student_id, i.paid_at ASC
) AS paid_anchor
WHERE sp.id = paid_anchor.student_id;

UPDATE public.student_profiles sp
SET invoice_due_day = COALESCE(
  sp.invoice_due_day,
  NULLIF(cfg.value, '')::INTEGER
)
FROM public.system_config cfg
WHERE cfg.key = 'invoice_due_day'
  AND sp.invoice_due_day IS NULL;
