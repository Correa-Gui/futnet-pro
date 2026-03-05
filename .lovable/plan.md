

# Redesign UI/UX - FutVôlei Arena

## Problema atual
O menu lateral do admin tem 10 itens soltos, sem agrupamento, o que dificulta a navegação. A tela de login e as Home pages de aluno/professor são genéricas e sem personalidade visual. O sistema inteiro carece de identidade visual marcante para uma arena esportiva.

## Plano de implementação

### 1. Reorganizar sidebar admin por grupos temáticos

Agrupar os 10 itens em 3 seções com `SidebarGroup` + `SidebarGroupLabel`:

```text
📋 GESTÃO
  ├─ Dashboard
  ├─ Quadras
  └─ Turmas

👥 PESSOAS
  ├─ Alunos
  └─ Professores

💰 FINANCEIRO
  ├─ Planos
  ├─ Faturas
  └─ Presença

⚙️ SISTEMA
  ├─ Agendamentos
  └─ Configurações
```

Cada grupo terá ícone e label, com separadores visuais. Itens colapsáveis por grupo.

### 2. Melhorar visual da sidebar

- Adicionar gradiente sutil no header da sidebar (verde escuro para dar identidade esportiva)
- Hover states mais evidentes com transição suave
- Ícone ativo com fundo colorido (pill highlight) em vez de apenas texto bold
- Badge de notificação nos itens relevantes (ex: faturas vencidas)

### 3. Redesign da tela de Login

- Layout split: lado esquerdo com branding (gradiente verde/amarelo, logo grande, tagline motivacional) e lado direito com o formulário
- Em mobile: branding no topo compacto + formulário abaixo
- Adicionar efeito visual sutil (padrão de rede de vôlei ou ondas de areia como background SVG)

### 4. Melhorar Dashboard admin

- KPI cards com ícones maiores e coloridos, com indicador de tendência
- Adicionar animação de entrada nos cards (fade-in staggered)
- Seção "Aulas de Hoje" mais visual com timeline vertical

### 5. Melhorar Home do Aluno e Professor

- **Aluno**: Mostrar próximas aulas pendentes de confirmação, resumo do plano, card motivacional com saudação por horário do dia
- **Professor**: Mostrar aulas do dia com contagem de confirmados, próximas turmas, resumo semanal

### 6. Polimento global

- Remover `src/App.css` (resquício do template Vite, aplica estilos indesejados como `max-width: 1280px` e `padding: 2rem` no `#root`)
- Adicionar fonte Bebas Neue via Google Fonts no `index.html`
- Micro-interações: hover scale nos cards, transições suaves nos botões

## Arquivos a modificar

| Arquivo | Mudança |
|---|---|
| `src/App.css` | Remover (limpar estilos conflitantes) |
| `index.html` | Adicionar Google Font Bebas Neue |
| `src/layouts/AdminLayout.tsx` | Sidebar agrupada + visual melhorado |
| `src/pages/Login.tsx` | Layout split com branding |
| `src/pages/admin/Dashboard.tsx` | KPI cards e seções melhoradas |
| `src/pages/student/Home.tsx` | Home funcional com dados reais |
| `src/pages/teacher/Home.tsx` | Home funcional com dados reais |
| `src/index.css` | Ajustes de variáveis e utilitários |

## Escopo

Foco em impacto visual imediato sem alterar lógica de negócio ou banco de dados. Nenhuma migração necessária.

