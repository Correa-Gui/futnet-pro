
-- Landing page settings (single-row global config)
CREATE TABLE public.landing_page_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_mode text NOT NULL DEFAULT 'both',
  hero_image_url text,
  whatsapp_number text,
  instagram_url text,
  youtube_url text,
  primary_cta_text text NOT NULL DEFAULT 'Agende Sua Aula Grátis',
  primary_cta_url text NOT NULL DEFAULT '/cadastro',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_page_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read landing settings" ON public.landing_page_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage landing settings" ON public.landing_page_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Landing page section config
CREATE TABLE public.landing_page_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text UNIQUE NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  title text,
  subtitle text,
  content jsonb,
  image_url text,
  display_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_page_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read landing config" ON public.landing_page_config
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage landing config" ON public.landing_page_config
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Updated_at triggers
CREATE TRIGGER update_landing_page_settings_updated_at
  BEFORE UPDATE ON public.landing_page_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_landing_page_config_updated_at
  BEFORE UPDATE ON public.landing_page_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for landing images
INSERT INTO storage.buckets (id, name, public) VALUES ('landing-images', 'landing-images', true);

-- Storage RLS
CREATE POLICY "Public can read landing images" ON storage.objects
  FOR SELECT USING (bucket_id = 'landing-images');

CREATE POLICY "Admins can upload landing images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'landing-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update landing images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'landing-images' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete landing images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'landing-images' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Seed default settings
INSERT INTO public.landing_page_settings (business_mode, whatsapp_number, primary_cta_text, primary_cta_url)
VALUES ('both', '5511999999999', 'Agende Sua Aula Grátis', '/cadastro');

-- Seed default sections
INSERT INTO public.landing_page_config (section_key, title, subtitle, display_order, is_visible) VALUES
  ('hero', 'SUA PRIMEIRA AULA É GRÁTIS', 'A arena de futevôlei nº1 da cidade', 0, true),
  ('stats', NULL, NULL, 1, true),
  ('about', 'Mais que uma quadra. Uma comunidade.', 'Sobre nós', 2, true),
  ('gallery', 'Veja Nossa Estrutura em Ação', 'Galeria', 3, true),
  ('benefits', 'O Que Você Ganha Treinando Com a Gente', 'Benefícios', 4, true),
  ('how_it_works', 'Três Passos Para Começar', 'Como funciona', 5, true),
  ('testimonials', 'O Que Nossos Alunos Dizem', 'Depoimentos', 6, true),
  ('plans', 'Escolha o Plano Ideal Para Você', 'Planos', 7, true),
  ('faq', 'Perguntas Frequentes', 'Dúvidas', 8, true),
  ('final_cta', 'PRONTO PARA JOGAR?', 'Vem pra quadra', 9, true);
