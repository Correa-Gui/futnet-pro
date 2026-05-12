@AGENTS.md
@README.md

## Claude Code
- Siga o `AGENTS.md` como fonte principal de instrucoes especificas deste repositorio.
- Use este `CLAUDE.md` como guia arquitetural complementar, sem substituir o escopo operacional do projeto.
- Antes de alterar qualquer arquivo, localize a menor superficie possivel de mudanca.

# Arquitetura de Produtos — Guia de Referência

> Coloque este arquivo na raiz de cada repositório de produto. Ele serve como contexto para o Claude Code, Codex e qualquer desenvolvedor que entre no projeto. Leia antes de criar qualquer tabela, componente ou serviço.

---

## Visão geral

Operamos múltiplos produtos SaaS B2B hospedados na Hostinger via Coolify. Cada produto é um repositório separado, mas todos seguem a mesma arquitetura de multi-tenancy, banco de dados e deploy. O objetivo é que um produto novo saia do zero com a estrutura correta desde o primeiro commit — sem retrabalho de migração depois.

**Stack padrão**

- Frontend: React + TypeScript + Vite + Tailwind CSS + shadcn-ui
- Backend/DB: Supabase (Auth, Postgres, Edge Functions, Storage)
- WhatsApp: Evolution API (self-hosted no servidor de prod)
- Infra: Coolify + Traefik + Let's Encrypt (servidores Hostinger KVM)
- CI/CD: GitHub Actions → webhook Coolify
- Faturamento B2B: Asaas (você cobrando seus clientes)
- Faturamento interno: Mercado Pago (feature dentro dos produtos)

---

## Regra fundamental: um produto = um repositório = um projeto Supabase

Nunca compartilhe o mesmo projeto Supabase entre produtos diferentes. Cada produto tem:

- 1 repositório GitHub
- 1 projeto Supabase Pro (produção) em sa-east-1
- 1 projeto Supabase Free (staging) em sa-east-1
- 1 serviço no Coolify de produção
- 1 serviço no Coolify de staging

Clientes do mesmo produto compartilham o mesmo projeto Supabase, isolados por `tenant_id` + RLS.

---

## Multi-tenancy

### Modelo escolhido

**Banco compartilhado com Row-Level Security (RLS).** Todos os clientes (tenants) de um produto vivem no mesmo banco Postgres, isolados pela coluna `tenant_id` presente em toda tabela de negócio e pelas policies de RLS que o Postgres aplica automaticamente.

Não usamos schemas separados por cliente. Não usamos bancos separados por cliente. Não criamos deploys separados por cliente.

Adicionar um novo cliente = inserir linha no banco. Zero deploy.

### Tabelas obrigatórias em todo produto

```sql
-- 1. Clientes (tenants)
create table public.tenants (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,      -- ex: 'academiax' → academiax.seuproduto.com.br
  nome       text not null,
  plano      text default 'essencial',  -- reflete tier comercial
  status     text default 'ativo',      -- 'ativo' | 'suspenso' | 'cancelado'
  created_at timestamptz default now()
);

-- 2. Membros (usuários vinculados a tenants)
create table public.tenant_members (
  tenant_id uuid references public.tenants(id) on delete cascade,
  user_id   uuid references auth.users(id) on delete cascade,
  role      text default 'member',      -- 'admin' | 'member' | 'viewer'
  primary key (tenant_id, user_id)
);

-- 3. Módulos ativos por tenant (feature flags + billing)
create table public.subscriptions (
  tenant_id  uuid references public.tenants(id) on delete cascade,
  module     text not null,             -- ex: 'alunos' | 'agenda' | 'faturas'
  active     boolean default true,
  expires_at timestamptz,
  primary key (tenant_id, module)
);

-- 4. Configurações visuais e comportamentais por tenant
create table public.tenant_settings (
  tenant_id uuid primary key references public.tenants(id) on delete cascade,
  config    jsonb default '{}'
  -- ex: {"cor_primaria":"#e63946","logo_url":"...","nome_exibido":"Arena X"}
);

-- 5. Faturas (você cobrando o tenant — integração Asaas)
create table public.faturas_saas (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  asaas_id    text,
  valor       numeric(10,2) not null,
  vencimento  date not null,
  status      text default 'aberta',    -- 'aberta' | 'paga' | 'atrasada'
  link_boleto text,
  created_at  timestamptz default now()
);
```

