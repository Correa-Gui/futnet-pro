INSERT INTO public.system_config (key, value)
VALUES
  ('company_name',                   'FutVôlei Arena'),
  ('company_logo_url',               ''),
  ('court_rental_price',             '150.00'),
  ('day_use_price',                  '50.00'),
  ('reservation_deposit_percentage', '30'),
  ('app_url',                        '')
ON CONFLICT (key) DO NOTHING;
