CREATE TABLE IF NOT EXISTS public.institutional_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS institutional_info_slug_idx
  ON public.institutional_info (slug);

CREATE INDEX IF NOT EXISTS institutional_info_category_idx
  ON public.institutional_info (category);

ALTER TABLE public.institutional_info ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'institutional_info'
      AND policyname = 'Admins can manage institutional info'
  ) THEN
    CREATE POLICY "Admins can manage institutional info"
      ON public.institutional_info
      FOR ALL
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'institutional_info'
      AND policyname = 'Authenticated can read institutional info'
  ) THEN
    CREATE POLICY "Authenticated can read institutional info"
      ON public.institutional_info
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_institutional_info_updated_at'
  ) THEN
    CREATE TRIGGER update_institutional_info_updated_at
      BEFORE UPDATE ON public.institutional_info
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

INSERT INTO public.institutional_info (category, slug, title, content)
VALUES
  (
    'reservas',
    'reservas-geral',
    'Como funcionam as reservas',
    '{
      "summary": "As reservas são solicitadas pelo WhatsApp e ficam sujeitas à confirmação da equipe.",
      "rules": [
        "Informe data, horário e quadra desejada.",
        "A reserva só é garantida após confirmação do sistema/equipe.",
        "Reservas respeitam o horário de funcionamento da arena."
      ]
    }'::jsonb
  ),
  (
    'cancelamento',
    'cancelamento-geral',
    'Política de cancelamento',
    '{
      "summary": "Cancelamentos devem ser tratados com a equipe da arena.",
      "rules": [
        "Fale com nossa equipe para solicitar cancelamento.",
        "O prazo e as condições podem variar conforme a reserva."
      ]
    }'::jsonb
  ),
  (
    'pagamentos',
    'pagamentos-geral',
    'Formas de pagamento',
    '{
      "accepted_methods": ["pix", "cartao", "dinheiro"],
      "rules": [
        "O pagamento deve ser realizado conforme orientação da arena.",
        "Algumas reservas podem exigir pagamento antecipado."
      ]
    }'::jsonb
  ),
  (
    'horarios',
    'horarios-funcionamento',
    'Horário de funcionamento',
    '{
      "summary": "Os horários variam conforme a configuração da arena.",
      "rules": [
        "Consulte sempre a disponibilidade do dia desejado.",
        "Pedidos fora do horário de funcionamento não podem ser confirmados."
      ]
    }'::jsonb
  ),
  (
    'localizacao',
    'localizacao-geral',
    'Localização da arena',
    '{
      "summary": "A localização completa pode ser enviada pela equipe ou exibida no painel.",
      "rules": [
        "Peça a localização exata se tiver dificuldade para chegar."
      ]
    }'::jsonb
  ),
  (
    'faq',
    'faq-geral',
    'Perguntas frequentes',
    '{
      "items": [
        "Como reservar uma quadra?",
        "Quais formas de pagamento são aceitas?",
        "Como funciona o cancelamento?"
      ]
    }'::jsonb
  ),
  (
    'valores',
    'valores-geral',
    'Valores das reservas',
    '{
      "summary": "Os valores podem variar por tipo de reserva e configuração da arena.",
      "rules": [
        "O valor total é informado antes da confirmação da reserva.",
        "Day use e aluguel por hora podem ter preços diferentes."
      ]
    }'::jsonb
  ),
  (
    'regras',
    'regras-gerais',
    'Regras da arena',
    '{
      "rules": [
        "Respeite o horário reservado.",
        "Siga as orientações da equipe durante a permanência na arena.",
        "Consulte previamente as regras específicas para eventos e day use."
      ]
    }'::jsonb
  ),
  (
    'aulas',
    'aulas-geral',
    'Informações sobre aulas',
    '{
      "summary": "A arena pode oferecer aulas conforme disponibilidade de turmas e professores.",
      "rules": [
        "Consulte modalidades e horários disponíveis.",
        "O processo de matrícula pode depender de plano ou vaga."
      ]
    }'::jsonb
  ),
  (
    'professores',
    'professores-geral',
    'Informações sobre professores',
    '{
      "summary": "Os professores e turmas podem variar ao longo do período.",
      "rules": [
        "Consulte a equipe para detalhes sobre cada professor."
      ]
    }'::jsonb
  ),
  (
    'planos',
    'planos-geral',
    'Informações sobre planos',
    '{
      "summary": "Os planos disponíveis dependem da configuração atual da arena.",
      "rules": [
        "Consulte valores, benefícios e vigência antes de contratar."
      ]
    }'::jsonb
  ),
  (
    'contato',
    'contato-geral',
    'Contato da arena',
    '{
      "summary": "Você pode falar com nossa equipe pelos canais oficiais da arena.",
      "rules": [
        "Se precisar de atendimento humano, peça o contato da equipe."
      ]
    }'::jsonb
  )
ON CONFLICT (slug) DO UPDATE
SET
  category = EXCLUDED.category,
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  is_active = true,
  updated_at = now();
