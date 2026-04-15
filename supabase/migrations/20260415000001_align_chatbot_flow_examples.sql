UPDATE public.chatbot_intent_categories
SET description = CASE key
  WHEN 'day_use' THEN 'Pedidos explícitos para reservar a quadra no formato day use / dia inteiro.'
  WHEN 'availability' THEN 'Consultas de disponibilidade, próximo dia livre, horários por período e perguntas equivalentes.'
  WHEN 'confirm' THEN 'Respostas de aceite, confirmação ou autorização para seguir com a reserva.'
  WHEN 'operational' THEN 'Perguntas informativas sobre funcionamento, preços, day use e regras operacionais.'
  ELSE description
END,
updated_at = now()
WHERE key IN ('day_use', 'availability', 'confirm', 'operational');

INSERT INTO public.chatbot_intent_examples (category_id, example_text, sort_order, is_active)
SELECT c.id, v.example_text, v.sort_order, true
FROM public.chatbot_intent_categories c
JOIN (
  VALUES
    ('operational', 'como funciona o day use', 80),
    ('operational', 'o que e o day use', 90),
    ('operational', 'me explica o day use', 100),
    ('operational', 'qual o valor do day use', 110),
    ('operational', 'qual e o horario de funcionamento', 120),

    ('availability', 'qual o proximo dia disponivel', 80),
    ('availability', 'qual o proximo dia disponivel para day use', 90),
    ('availability', 'tem horario amanha a noite', 100),
    ('availability', 'sexta a noite tem vaga', 110),
    ('availability', 'e para sexta a noite', 120),
    ('availability', 'quais horarios disponiveis para amanha a noite', 130),
    ('availability', 'qual o proximo horario disponivel', 140),

    ('day_use', 'quero reservar day use na sexta', 80),
    ('day_use', 'quero day use para amanha', 90),
    ('day_use', 'quero reservar a quadra o dia inteiro na sexta', 100),

    ('confirm', 'pode reservar', 80),
    ('confirm', 'pode ser', 90),
    ('confirm', 'fecha', 100),
    ('confirm', 'confirma ai', 110),

    ('choose_court', 'quadra 1', 80),
    ('choose_court', 'quadra 2', 90),
    ('choose_court', 'quero a quadra 2', 100),
    ('choose_court', 'pode ser a quadra 1', 110),

    ('change_time', 'me mostra outro horario', 80),
    ('change_time', 'quero outro periodo', 90),

    ('cancel_booking', 'nao vou conseguir ir', 70),
    ('cancel_booking', 'preciso cancelar meu horario de hoje', 80)
) AS v(category_key, example_text, sort_order)
ON c.key = v.category_key
ON CONFLICT (category_id, example_text) DO UPDATE
SET sort_order = EXCLUDED.sort_order,
    is_active = true,
    updated_at = now();
