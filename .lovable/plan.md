

## Plano Completo de Evolução -- FutVôlei Arena

Este plano cobre todas as frentes identificadas no diagnóstico, organizado em etapas incrementais para execução controlada. Cada etapa entrega valor independente.

---

### Etapa 1: Experiencia Mobile do Aluno

A Home do aluno hoje mostra apenas "proximas aulas confirmadas". Vamos transformar numa experiencia rica e engajadora.

**1.1 -- Nova Home do Aluno (student/Home.tsx)**
- Card de resumo financeiro: faturas pendentes com valor total e link direto para pagar
- Barra de progresso de presenca do mes: "Voce compareceu a 8 de 12 aulas (67%)"
- Streak de presenca: "3 semanas consecutivas sem faltar"
- Proximo nivel: barra visual de progresso beginner → elementary → intermediate → advanced
- Notificacoes inline: listar as ultimas 3 da tabela `notifications` (ja existe, nunca foi consumida)

**1.2 -- Historico de Presenca (nova rota /aluno/historico)**
- Calendario mensal visual com dias marcados (verde = presente, vermelho = faltou, cinza = cancelou)
- Estatisticas: total de aulas, taxa de presenca, streak atual
- Adicionar aba "Historico" na bottom navigation do StudentLayout

**1.3 -- Pagamento Pix Integrado**
- O botao "Pagar via PIX" ja existe em StudentInvoices -- esta funcional
- Adicionar um card de alerta na Home quando existem faturas pendentes/vencidas com botao direto de pagamento
- Isso conecta a Home com o fluxo financeiro que hoje esta escondido

**1.4 -- Notificacoes**
- Criar componente de sino (bell icon) no header do StudentLayout
- Badge com contagem de nao-lidas
- Dropdown/sheet com lista de notificacoes da tabela `notifications`
- Marcar como lida ao clicar (RLS ja permite UPDATE own)

---

### Etapa 2: Unificacao Visual

**2.1 -- Sistema Tipografico Coerente**
- Definir hierarquia: Syne para titulos de secao (h1/h2), Bebas Neue para branding/logo, DM Sans para corpo
- Criar classes utilitarias no index.css: `.heading-1`, `.heading-2`, `.body-text`
- Substituir os `style={{ fontFamily: ... }}` inline por classes Tailwind customizadas

**2.2 -- Alinhar Paleta Landing ↔ App**
- O app usa verde/amarelo, a landing usa laranja/oceano -- sao dois produtos visuais
- Opcao proposta: adotar a paleta da landing (sunset/ocean) como paleta global, ja que e mais moderna
- Atualizar as CSS variables em index.css: `--primary` para tom ocean, `--accent` para sunset
- Atualizar sidebar para usar a mesma linguagem visual

**2.3 -- Componentizar Landing Page**
- Extrair cada secao do LandingPage.tsx (654 linhas) em componentes separados em `src/components/landing/`
- Substituir todos os `style={{}}` inline por classes Tailwind
- Tornar galeria, depoimentos e planos dinamicos (puxando do banco ao inves de hardcoded)

---

### Etapa 3: Modulos Faltantes

**3.1 -- Calendario Visual (Admin)**
- Nova pagina ou widget no Dashboard: visao semanal com slots de aulas e reservas na mesma timeline
- Usar grid CSS com horarios no eixo Y e dias no eixo X
- Cada bloco mostra: turma, quadra, professor, alunos confirmados
- Cores diferentes para aulas vs. reservas avulsas

**3.2 -- Pagamento de Professores (Admin)**
- Nova pagina `/admin/pagamentos-professores`
- Listar da tabela `teacher_payments` (ja existe): referencia, total de aulas, valor, status
- Acao de marcar como pago
- Adicionar no menu lateral do admin

**3.3 -- Evolucao do Aluno**
- Criar sistema de progressao baseado em presenças acumuladas
- Regras: 20 presencas → elementary, 60 → intermediate, 120 → advanced
- Trigger ou funcao no banco que atualiza `skill_level` automaticamente
- Card visual no perfil do aluno com barra de progresso ate o proximo nivel

**3.4 -- Relatorios (Admin Analytics)**
- Expandir a pagina de Analytics existente com:
  - Taxa de presenca por turma (bar chart)
  - Ocupacao de quadras (heatmap semanal)
  - Receita por professor (proporcional as aulas dadas)
  - Retencao de alunos (cohort simplificado: quantos alunos do mes X ainda estao ativos)

---

### Ordem de Execucao Sugerida

Dado o volume, recomendo implementar em 4-5 mensagens:

1. **Mensagem 1**: Etapa 1.1 + 1.3 + 1.4 (Home rica + notificacoes + alerta financeiro)
2. **Mensagem 2**: Etapa 1.2 + 3.3 (Historico de presenca + evolucao do aluno)
3. **Mensagem 3**: Etapa 2.1 + 2.2 (Unificacao tipografica + paleta)
4. **Mensagem 4**: Etapa 2.3 (Componentizar landing page)
5. **Mensagem 5**: Etapa 3.1 + 3.2 + 3.4 (Calendario, pagamento professores, relatorios)

### Alteracoes no Banco (migrações)

- Funcao para calcular e atualizar `skill_level` baseado em contagem de presencas
- Possivel trigger em `attendances` para disparar recalculo automatico
- Nenhuma tabela nova necessaria -- todas as tabelas ja existem (`notifications`, `teacher_payments`, `attendances`, etc.)

