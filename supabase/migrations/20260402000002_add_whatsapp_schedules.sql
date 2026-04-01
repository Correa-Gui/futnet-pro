CREATE TABLE public.whatsapp_schedules (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL,
  template_id   UUID        REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL,
  trigger_event TEXT        NOT NULL,
  days_before   INT         NOT NULL DEFAULT 0,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage whatsapp_schedules"
  ON public.whatsapp_schedules FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_whatsapp_schedules_updated_at
  BEFORE UPDATE ON public.whatsapp_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
