update public.whatsapp_templates
set
  body = E'Bem-vindo(a) \\u00e0 Est\\u00e2ncia Beach, {{nome}}! \\ud83c\\udfd0\\ud83c\\udf89\n\nSua conta foi criada. Use os dados abaixo para o seu primeiro acesso:\n\n\\ud83d\\udcf1 Telefone: {{telefone}}\n\\ud83d\\udd11 Senha tempor\\u00e1ria: {{senha}}\n\n\\ud83d\\udc49 {{app_url}}\n\nNo primeiro acesso voc\\u00ea ser\\u00e1 solicitado(a) a criar uma nova senha.',
  variables = array['nome', 'telefone', 'senha', 'app_url']
where category = 'welcome'
  and name = 'Novo Aluno';

insert into public.system_config (key, value)
values ('whatsapp_welcome_image_url', '')
on conflict (key) do nothing;
