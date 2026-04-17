-- Fix: classes.teacher_id had ON DELETE CASCADE, causing all classes to be
-- silently deleted whenever a teacher was removed. Change to RESTRICT so the
-- operation fails with a clear error instead.
ALTER TABLE public.classes
  DROP CONSTRAINT IF EXISTS classes_teacher_id_fkey;

ALTER TABLE public.classes
  ADD CONSTRAINT classes_teacher_id_fkey
  FOREIGN KEY (teacher_id)
  REFERENCES public.teacher_profiles(id)
  ON DELETE RESTRICT;
