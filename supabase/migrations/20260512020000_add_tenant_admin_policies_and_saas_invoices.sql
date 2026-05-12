create table if not exists public.faturas_saas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  asaas_id text,
  valor numeric(10,2) not null,
  vencimento date not null,
  status text not null default 'aberta',
  link_boleto text,
  created_at timestamptz not null default now()
);

create index if not exists idx_faturas_saas_tenant_status
  on public.faturas_saas(tenant_id, status, vencimento);

alter table public.faturas_saas enable row level security;

drop policy if exists "public_active_tenants_read" on public.tenants;
create policy "public_active_tenants_read"
on public.tenants
for select
to anon, authenticated
using (status = 'ativo');

drop policy if exists "public_active_tenant_settings_read" on public.tenant_settings;
create policy "public_active_tenant_settings_read"
on public.tenant_settings
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tenants t
    where t.id = tenant_settings.tenant_id
      and t.status = 'ativo'
  )
);

drop policy if exists "public_active_subscriptions_read" on public.subscriptions;
create policy "public_active_subscriptions_read"
on public.subscriptions
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tenants t
    where t.id = subscriptions.tenant_id
      and t.status = 'ativo'
  )
);

drop policy if exists "admins_manage_tenants" on public.tenants;
create policy "admins_manage_tenants"
on public.tenants
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins_manage_tenant_members" on public.tenant_members;
create policy "admins_manage_tenant_members"
on public.tenant_members
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins_manage_subscriptions" on public.subscriptions;
create policy "admins_manage_subscriptions"
on public.subscriptions
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins_manage_tenant_settings" on public.tenant_settings;
create policy "admins_manage_tenant_settings"
on public.tenant_settings
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "faturas_saas_select_own_tenant" on public.faturas_saas;
create policy "faturas_saas_select_own_tenant"
on public.faturas_saas
for select
to authenticated
using (tenant_id = public.current_tenant_id());

drop policy if exists "admins_manage_faturas_saas" on public.faturas_saas;
create policy "admins_manage_faturas_saas"
on public.faturas_saas
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));
