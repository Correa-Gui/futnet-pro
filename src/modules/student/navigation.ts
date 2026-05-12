import { CalendarDays, History, Home, Receipt, User } from "lucide-react";

export const STUDENT_NAV_ITEMS = [
  { title: "Início", url: "/aluno", icon: Home },
  { title: "Aulas", url: "/aluno/aulas", icon: CalendarDays },
  { title: "Histórico", url: "/aluno/historico", icon: History },
  { title: "Faturas", url: "/aluno/faturas", icon: Receipt },
  { title: "Perfil", url: "/aluno/perfil", icon: User },
];

export function getStudentPageTitle(pathname: string) {
  const item = STUDENT_NAV_ITEMS.find((navItem) =>
    navItem.url === "/aluno" ? pathname === "/aluno" : pathname.startsWith(navItem.url)
  );

  return item?.title || "Início";
}
