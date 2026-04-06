-- Create admin_roles table for configurable menu permissions
CREATE TABLE IF NOT EXISTS public.admin_roles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT,
  allowed_menus TEXT[]    NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_manage_admin_roles" ON public.admin_roles
  FOR ALL TO authenticated
  USING  (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add admin_role_id to profiles (null = super admin, unrestricted)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS admin_role_id UUID REFERENCES public.admin_roles(id);

-- Seed a default "Administrador" role with common menus
INSERT INTO public.admin_roles (name, description, allowed_menus)
VALUES (
  'Administrador',
  'Acesso completo exceto configurações avançadas de sistema',
  ARRAY[
    'dashboard', 'analytics', 'aulas-teste',
    'quadras', 'turmas', 'alunos', 'professores', 'usuarios-reservas', 'agendamentos',
    'planos', 'presenca', 'faturas', 'pagamentos-professores',
    'landing-page', 'whatsapp', 'configuracoes'
  ]
);
