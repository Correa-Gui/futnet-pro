import { Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, MapPin, Users, GraduationCap, UserCheck,
  Receipt, CalendarDays, Settings, CreditCard, LogOut, ClipboardCheck, BarChart3
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar';

const menuGroups = [
  {
    label: 'Gestão',
    items: [
      { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
      { title: 'Analytics', url: '/admin/analytics', icon: BarChart3 },
      { title: 'Quadras', url: '/admin/quadras', icon: MapPin },
      { title: 'Turmas', url: '/admin/turmas', icon: GraduationCap },
    ],
  },
  {
    label: 'Pessoas',
    items: [
      { title: 'Alunos', url: '/admin/alunos', icon: Users },
      { title: 'Professores', url: '/admin/professores', icon: UserCheck },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { title: 'Planos', url: '/admin/planos', icon: CreditCard },
      { title: 'Presença', url: '/admin/presenca', icon: ClipboardCheck },
      { title: 'Faturas', url: '/admin/faturas', icon: Receipt },
      { title: 'Pag. Professores', url: '/admin/pagamentos-professores', icon: Receipt },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { title: 'Landing Page', url: '/admin/landing-page', icon: Settings },
      { title: 'Agendamentos', url: '/admin/agendamentos', icon: CalendarDays },
      { title: 'Configurações', url: '/admin/configuracoes', icon: Settings },
    ],
  },
];

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sidebar-primary to-primary shadow-lg">
            <span className="text-lg font-bold text-sidebar-primary-foreground font-brand">FV</span>
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-sm font-bold text-sidebar-foreground font-brand">
                FutVôlei Arena
              </h2>
              <p className="text-[11px] text-sidebar-foreground/50 font-medium tracking-wider uppercase">Painel Admin</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] font-bold tracking-[0.15em] uppercase text-sidebar-foreground/40 px-3 mb-1">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === '/admin'}
                        className="rounded-lg px-3 py-2 text-sidebar-foreground/70 transition-all duration-200 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                        activeClassName="bg-sidebar-primary/20 text-sidebar-primary font-semibold shadow-sm"
                      >
                        <item.icon className="mr-2.5 h-4 w-4" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && profile && (
          <div className="mb-2 rounded-lg bg-sidebar-accent/30 px-3 py-2">
            <p className="text-sm font-medium text-sidebar-foreground">{profile.full_name}</p>
            <p className="text-xs text-sidebar-foreground/50">{profile.email}</p>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut} className="rounded-lg text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors">
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6 sticky top-0 z-10">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold font-brand">
              Painel Administrativo
            </h1>
          </header>
          <main className="flex-1 overflow-auto bg-background p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
