INSERT INTO public.system_config (key, value)
VALUES
  ('whatsapp_service_base_url', ''),
  ('whatsapp_instance_name', 'SB Tech')
ON CONFLICT (key) DO NOTHING;
