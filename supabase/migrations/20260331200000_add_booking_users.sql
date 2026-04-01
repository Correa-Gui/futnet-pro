-- =============================================
-- booking_users: usuários avulsos que reservam quadras via chatbot
-- =============================================

CREATE TABLE public.booking_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX booking_users_phone_idx ON public.booking_users (phone);

ALTER TABLE public.booking_users ENABLE ROW LEVEL SECURITY;

-- Admin pode gerenciar tudo
CREATE POLICY "Admins can manage booking_users"
  ON public.booking_users FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Usuários autenticados (admin panel) podem ler
CREATE POLICY "Authenticated can read booking_users"
  ON public.booking_users FOR SELECT TO authenticated
  USING (true);

-- Trigger de updated_at
CREATE TRIGGER update_booking_users_updated_at
  BEFORE UPDATE ON public.booking_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Template padrão de confirmação de reserva via WhatsApp
-- =============================================

INSERT INTO public.system_config (key, value)
VALUES (
  'booking_confirmation_template',
  'Olá *{nome}*! ✅ Sua reserva foi confirmada!

📍 *{quadra}*
📅 *{data}*
🕐 *{horario_inicio}* às *{horario_fim}*

Qualquer dúvida, estamos à disposição!'
)
ON CONFLICT (key) DO NOTHING;
