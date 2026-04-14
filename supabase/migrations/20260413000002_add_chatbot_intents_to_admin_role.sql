UPDATE public.admin_roles
SET allowed_menus = array_append(allowed_menus, 'chatbot-intents')
WHERE name = 'Administrador'
  AND NOT ('chatbot-intents' = ANY(allowed_menus));
