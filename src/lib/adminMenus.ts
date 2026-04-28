// Shared menu definitions for AdminLayout and Roles management.
// Keys must stay in sync with url slugs used in AdminLayout.
// "roles" and "system-users" are intentionally excluded — they are super-admin only.

export type AdminMenuItem = { key: string; title: string };
export type AdminMenuGroup = { label: string; items: AdminMenuItem[] };

export const ADMIN_MENU_GROUPS: AdminMenuGroup[] = [
  {
    label: 'Visão Geral',
    items: [
      { key: 'dashboard',   title: 'Dashboard' },
      { key: 'analytics',   title: 'Analytics' },
      { key: 'aulas-teste', title: 'Aulas Teste' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { key: 'quadras',           title: 'Quadras' },
      { key: 'turmas',            title: 'Turmas' },
      { key: 'alunos',            title: 'Alunos' },
      { key: 'professores',       title: 'Professores' },
      { key: 'usuarios-reservas', title: 'Usuários (Reservas)' },
      { key: 'agendamentos',      title: 'Agendamentos' },
      { key: 'agendamentos-lista', title: 'Lista de Agendamentos' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { key: 'planos',                 title: 'Planos' },
      { key: 'presenca',               title: 'Presença' },
      { key: 'faturas',                title: 'Faturas' },
      { key: 'pagamentos-professores', title: 'Pag. Professores' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { key: 'landing-page',  title: 'Landing Page' },
      { key: 'apresentacao',  title: 'Apresentação' },
      { key: 'api-docs',      title: 'API Docs' },
      { key: 'configuracoes',   title: 'Configurações' },
      { key: 'dias-bloqueados', title: 'Dias Bloqueados' },
    ],
  },
  {
    label: 'Chatbot',
    items: [
      { key: 'whatsapp', title: 'WhatsApp' },
      { key: 'chatbot-intents', title: 'IA' },
    ],
  },
];
