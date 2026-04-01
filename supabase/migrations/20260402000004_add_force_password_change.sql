ALTER TABLE public.profiles
  ADD COLUMN force_password_change BOOLEAN NOT NULL DEFAULT false;
