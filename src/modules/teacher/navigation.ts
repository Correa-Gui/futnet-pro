import { CalendarDays, ClipboardCheck, Home, User } from "lucide-react";

export const TEACHER_NAV_ITEMS = [
  { title: "Início", url: "/professor", icon: Home },
  { title: "Turmas", url: "/professor/turmas", icon: CalendarDays },
  { title: "Presença", url: "/professor/presenca", icon: ClipboardCheck },
  { title: "Perfil", url: "/professor/perfil", icon: User },
];
