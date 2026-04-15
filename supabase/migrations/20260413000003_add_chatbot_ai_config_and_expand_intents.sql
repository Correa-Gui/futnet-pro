INSERT INTO public.system_config (key, value)
VALUES
  ('chatbot_openai_intent_prompt_id', ''),
  ('chatbot_openai_api_key_reference', '')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.chatbot_intent_categories (key, title, description, sort_order, is_active)
VALUES
  ('cancel_booking', 'Cancelar reserva', 'Pedidos para cancelar reservas futuras em linguagem natural.', 135, true)
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
    ('greeting', 'e ai', 40),
    ('greeting', 'fala comigo', 50),
    ('greeting', 'opa', 60),
    ('greeting', 'oi tudo certo', 70),
    ('menu', 'quero voltar pro inicio', 40),
    ('menu', 'me mostra o inicio', 50),
    ('menu', 'abre o menu principal', 60),
    ('menu', 'quais opcoes voce tem', 70),
    ('back', 'quero voltar', 40),
    ('back', 'volta um pouco', 50),
    ('back', 'retorna ai', 60),
    ('back', 'desfazer esse passo', 70),
    ('exit', 'encerrar atendimento', 40),
    ('exit', 'pode finalizar', 50),
    ('exit', 'ate mais', 60),
    ('exit', 'vou sair agora', 70),
    ('cancel_flow', 'cancelar conversa', 40),
    ('cancel_flow', 'quero parar por aqui', 50),
    ('cancel_flow', 'cancela esse atendimento', 60),
    ('cancel_flow', 'desconsidera esse fluxo', 70),
    ('book', 'quero agendar uma quadra', 40),
    ('book', 'reservar pra amanha', 50),
    ('book', 'marcar um horario na sexta', 60),
    ('book', 'preciso de uma quadra hoje a noite', 70),
    ('day_use', 'quero um day use no domingo', 40),
    ('day_use', 'reservar a quadra o dia inteiro', 50),
    ('day_use', 'quero ficar com a quadra o sabado todo', 60),
    ('day_use', 'day use pra mim no feriado', 70),
    ('availability', 'tem disponibilidade amanha', 40),
    ('availability', 'tem quadra livre hoje a noite', 50),
    ('availability', 'queria saber os horarios de quarta', 60),
    ('availability', 'domingo das 16 as 18 tem vaga', 70),
    ('view_bookings', 'o que eu tenho agendado', 40),
    ('view_bookings', 'me mostra meus proximos horarios', 50),
    ('view_bookings', 'tenho reserva futura', 60),
    ('view_bookings', 'consulta minhas reservas', 70),
    ('choose_court', 'fica com a quadra 1', 40),
    ('choose_court', 'pode ser quadra dois', 50),
    ('choose_court', 'quero a segunda opcao', 60),
    ('choose_court', 'prefiro a 1', 70),
    ('confirm', 'pode fechar', 40),
    ('confirm', 'fechado', 50),
    ('confirm', 'isso mesmo', 60),
    ('confirm', 'confirmado', 70),
    ('deny', 'nao quero mais', 40),
    ('deny', 'deixa pra la', 50),
    ('deny', 'melhor nao', 60),
    ('deny', 'assim nao', 70),
    ('change_time', 'quero mudar esse horario', 40),
    ('change_time', 'tem como trocar o horario', 50),
    ('change_time', 'quero outro periodo', 60),
    ('change_time', 'muda para mais tarde', 70),
    ('operational', 'qual e o nome da arena', 40),
    ('operational', 'quanto custa o day use', 50),
    ('operational', 'qual horario voces abrem', 60),
    ('operational', 'qual o valor por hora', 70),
    ('cancel_booking', 'cancelar minha reserva', 10),
    ('cancel_booking', 'quero cancelar meu agendamento', 20),
    ('cancel_booking', 'nao vou mais hoje', 30),
    ('cancel_booking', 'cancelar minha quadra', 40),
    ('cancel_booking', 'preciso cancelar a reserva', 50),
    ('cancel_booking', 'desmarcar meu horario', 60)
) AS v(category_key, example_text, sort_order)
ON c.key = v.category_key
ON CONFLICT (category_id, example_text) DO UPDATE
SET
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();
