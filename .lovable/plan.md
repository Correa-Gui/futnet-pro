

## Sistema de Gestão para Quadra de FutVôlei — Plano de Implementação

### Visão Geral
Sistema SaaS completo com 3 perfis (Admin, Professor, Aluno), usando Lovable Cloud (Supabase) como backend, com design mobile-first para alunos e desktop-first para o admin. Cores: verde/amarelo (identidade esportiva).

---

### Fase 1 — Fundação e Auth (primeiro passo)

**1.1 Design System e Layout**
- Definir tema de cores esportivo (verde/amarelo/branco) no Tailwind
- Layout admin com sidebar (desktop) e bottom nav (mobile)
- Layout aluno/professor mobile-first com bottom navigation
- Interface toda em PT-BR

**1.2 Autenticação e Perfis**
- Login/cadastro com email/senha via Supabase Auth
- Tabela `profiles` (nome, telefone, CPF, data nascimento, skill_level, status)
- Tabela `user_roles` com RBAC (admin, teacher, student) — tabela separada por segurança
- Redirecionamento automático por role após login
- Páginas: Login, Cadastro, Recuperação de senha

**1.3 Banco de Dados — Tabelas Principais**
- `courts` (quadras)
- `plans` (planos de mensalidade)
- `classes` (turmas com dias/horários/limite)
- `teacher_profiles` (valor por aula, turmas)
- `student_profiles` (plano, nível)
- `enrollments` (matrícula aluno ↔ turma)
- `class_sessions` (instâncias de aula por data)
- `attendances` (presenças por sessão)
- `invoices` (faturas)
- `court_bookings` (aluguel avulso)
- `teacher_payments` (pagamentos de professores)
- `notifications` (log de notificações)
- `system_config` (configurações do admin)
- RLS policies em todas as tabelas

---

### Fase 2 — CRUDs do Admin

**2.1 Gestão de Quadras**
- CRUD completo (nome, localização, tipo de piso, status)
- Visualização da grade de horários semanal (calendário)

**2.2 Gestão de Planos**
- CRUD de planos (nome, aulas/semana, valor mensal, status)

**2.3 Gestão de Professores**
- CRUD de professores (dados pessoais, valor por aula, turmas)
- Admin cria a conta do professor

**2.4 Gestão de Turmas**
- CRUD com vínculo a quadra e professor
- Configuração de dias da semana, horário, limite de alunos
- Alerta visual de turma lotada
- Visualização em grade semanal (agenda)

**2.5 Gestão de Alunos**
- CRUD de alunos com todos os campos
- Matrícula em turmas (com validação de limite)
- Ficha completa com histórico
- Busca e filtros avançados
- Admin cria a conta do aluno e vincula plano

---

### Fase 3 — Confirmação de Presença

**3.1 Geração de Sessões de Aula**
- Geração automática das sessões da semana baseado nos dias/horários das turmas

**3.2 Fluxo do Aluno**
- Tela "Minhas Aulas" com próximas aulas
- Botão Confirmar/Cancelar presença
- Validação: bloquear se exceder limite do plano na semana (sugerir upgrade)
- Histórico de presenças

**3.3 Fluxo do Professor**
- Tela "Aulas de Hoje" com lista de presença em tempo real
- Marcar presença pós-aula (Presente/Ausente)
- Histórico de aulas dadas

**3.4 Visão Admin**
- Aulas do dia com status de presença
- Estatísticas de frequência por aluno e turma

---

### Fase 4 — Faturas e Financeiro

**4.1 Central de Faturas (Aluno)**
- Lista de faturas com mês, valor, vencimento, status (Pendente/Pago/Vencido)
- Detalhes da fatura

**4.2 Gestão de Faturas (Admin)**
- Lista de todas as faturas com filtros (período, aluno, status)
- Ações: marcar como paga manualmente, dar desconto, gerar fatura avulsa
- Geração de faturas em lote (todos alunos ativos do mês)
- Edge function para geração automática mensal (cron)

**4.3 Integração Mercado Pago**
- Edge function para gerar cobrança PIX (QR Code) via API Mercado Pago
- Botão "Pagar" na fatura do aluno que exibe QR Code PIX + código copia e cola
- Edge function webhook para receber confirmação de pagamento
- Atualização automática do status da fatura para "Pago"

**4.4 Dashboard Financeiro (Admin)**
- Faturamento mensal (recebido vs previsto)
- Inadimplência (valor em aberto, lista de inadimplentes)
- Custo com professores (total aulas × valor)
- Receita por fonte (mensalidade vs aluguel)
- Gráfico de evolução mensal (Recharts)

**4.5 Pagamento de Professores**
- Relatório mensal de aulas dadas
- Cálculo automático: aulas × valor por aula
- Controle de status de pagamento

---

### Fase 5 — Dashboard, Aluguel e Notificações

**5.1 Dashboard Admin Completo**
- Cards KPI: alunos ativos, professores, ocupação, faturamento, inadimplência
- Gráficos: evolução de alunos, faturamento, frequência por turma
- Atalhos: aulas de hoje, faturas vencidas, agendamentos

**5.2 Aluguel Avulso de Quadra**
- Formulário de solicitação (nome, telefone, quadra, data, horário)
- Validação de conflito com turmas e outros aluguéis
- Preço configurável por faixa de horário
- Pagamento PIX via Mercado Pago
- Fluxo de aprovação pelo admin

**5.3 Notificações Push (In-App)**
- Central de notificações no app
- Lembretes de aula e vencimento de faturas
- Notificações em tempo real usando Supabase Realtime

**5.4 Exportação e Relatórios**
- Exportação de dados para CSV (alunos, faturas, frequência)
- Relatórios filtráveis por período

---

### Observações Técnicas
- **Backend**: Lovable Cloud (Supabase) — banco PostgreSQL, auth, edge functions, realtime
- **Pagamento**: Mercado Pago via Edge Functions (não há integração nativa, precisará da API key como secret)
- **PWA**: Possível adicionar manifest.json e service worker básico, mas não será Next.js PWA
- **WhatsApp**: Pode ser adicionado futuramente via Edge Function + provedor (Z-API, Evolution API)
- **Toda a interface em PT-BR**, código em inglês