### Função helper (obrigatória)

```sql
create or replace function public.current_tenant_id()
returns uuid language sql stable as $$
  select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
$$;
```

Esta função lê o `tenant_id` do JWT do usuário logado. É a base de toda a segurança.

### Padrão para tabelas de domínio

Toda tabela de negócio segue este padrão:

```sql
create table public.<entidade> (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  -- ... campos da entidade ...
  created_at timestamptz default now()
);

-- Índice obrigatório
create index idx_<entidade>_tenant on public.<entidade>(tenant_id);

-- RLS
alter table public.<entidade> enable row level security;

create policy "tenant_isolation" on public.<entidade>
  for all using (tenant_id = public.current_tenant_id());
```

Se a entidade pertence a um módulo específico, adicione verificação na policy:

```sql
create policy "tenant_isolation" on public.<entidade>
  for all using (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.subscriptions
      where tenant_id = public.current_tenant_id()
        and module = '<nome_modulo>'
        and active = true
    )
  );
```

### Como setar tenant_id no JWT (crítico)

O `tenant_id` deve estar no `app_metadata` do usuário (não em `user_metadata` — o cliente não pode alterar `app_metadata`). Sete via Admin API quando o usuário for criado ou convidado:

```typescript
// Supabase Admin (nunca no frontend)
await supabaseAdmin.auth.admin.updateUserById(userId, {
  app_metadata: { tenant_id: tenantId }
})
```

Sem isso, a função `current_tenant_id()` retorna null e o RLS bloqueia tudo.

---

## Módulos

### Conceito

Módulos são features vendidas separadamente dentro do mesmo produto. Eles vivem no mesmo banco e no mesmo deploy — a separação é feita por dados, não por infraestrutura.

Um tenant com módulo `agenda` ativo vê e acessa a agenda. Um tenant sem o módulo não vê nem consegue acessar os dados (bloqueado no frontend e no RLS).

**Não crie repositórios separados para módulos do mesmo produto.**

Os nomes dos módulos mostrados abaixo são ilustrativos. Adapte os nomes à realidade do produto, mantendo a separação por áreas coesas e um contrato consistente por módulo.

### Estrutura de pastas

```
src/
├── core/                     ← nunca desligado, base de todos os tenants
│   ├── auth/
│   ├── layout/
│   └── tenant/
│       ├── useTenant.ts      ← lê slug do subdomínio + tenant_settings
│       └── useSubscriptions.ts ← módulos ativos do tenant logado
├── modules/
│   ├── alunos/
│   │   ├── pages/
│   │   ├── components/
│   │   └── index.ts          ← exporta { id, routes, menuItems }
│   ├── agenda/
│   │   └── index.ts
│   └── faturas/
│       └── index.ts
└── app/
    ├── router.tsx            ← monta rotas dinamicamente
    └── menu.tsx              ← monta menu dinamicamente
```

### Contrato de um módulo

Todo `index.ts` de módulo deve exportar:

```typescript
export const alunosModule = {
  id: 'alunos',
  routes: [
    { path: '/alunos', element: <AlunosPage /> },
    { path: '/alunos/:id', element: <AlunoDetailPage /> },
  ],
  menuItems: [
    { label: 'Alunos', path: '/alunos', icon: 'users' }
  ],
}
```

### Router dinâmico

```typescript
// src/app/router.tsx
import { useSubscriptions } from '@/core/tenant'
import { alunosModule } from '@/modules/alunos'
import { agendaModule } from '@/modules/agenda'

const ALL_MODULES = [alunosModule, agendaModule]

export function AppRouter() {
  const { activeModules } = useSubscriptions()

  const routes = ALL_MODULES
    .filter(m => activeModules.includes(m.id))
    .flatMap(m => m.routes)

  return <Routes>{routes.map(r => <Route key={r.path} {...r} />)}</Routes>
}
```

### Hook useTenant

```typescript
// src/core/tenant/useTenant.ts
export function useTenant() {
  const [config, setConfig] = useState(null)

  useEffect(() => {
    // Resolve tenant pelo subdomínio
    const slug = window.location.hostname.split('.')[0]

    supabase
      .from('tenant_settings')
      .select('config')
      .single()
      .then(({ data }) => {
        if (!data) return
        // Aplica personalização visual
        const c = data.config
        if (c.cor_primaria)
          document.documentElement.style.setProperty('--color-primary', c.cor_primaria)
        setConfig(c)
      })
  }, [])

  return config
}
```

