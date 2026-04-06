ALTER TABLE public.whatsapp_templates
  ADD COLUMN IF NOT EXISTS meta_template_name text,
  ADD COLUMN IF NOT EXISTS meta_template_language text DEFAULT 'pt_BR';
