do $$
declare
  resolved_name text;
  resolved_slug text;
  resolved_primary_color text;
  default_tenant_id uuid;
begin
  select value into resolved_name
  from public.system_config
  where key = 'company_name'
  limit 1;

  if resolved_name is null or btrim(resolved_name) = '' then
    resolved_name := 'Arena Hub';
  end if;

  select value into resolved_slug
  from public.system_config
  where key = 'tenant_slug'
  limit 1;

  if resolved_slug is null or btrim(resolved_slug) = '' then
    resolved_slug := lower(regexp_replace(resolved_name, '[^a-zA-Z0-9]+', '-', 'g'));
    resolved_slug := trim(both '-' from resolved_slug);
  end if;

  if resolved_slug is null or resolved_slug = '' then
    resolved_slug := 'default';
  end if;

  select value into resolved_primary_color
  from public.system_config
  where key = 'tenant_primary_color'
  limit 1;

  insert into public.tenants (slug, nome, plano, status)
  values (resolved_slug, resolved_name, 'essencial', 'ativo')
  on conflict (slug) do update
  set nome = excluded.nome
  returning id into default_tenant_id;

  if default_tenant_id is null then
    select id into default_tenant_id
    from public.tenants
    where slug = resolved_slug
    limit 1;
  end if;

  insert into public.tenant_settings (tenant_id, config)
  values (
    default_tenant_id,
    jsonb_strip_nulls(
      jsonb_build_object(
        'nome_exibido', resolved_name,
        'logo_url', (select value from public.system_config where key = 'company_logo_url' limit 1),
        'app_url', (select value from public.system_config where key = 'app_url' limit 1),
        'company_address', (select value from public.system_config where key = 'company_address' limit 1),
        'cor_primaria', resolved_primary_color
      )
    )
  )
  on conflict (tenant_id) do update
  set config = public.tenant_settings.config || excluded.config;

  insert into public.subscriptions (tenant_id, module, active)
  values
    (default_tenant_id, 'admin', true),
    (default_tenant_id, 'student', true),
    (default_tenant_id, 'teacher', true)
  on conflict (tenant_id, module) do update
  set active = excluded.active;

  insert into public.tenant_members (tenant_id, user_id, role)
  select default_tenant_id, ur.user_id, ur.role::text
  from public.user_roles ur
  on conflict (tenant_id, user_id) do update
  set role = excluded.role;

  update auth.users u
  set raw_app_meta_data = coalesce(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('tenant_id', default_tenant_id::text)
  where exists (
    select 1
    from public.tenant_members tm
    where tm.user_id = u.id
      and tm.tenant_id = default_tenant_id
  )
    and coalesce(u.raw_app_meta_data ->> 'tenant_id', '') = '';
end $$;