### Personalização por cliente

Use estas abordagens — nesta ordem de preferência:

| Tipo de personalização | Onde fica |
|---|---|
| Cores, logo, nome exibido | `tenant_settings.config` (JSONB) |
| Módulo ativo ou inativo | tabela `subscriptions` |
| Campo extra em uma entidade | coluna nullable na tabela de domínio |
| Campos customizados livres | tabela `tenant_custom_fields` |
| Fluxo completamente diferente | avaliar produto/repositório separado |

**Nunca crie branches por cliente.** Branches são para features em desenvolvimento, não para variações de cliente.

---

## Subdomínios

Cada tenant acessa o produto via subdomínio próprio:

```
academiax.arenahub.com.br   → tenant slug: 'academiax'
academiay.arenahub.com.br   → tenant slug: 'academiay'
```

Configuração necessária (uma vez por produto):

1. **Wildcard DNS**: `*.arenahub.com.br → IP do servidor de prod`
2. **Wildcard SSL**: Let's Encrypt via DNS challenge no Traefik (Coolify configura)
3. **Uma única instância** do app serve todos os tenants — sem deploy por cliente

O slug é lido no boot do frontend:

```typescript
const slug = window.location.hostname.split('.')[0]
// 'academiax.arenahub.com.br' → 'academiax'
```

---

## Ambientes

### Dois servidores, não dois ambientes no mesmo servidor

| | Staging | Produção |
|---|---|---|
| Servidor | VPS menor (KVM 2) | VPS atual (KVM 4+) |
| Supabase | Projeto Free (org Free) | Projeto Pro (org Pro) |
| Branch monitorada | `develop` / `feature/*` | `main` |
| Acesso | Apenas equipe interna | Clientes reais |
| SSL | Opcional | Obrigatório (wildcard) |

### Variáveis de ambiente por servidor

No Coolify, cada serviço tem suas próprias env vars. Nunca compartilhe chaves entre staging e prod.

```
# Staging
VITE_SUPABASE_URL=https://<projeto-staging>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key-staging>

# Produção
VITE_SUPABASE_URL=https://<projeto-prod>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key-prod>
```

Segredos de servidor (Admin API key, Asaas key) ficam no Infisical, nunca em `.env` commitado.

---

## CI/CD

### Estratégia de branches

Usamos três tipos de branch — no mesmo repositório. Nunca crie repositórios separados para staging ou para clientes.

| Branch | Propósito | Deploy automático |
|---|---|---|
| `main` | Produção. Só recebe merge de `develop`. | Sim, após aprovação manual |
| `develop` | Staging/homologação. Recebe merges de `feature/*`. | Sim, automático |
| `feature/<nome>` | Desenvolvimento de uma funcionalidade. | Não |

**Regras:**
- Nunca fazer push direto em `main` ou `develop` — sempre via Pull Request
- `feature/*` → PR para `develop` (sem aprovação obrigatória, você mesmo pode mergear)
- `develop` → PR para `main` (exige aprovação — configurada no GitHub Environment)
- Nomenclatura: `feature/modulo-agenda`, `feature/fix-rls-faturas`, `feature/painel-cliente`

**Fluxo no dia a dia:**
```
1. git checkout -b feature/nova-funcionalidade
2. desenvolve localmente
3. abre PR → develop
4. merge → Coolify staging faz deploy automático
5. testa em staging
6. abre PR develop → main
7. GitHub pede aprovação
8. aprova → Coolify prod faz deploy
```

### Configuração de proteção no GitHub

Em Settings → Branches → Add rule:

**Branch `main`:**
- Require pull request before merging
- Require approvals: 1
- Require status checks to pass (workflow do Actions)
- Do not allow bypassing the above settings

**Branch `develop`:**
- Require pull request before merging
- Approvals: 0 (você mesmo pode mergear suas features)

**Environment `production`** (Settings → Environments):
- Required reviewers: adicione você mesmo
- É o que faz o GitHub pausar antes de rodar o deploy em prod

### Fluxo de deploy

