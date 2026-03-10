

## Apresentação Comercial com Slides na Plataforma

### Visão Geral
Criar uma página `/admin/apresentacao` com um editor de slides fullscreen que exibe as funcionalidades da plataforma FutNet Pro. Os slides serão pré-montados com conteúdo estático (textos, ícones, mockups) — não screenshots automáticos reais, pois captura de tela do próprio app exigiria ferramentas externas.

A abordagem será: slides visuais prontos com layout profissional, usando os mesmos componentes e ícones da plataforma para ilustrar cada funcionalidade.

### Estrutura dos Slides (17 slides)

1. **Capa** — Logo FutNet Pro, tagline, visual impactante
2. **Problema** — Dores da gestão manual de escolas esportivas
3. **Solução** — Visão geral da plataforma
4. **Dashboard Admin** — Métricas, gráficos, visão consolidada
5. **Gestão de Alunos** — Cadastro, turmas, perfis
6. **Turmas e Horários** — Calendário, alocação de quadras
7. **Controle de Presença** — QR code, registro digital
8. **Financeiro** — Faturas, cobranças PIX automáticas
9. **Planos e Mensalidades** — Gestão de planos flexíveis
10. **Professores** — Cadastro, pagamentos, alocação
11. **Agendamentos** — Reserva de quadras online
12. **WhatsApp** — Comunicação automatizada com templates
13. **Analytics** — Gráficos de receita, retenção, frequência
14. **Landing Page** — Editor visual para captação de alunos
15. **Portal do Aluno** — App mobile-first para alunos
16. **Portal do Professor** — Visão do professor
17. **CTA Final** — Contato, planos, próximos passos

### Implementação Técnica

**Arquitetura:**
- Componente `PresentationPage` em `src/pages/admin/Presentation.tsx`
- Slides renderizados em resolução fixa 1920x1080, escalados via `transform: scale()` para caber na tela
- Navegação por setas do teclado e botões na tela
- Modo fullscreen via Fullscreen API
- Barra lateral com thumbnails dos slides

**Componentes:**
- `SlideLayout` — wrapper que aplica background, padding, branding consistente
- `SlideContent` — cada slide como componente individual com ícones Lucide, cards e mockups estilizados
- `PresentationControls` — navegação, indicador de slide, botão fullscreen

**Rota:** Adicionar `/admin/apresentacao` no `App.tsx` dentro das rotas admin, e um item "Apresentação" no menu lateral do `AdminLayout`.

**Tecnologias usadas:** React, Framer Motion (transições entre slides), Lucide icons, Tailwind CSS. Sem dependências externas novas.

### O que NÃO será feito
- Captura automática de screenshots (requer puppeteer/servidor — fora do escopo frontend)
- Em vez disso, cada slide terá **mockups visuais** construídos com os mesmos componentes UI da plataforma, simulando as telas reais

