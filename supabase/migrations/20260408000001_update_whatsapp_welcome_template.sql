-- Update "Novo Aluno" template to include temporary password
UPDATE public.whatsapp_templates
SET
  body = E'Bem-vindo(a) à FutVôlei Arena, {{nome}}! 🏐🎉\n\nSua conta foi criada. Use os dados abaixo para o seu primeiro acesso:\n\n📧 E-mail: {{email}}\n🔑 Senha temporária: {{senha}}\n\n👉 {{app_url}}\n\nNo primeiro acesso você será solicitado(a) a criar uma nova senha.',
  variables = ARRAY['nome','email','senha','app_url']
WHERE category = 'welcome'
  AND name = 'Novo Aluno';

-- Add "Reset de Senha" template for when admin resets a forgotten password
INSERT INTO public.whatsapp_templates (name, category, body, variables)
VALUES (
  'Reset de Senha',
  'welcome',
  E'Olá {{nome}}! 🔑\n\nSua senha foi redefinida pelo administrador.\n\nNova senha temporária: {{senha}}\n\n👉 {{app_url}}\n\nAo entrar, você precisará criar uma nova senha.',
  ARRAY['nome','senha','app_url']
)
ON CONFLICT DO NOTHING;
