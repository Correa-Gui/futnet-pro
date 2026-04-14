CREATE TABLE IF NOT EXISTS public.chatbot_intent_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chatbot_intent_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.chatbot_intent_categories(id) ON DELETE CASCADE,
  example_text text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT chatbot_intent_examples_category_example_key UNIQUE (category_id, example_text)
);

CREATE INDEX IF NOT EXISTS idx_chatbot_intent_categories_active_sort
  ON public.chatbot_intent_categories (is_active, sort_order, key);

CREATE INDEX IF NOT EXISTS idx_chatbot_intent_examples_category_active_sort
  ON public.chatbot_intent_examples (category_id, is_active, sort_order, example_text);

ALTER TABLE public.chatbot_intent_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_intent_examples ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chatbot_intent_categories'
      AND policyname = 'Authenticated users can read chatbot intent categories'
  ) THEN
    CREATE POLICY "Authenticated users can read chatbot intent categories"
      ON public.chatbot_intent_categories
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chatbot_intent_categories'
      AND policyname = 'Admins can manage chatbot intent categories'
  ) THEN
    CREATE POLICY "Admins can manage chatbot intent categories"
      ON public.chatbot_intent_categories
      FOR ALL
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chatbot_intent_examples'
      AND policyname = 'Authenticated users can read chatbot intent examples'
  ) THEN
    CREATE POLICY "Authenticated users can read chatbot intent examples"
      ON public.chatbot_intent_examples
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'chatbot_intent_examples'
      AND policyname = 'Admins can manage chatbot intent examples'
  ) THEN
    CREATE POLICY "Admins can manage chatbot intent examples"
      ON public.chatbot_intent_examples
      FOR ALL
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_chatbot_intent_categories_updated_at'
  ) THEN
    CREATE TRIGGER update_chatbot_intent_categories_updated_at
      BEFORE UPDATE ON public.chatbot_intent_categories
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_chatbot_intent_examples_updated_at'
  ) THEN
    CREATE TRIGGER update_chatbot_intent_examples_updated_at
      BEFORE UPDATE ON public.chatbot_intent_examples
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

INSERT INTO public.chatbot_intent_categories (key, title, description, sort_order, is_active)
VALUES
  ('greeting', 'Saudação', 'Mensagens de cumprimento e abertura da conversa.', 10, true),
  ('menu', 'Menu', 'Pedidos para abrir o menu ou ver opções.', 20, true),
  ('back', 'Voltar', 'Solicitações para retornar ao passo anterior.', 30, true),
  ('exit', 'Encerrar', 'Pedidos para sair ou encerrar o atendimento.', 40, true),
  ('cancel_flow', 'Cancelar fluxo', 'Pedidos para cancelar o fluxo atual.', 50, true),
  ('book', 'Agendar quadra', 'Intenções de reserva por faixa de horário.', 60, true),
  ('day_use', 'Day use', 'Intenções de reserva por dia inteiro.', 70, true),
  ('availability', 'Disponibilidade', 'Consultas de horários livres e disponibilidade pontual.', 80, true),
  ('view_bookings', 'Minhas reservas', 'Consulta das reservas futuras do cliente.', 90, true),
  ('choose_court', 'Escolher quadra', 'Seleção de uma quadra específica dentro do contexto.', 100, true),
  ('confirm', 'Confirmar', 'Respostas de confirmação ou aceite.', 110, true),
  ('deny', 'Negar', 'Respostas de recusa ou cancelamento da etapa atual.', 120, true),
  ('change_time', 'Alterar horário', 'Pedidos para ajustar horário ou intervalo.', 130, true),
  ('operational', 'Operacional', 'Perguntas operacionais ligadas ao funcionamento do atendimento.', 140, true),
  ('institutional', 'Institucional', 'Perguntas institucionais sobre a arena e seus serviços.', 150, true)
ON CONFLICT (key) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.chatbot_intent_examples (category_id, example_text, sort_order, is_active)
SELECT c.id, v.example_text, v.sort_order, true
FROM public.chatbot_intent_categories c
JOIN (
  VALUES
    ('greeting', 'oi', 10),
    ('greeting', 'olá', 20),
    ('greeting', 'bom dia', 30),
    ('menu', 'menu', 10),
    ('menu', 'quero ver as opções', 20),
    ('menu', 'me mostra o menu', 30),
    ('back', 'voltar', 10),
    ('back', 'retornar', 20),
    ('back', 'volta um passo', 30),
    ('exit', 'sair', 10),
    ('exit', 'encerrar', 20),
    ('exit', 'tchau', 30),
    ('cancel_flow', 'cancelar', 10),
    ('cancel_flow', 'cancela o fluxo', 20),
    ('cancel_flow', 'para por aqui', 30),
    ('book', 'quero reservar amanhã das 19 às 21', 10),
    ('book', 'agendar quadra', 20),
    ('book', 'quero fazer uma reserva', 30),
    ('day_use', 'quero day use', 10),
    ('day_use', 'quero reservar o dia inteiro', 20),
    ('day_use', 'quero a quadra o dia todo', 30),
    ('availability', 'tem horário na segunda às 16', 10),
    ('availability', 'quais horários tem sábado', 20),
    ('availability', 'quero ver horários de terça', 30),
    ('view_bookings', 'minhas reservas', 10),
    ('view_bookings', 'ver minhas reservas', 20),
    ('view_bookings', 'quais são minhas reservas futuras', 30),
    ('choose_court', 'quadra 2', 10),
    ('choose_court', 'prefiro a quadra 1', 20),
    ('choose_court', 'pode ser a quadra dois', 30),
    ('confirm', 'sim', 10),
    ('confirm', 'pode confirmar', 20),
    ('confirm', 'confirmo', 30),
    ('deny', 'não', 10),
    ('deny', 'não quero', 20),
    ('deny', 'trocar horário', 30),
    ('change_time', 'quero outro horário', 10),
    ('change_time', 'mudar a hora', 20),
    ('change_time', 'trocar para 20h', 30),
    ('operational', 'como funciona a reserva', 10),
    ('operational', 'horário de funcionamento', 20),
    ('operational', 'qual o valor da quadra', 30),
    ('institutional', 'quem são os professores', 10),
    ('institutional', 'quais formas de pagamento vocês aceitam', 20),
    ('institutional', 'onde fica a arena', 30)
) AS v(category_key, example_text, sort_order)
ON c.key = v.category_key
ON CONFLICT (category_id, example_text) DO UPDATE
SET
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();