```
feature/* → push → (sem deploy)
                ↓  PR aprovado
develop   → merge → deploy automático em staging
                ↓  testa e valida
main      → merge → aprovação manual → deploy em produção
```

### GitHub Actions — staging

```yaml
# .github/workflows/staging.yml
name: Deploy Staging
on:
  push:
    branches: [develop, 'feature/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Coolify
        run: |
          curl -X POST "${{ secrets.COOLIFY_WEBHOOK_STAGING }}" \
            -H "Authorization: Bearer ${{ secrets.COOLIFY_TOKEN_STAGING }}"
```

### GitHub Actions — produção

```yaml
# .github/workflows/production.yml
name: Deploy Produção
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production          # exige aprovação manual no GitHub
    steps:
      - name: Trigger Coolify
        run: |
          curl -X POST "${{ secrets.COOLIFY_WEBHOOK_PROD }}" \
            -H "Authorization: Bearer ${{ secrets.COOLIFY_TOKEN_PROD }}"
```

Configure o environment `production` no GitHub com revisores obrigatórios em Settings → Environments.

---

## Faturamento

### Duas camadas separadas

**Asaas** — você cobrando seus clientes (B2B, recorrente)
- Emite boleto/PIX/cartão pro tenant
- Webhook atualiza tabela `faturas_saas` via Edge Function
- Cliente visualiza no painel de faturamento dentro do produto

**Mercado Pago** — feature interna dos produtos (seus clientes cobrando os clientes deles)
- Permanece como está
- Nunca misturar com o Asaas

### Edge Function para webhook Asaas

```typescript
// supabase/functions/asaas-webhook/index.ts
Deno.serve(async (req) => {
  const payload = await req.json()

  if (payload.event === 'PAYMENT_RECEIVED') {
    await supabaseAdmin
      .from('faturas_saas')
      .update({ status: 'paga' })
      .eq('asaas_id', payload.payment.id)
  }

  return new Response('ok', { status: 200 })
})
```

### Painel do cliente (abas obrigatórias)

Todo produto deve ter uma rota `/minha-conta` ou `/faturamento` com:

- **Planos** — tiers disponíveis, plano ativo destacado
- **Contrato** — datas, valor, vencimento, dados da empresa
- **Faturas** — histórico com status, link para 2ª via

---

## Checklist para novo produto

Execute esta lista ao criar um produto novo. Com o schema e estrutura corretos desde o início, você nunca precisará migrar.

### Repositório
- [ ] Criar repositório no GitHub com estrutura `src/core` + `src/modules`
- [ ] Adicionar este `CLAUDE.md` na raiz
- [ ] Configurar `.env.example` com todas as variáveis necessárias (sem valores reais)
- [ ] Criar branch `develop` a partir de `main`
- [ ] Configurar branch protection em `main` (PR obrigatório + aprovação)
- [ ] Configurar branch protection em `develop` (PR obrigatório, sem aprovação)
- [ ] Criar environment `production` no GitHub com revisor obrigatório

### Supabase
- [ ] Criar projeto de staging na org Free (região sa-east-1)
- [ ] Criar projeto de produção na org Pro (região sa-east-1)
- [ ] Criar tabelas obrigatórias: `tenants`, `tenant_members`, `subscriptions`, `tenant_settings`, `faturas_saas`
- [ ] Criar função `current_tenant_id()`
- [ ] Habilitar RLS e criar policies em todas as tabelas de domínio
- [ ] Ativar backup automático no projeto de produção

### Coolify — staging
- [ ] Criar serviço apontando para o repositório + branch `develop`
- [ ] Configurar env vars com chaves do Supabase staging
- [ ] Configurar domínio de staging (ex: `staging.seuproduto.com.br`)

### Coolify — produção
- [ ] Criar serviço apontando para branch `main`
- [ ] Configurar env vars com chaves do Supabase produção
- [ ] Configurar wildcard DNS (`*.seuproduto.com.br`)
- [ ] Certificar que SSL wildcard está ativo no Traefik

### CI/CD
- [ ] Adicionar workflows `staging.yml` e `production.yml`
- [ ] Configurar secrets no GitHub: `COOLIFY_WEBHOOK_STAGING`, `COOLIFY_WEBHOOK_PROD`, `COOLIFY_TOKEN_STAGING`, `COOLIFY_TOKEN_PROD`
- [ ] Criar environment `production` no GitHub com aprovação obrigatória

