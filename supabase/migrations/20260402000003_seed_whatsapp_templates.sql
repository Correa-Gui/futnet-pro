INSERT INTO public.whatsapp_templates (name, category, body, variables) VALUES
(
  'Confirmação de Presença',
  'attendance',
  'Olá {{nome}}! 🏐 Confirmando sua presença na aula de {{turma}} amanhã, {{dia}} às {{horario}}. Quadra: {{quadra}}. Nos vemos lá! 💪',
  ARRAY['nome','turma','dia','horario','quadra']
),
(
  'Lembrete de Pagamento',
  'financial',
  'Olá {{nome}}! 💳 Sua fatura de {{mes}} no valor de {{valor}} vence em {{data_vencimento}}. Acesse o app para pagar via PIX: {{app_url}}',
  ARRAY['nome','mes','valor','data_vencimento','app_url']
),
(
  'Confirmação de Pagamento',
  'financial',
  'Olá {{nome}}! ✅ Recebemos seu pagamento de {{valor}} referente a {{mes}}. Obrigado! Qualquer dúvida, estamos à disposição.',
  ARRAY['nome','valor','mes']
),
(
  'Confirmação de Agendamento',
  'booking',
  E'Olá {{nome}}! ✅ Seu agendamento foi confirmado!\n\n📍 {{quadra}}\n📅 {{data}}\n🕐 {{horario_inicio}} às {{horario_fim}}\n\nQualquer dúvida, estamos à disposição!',
  ARRAY['nome','quadra','data','horario_inicio','horario_fim']
),
(
  'Feedback de Aula Teste',
  'trial',
  E'E aí {{nome}}, curtiu a aula? 🔥\n\nPra continuar treinando, escolha seu plano e crie sua conta no app:\n👉 {{app_url}}\n\nQualquer dúvida, é só chamar!',
  ARRAY['nome','app_url']
),
(
  'Novo Aluno',
  'welcome',
  E'Bem-vindo(a) à FutVôlei Arena, {{nome}}! 🏐🎉\n\nSua conta foi criada com sucesso. Acesse o app para ver suas aulas e faturas:\n👉 {{app_url}}\n\nQualquer dúvida, estamos aqui!',
  ARRAY['nome','app_url']
)
ON CONFLICT DO NOTHING;
