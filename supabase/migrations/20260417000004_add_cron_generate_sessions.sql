-- SQL function that generates class sessions for the next N days.
-- Same logic as the generate-sessions edge function but runs directly in Postgres
-- so it can be called by pg_cron without HTTP.
CREATE OR REPLACE FUNCTION public.auto_generate_sessions(days_ahead INT DEFAULT 14)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  generated_count INT := 0;
  check_date      DATE;
  check_dow       INT;
  class_rec       RECORD;
  session_id      UUID;
  student_rec     RECORD;
BEGIN
  FOR i IN 0..(days_ahead - 1) LOOP
    check_date := CURRENT_DATE + i;
    -- PostgreSQL DOW: 0 = Sunday … 6 = Saturday
    check_dow  := EXTRACT(DOW FROM check_date)::INT;

    FOR class_rec IN
      SELECT id FROM public.classes
      WHERE status = 'active' AND check_dow = ANY(day_of_week)
    LOOP
      -- Insert only if this (class, date) pair doesn't exist yet
      WITH ins AS (
        INSERT INTO public.class_sessions (class_id, date, status)
        VALUES (class_rec.id, check_date, 'scheduled')
        ON CONFLICT (class_id, date) DO NOTHING
        RETURNING id
      )
      SELECT id INTO session_id FROM ins;

      IF session_id IS NOT NULL THEN
        -- Create attendance stubs for all currently enrolled students
        FOR student_rec IN
          SELECT student_id FROM public.enrollments
          WHERE class_id = class_rec.id AND status = 'active'
        LOOP
          INSERT INTO public.attendances (session_id, student_id, status)
          VALUES (session_id, student_rec.student_id, 'not_confirmed')
          ON CONFLICT (session_id, student_id) DO NOTHING;
        END LOOP;

        generated_count := generated_count + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN generated_count;
END;
$$;

-- Schedule daily execution at 06:00 UTC (requires pg_cron extension).
-- If pg_cron is not enabled on this project, enable it via the Supabase dashboard
-- under Database → Extensions, then run:
--   SELECT cron.schedule('auto-generate-sessions', '0 6 * * *', 'SELECT public.auto_generate_sessions(14);');
DO $$
BEGIN
  -- Remove any existing schedule with the same name first
  BEGIN
    PERFORM cron.unschedule('auto-generate-sessions');
  EXCEPTION WHEN others THEN NULL;
  END;

  PERFORM cron.schedule(
    'auto-generate-sessions',
    '0 6 * * *',
    'SELECT public.auto_generate_sessions(14);'
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'pg_cron not available — auto session generation will not run automatically. '
               'Enable pg_cron in the Supabase dashboard and re-run this migration, or call '
               'SELECT public.auto_generate_sessions(14) manually.';
END $$;