### Primeiro tenant
- [ ] Inserir linha em `tenants` (slug, nome, plano)
- [ ] Inserir módulos ativos em `subscriptions`
- [ ] Inserir configurações em `tenant_settings`
- [ ] Criar usuário admin via Supabase e setar `app_metadata.tenant_id`
- [ ] Validar acesso via subdomínio correto

---

## Decisões de arquitetura e seus motivos

Estas decisões foram tomadas deliberadamente. Não as reverta sem entender o contexto.

**Por que Supabase e não Postgres self-hosted?**
O Supabase Cloud (org Pro, $25/mês) entrega Auth + RLS + Postgres + Storage + Edge Functions gerenciados. Self-hosting exige 5-15h/mês de operação para manter. Para a fase atual (3-50 clientes), o custo de tempo supera qualquer economia de infraestrutura.

**Por que banco compartilhado e não banco por cliente?**
Banco por cliente significa: cada migration em N bancos, backup de N bancos, conexão de N bancos, custo de N instâncias. Com RLS, você tem isolamento equivalente com complexidade operacional de 1 banco.

**Por que não Keycloak?**
O Supabase Auth resolve autenticação e o `app_metadata` resolve o tenant no JWT. Keycloak adicionaria uma dependência pesada para operar. Reavaliar quando um cliente enterprise exigir SSO via SAML/Active Directory.

**Por que repositório por produto e não monorepo geral?**
Produtos diferentes têm ciclos de deploy independentes, times potencialmente diferentes e projetos Supabase separados. Um monorepo geral criaria acoplamento desnecessário. Módulos do mesmo produto ficam no mesmo repositório.

**Por que Asaas e não Mercado Pago para B2B?**
Asaas tem API de cobranças recorrentes mais madura, webhooks confiáveis e portal do cliente incorporável. Mercado Pago permanece para a feature interna dos produtos (já integrado e funcionando).

**Por que dois servidores (staging/prod) e não dois ambientes no mesmo?**
Um erro em staging nunca deve tocar dados de produção. Servidores separados garantem isso por design — não por disciplina.

---

## Segredos e variáveis de ambiente

| Variável | Onde fica | Quem acessa |
|---|---|---|
| `VITE_SUPABASE_URL` | Coolify env vars | Frontend (público) |
| `VITE_SUPABASE_ANON_KEY` | Coolify env vars | Frontend (público) |
| `SUPABASE_SERVICE_ROLE_KEY` | Infisical → Coolify | Edge Functions / servidor |
| `ASAAS_API_KEY` | Infisical → Coolify | Edge Functions |
| `COOLIFY_WEBHOOK_*` | GitHub Secrets | GitHub Actions |

Regras:
- Nunca commitar `.env` com valores reais — apenas `.env.example`
- `SERVICE_ROLE_KEY` nunca vai pro frontend
- Chaves de produção nunca ficam em staging e vice-versa

---

## Onboarding de novo cliente

```sql
-- 1. Criar o tenant
insert into public.tenants (slug, nome, plano)
values ('novaacademia', 'Nova Academia', 'essencial')
returning id;

-- 2. Ativar módulos contratados
insert into public.subscriptions (tenant_id, module, active)
values
  ('<id>', 'alunos', true),
  ('<id>', 'faturas', true);

-- 3. Configurações visuais (opcional)
insert into public.tenant_settings (tenant_id, config)
values ('<id>', '{"cor_primaria": "#1a56db", "nome_exibido": "Nova Academia"}');
```

Depois, criar o usuário admin via Supabase Dashboard ou Admin API e setar `app_metadata.tenant_id`.

Nenhum deploy necessário. O cliente acessa via `novaacademia.seuproduto.com.br` imediatamente.

---

## Offboarding de cliente

```sql
-- Soft delete (preferível — mantém histórico)
update public.tenants set status = 'cancelado' where slug = 'novaacademia';
update public.subscriptions set active = false where tenant_id = '<id>';

-- Exportar dados antes de qualquer hard delete
-- pg_dump com filtro por tenant_id e entregar ao cliente
```

Cancelar assinatura correspondente no Asaas. Nunca fazer hard delete sem exportar os dados para o cliente primeiro.
