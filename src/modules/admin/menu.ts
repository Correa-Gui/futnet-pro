import type { ElementType } from "react";
import {
  BarChart3,
  BookOpen,
  Bot,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Monitor,
  Receipt,
  Settings,
  ShieldCheck,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";

export type AdminMenuItem = { key: string; title: string };
export type AdminMenuGroup = { label: string; items: AdminMenuItem[] };

export type FullAdminMenuItem = AdminMenuItem & {
  url: string;
  icon: ElementType;
};

export type FullAdminMenuGroup = {
  label: string;
  items: FullAdminMenuItem[];
};

export const ADMIN_MENU_GROUPS: AdminMenuGroup[] = [
  {
    label: "Visão Geral",
    items: [
      { key: "dashboard", title: "Dashboard" },
      { key: "analytics", title: "Analytics" },
      { key: "aulas-teste", title: "Aulas Teste" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { key: "quadras", title: "Quadras" },
      { key: "turmas", title: "Turmas" },
      { key: "alunos", title: "Alunos" },
      { key: "professores", title: "Professores" },
      { key: "usuarios-reservas", title: "Usuários (Reservas)" },
      { key: "agendamentos", title: "Agendamentos" },
      { key: "agendamentos-lista", title: "Lista de Agendamentos" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { key: "planos", title: "Planos" },
      { key: "presenca", title: "Presença" },
      { key: "faturas", title: "Faturas" },
      { key: "pagamentos-professores", title: "Pag. Professores" },
      { key: "relatorios", title: "Relatórios" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { key: "landing-page", title: "Landing Page" },
      { key: "apresentacao", title: "Apresentação" },
      { key: "api-docs", title: "API Docs" },
      { key: "configuracoes", title: "Configurações" },
      { key: "dias-bloqueados", title: "Dias Bloqueados" },
    ],
  },
  {
    label: "Chatbot",
    items: [
      { key: "whatsapp", title: "WhatsApp" },
      { key: "chatbot-intents", title: "IA" },
    ],
  },
];

const iconMap: Record<string, ElementType> = {
  dashboard: LayoutDashboard,
  analytics: BarChart3,
  "aulas-teste": CalendarCheck,
  quadras: MapPin,
  turmas: GraduationCap,
  alunos: Users,
  professores: UserCheck,
  "usuarios-reservas": Users,
  agendamentos: CalendarDays,
  "agendamentos-lista": CalendarDays,
  planos: CreditCard,
  presenca: ClipboardCheck,
  faturas: Receipt,
  "pagamentos-professores": Receipt,
  relatorios: FileText,
  "landing-page": Settings,
  "chatbot-intents": Bot,
  whatsapp: MessageCircle,
  apresentacao: Monitor,
  "api-docs": BookOpen,
  configuracoes: Settings,
  "dias-bloqueados": Settings,
  roles: ShieldCheck,
  "system-users": UserCog,
};

const urlMap: Record<string, string> = {
  dashboard: "/admin",
  analytics: "/admin/analytics",
  "aulas-teste": "/admin/aulas-teste",
  quadras: "/admin/quadras",
  turmas: "/admin/turmas",
  alunos: "/admin/alunos",
  professores: "/admin/professores",
  "usuarios-reservas": "/admin/usuarios",
  agendamentos: "/admin/agendamentos",
  "agendamentos-lista": "/admin/agendamentos-lista",
  planos: "/admin/planos",
  presenca: "/admin/presenca",
  faturas: "/admin/faturas",
  "pagamentos-professores": "/admin/pagamentos-professores",
  relatorios: "/admin/relatorios",
  "landing-page": "/admin/landing-page",
  "chatbot-intents": "/admin/chatbot-intents",
  whatsapp: "/admin/whatsapp",
  apresentacao: "/admin/apresentacao",
  "api-docs": "/admin/api-docs",
  configuracoes: "/admin/configuracoes",
  "dias-bloqueados": "/admin/dias-bloqueados",
  roles: "/admin/roles",
  "system-users": "/admin/system-users",
};

const SUPER_ADMIN_ITEMS: FullAdminMenuItem[] = [
  { key: "roles", title: "Permissões", url: "/admin/roles", icon: ShieldCheck },
  { key: "system-users", title: "Usuários do Sistema", url: "/admin/system-users", icon: UserCog },
];

const buildFullMenuItem = (item: AdminMenuItem): FullAdminMenuItem => ({
  ...item,
  url: urlMap[item.key] || `/admin/${item.key}`,
  icon: iconMap[item.key] || Settings,
});

export function getAdminMenuGroups(isSuperAdmin: boolean): FullAdminMenuGroup[] {
  return ADMIN_MENU_GROUPS.map((group) => {
    const items = group.items.map(buildFullMenuItem);

    if (group.label === "Sistema" && isSuperAdmin) {
      return { ...group, items: [...items, ...SUPER_ADMIN_ITEMS] };
    }

    return { ...group, items };
  });
}

export function getAdminPageTitle(pathname: string) {
  const allItems = getAdminMenuGroups(true).flatMap((group) => group.items);
  const item = allItems.find((menuItem) =>
    menuItem.url === "/admin" ? pathname === "/admin" : pathname.startsWith(menuItem.url)
  );

  return item?.title ?? "Dashboard";
}
