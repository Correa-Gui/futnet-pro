create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nome text not null,
  plano text not null default 'essencial',
  status text not null default 'ativo',
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table if not exists public.subscriptions (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  module text not null,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (tenant_id, module)
);

create table if not exists public.tenant_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tenants_slug on public.tenants(slug);
create index if not exists idx_tenant_members_user_id on public.tenant_members(user_id);
create index if not exists idx_subscriptions_tenant_active on public.subscriptions(tenant_id, active);

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'tenant_id', '')::uuid;
$$;

create or replace function public.set_tenant_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tenant_settings_updated_at on public.tenant_settings;
create trigger set_tenant_settings_updated_at
before update on public.tenant_settings
for each row
execute function public.set_tenant_settings_updated_at();

alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.tenant_settings enable row level security;

drop policy if exists "tenant_members_select_own_tenant" on public.tenant_members;
create policy "tenant_members_select_own_tenant"
on public.tenant_members
for select
using (
  user_id = auth.uid()
  or tenant_id = public.current_tenant_id()
);

drop policy if exists "subscriptions_select_own_tenant" on public.subscriptions;
create policy "subscriptions_select_own_tenant"
on public.subscriptions
for select
using (tenant_id = public.current_tenant_id());

drop policy if exists "tenant_settings_select_own_tenant" on public.tenant_settings;
create policy "tenant_settings_select_own_tenant"
on public.tenant_settings
for select
using (tenant_id = public.current_tenant_id());

drop policy if exists "tenants_select_own_tenant" on public.tenants;
create policy "tenants_select_own_tenant"
on public.tenants
for select
using (id = public.current_tenant_id());
