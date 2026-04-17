-- Update "Novo Aluno" welcome template: replace {{email}} with {{telefone}}
-- since students now log in with their phone number, not email.
UPDATE public.whatsapp_templates
SET
  body = E'Bem-vindo(a) \u00e0 Est\u00e2ncia Beach, {{nome}}! \ud83c\udfd0\ud83c\udf89\n\nSua conta foi criada. Use os dados abaixo para o seu primeiro acesso:\n\n\ud83d\udcf1 Telefone: {{telefone}}\n\ud83d\udd11 Senha tempor\u00e1ria: {{senha}}\n\n\ud83d\udc49 {{app_url}}\n\nNo primeiro acesso voc\u00ea ser\u00e1 solicitado(a) a criar uma nova senha.',
  variables = ARRAY['nome', 'telefone', 'senha', 'app_url']
WHERE category = 'welcome'
  AND name = 'Novo Aluno';

-- Add welcome_image_url to system_config (empty by default — admin configures in Settings)
INSERT INTO public.system_config (key, value, description)
VALUES (
  'whatsapp_welcome_image_url',
  '',
  'URL da imagem enviada junto com a mensagem de boas-vindas no WhatsApp. Deixe vazio para enviar apenas texto.'
)
ON CONFLICT (key) DO NOTHING;
