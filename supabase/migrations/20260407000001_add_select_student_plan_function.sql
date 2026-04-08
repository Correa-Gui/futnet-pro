-- RPC function that lets a student select their own plan for the first time.
-- Also generates the first pending invoice for that plan.
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
  -- Resolve student_profile for the calling user
  SELECT id INTO v_student_id
  FROM student_profiles
  WHERE user_id = auth.uid();

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Student profile not found';
  END IF;

  -- Allow only first-time selection (plan_id must be null)
  PERFORM 1 FROM student_profiles WHERE id = v_student_id AND plan_id IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan already assigned';
  END IF;

  -- Validate plan exists and is active
  SELECT * INTO v_plan FROM plans WHERE id = p_plan_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;

  -- Assign plan
  UPDATE student_profiles SET plan_id = p_plan_id WHERE id = v_student_id;

  -- Generate first invoice
  INSERT INTO invoices (student_id, amount, due_date, reference_month, status)
  VALUES (
    v_student_id,
    v_plan.monthly_price,
    v_today + interval '30 days',
    to_char(v_today, 'YYYY-MM'),
    'pending'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.select_student_plan(uuid) TO authenticated;
