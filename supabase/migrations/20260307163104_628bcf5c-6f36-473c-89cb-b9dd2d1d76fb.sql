
CREATE OR REPLACE FUNCTION public.update_skill_level_on_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _student_id uuid;
  _total_present integer;
  _new_level skill_level;
BEGIN
  _student_id := COALESCE(NEW.student_id, OLD.student_id);
  
  SELECT COUNT(*) INTO _total_present
  FROM public.attendances
  WHERE student_id = _student_id AND status = 'present';
  
  IF _total_present >= 120 THEN
    _new_level := 'advanced';
  ELSIF _total_present >= 60 THEN
    _new_level := 'intermediate';
  ELSIF _total_present >= 20 THEN
    _new_level := 'elementary';
  ELSE
    _new_level := 'beginner';
  END IF;
  
  UPDATE public.student_profiles
  SET skill_level = _new_level, updated_at = now()
  WHERE id = _student_id AND skill_level != _new_level;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_skill_level
AFTER INSERT OR UPDATE OF status ON public.attendances
FOR EACH ROW
EXECUTE FUNCTION public.update_skill_level_on_attendance();
