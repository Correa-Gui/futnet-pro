import { Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, MapPin, Users, GraduationCap, UserCheck,
  Receipt, CalendarDays, Settings, CreditCard, LogOut, Menu
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar';

const menuItems = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Quadras', url: '/admin/quadras', icon: MapPin },
  { title: 'Turmas', url: '/admin/turmas', icon: GraduationCap },
  { title: 'Alunos', url: '/admin/alunos', icon: Users },
  { title: 'Professores', url: '/admin/professores', icon: UserCheck },
  { title: 'Planos', url: '/admin/planos', icon: CreditCard },
  { title: 'Faturas', url: '/admin/faturas', icon: Receipt },
  { title: 'Agendamentos', url: '/admin/agendamentos', icon: CalendarDays },
  { title: 'Configurações', url: '/admin/configuracoes', icon: Settings },
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary">
            <span className="text-lg font-bold text-sidebar-primary-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>FV</span>
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-sm font-bold text-sidebar-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
                FutVôlei Arena
              </h2>
              <p className="text-xs text-sidebar-foreground/60">Painel Admin</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === '/admin'} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && profile && (
          <div className="mb-2 px-2">
            <p className="text-sm font-medium text-sidebar-foreground">{profile.full_name}</p>
            <p className="text-xs text-sidebar-foreground/60">{profile.email}</p>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleSignOut}>
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
          <header className="flex h-14 items-center gap-4 border-b border-border bg-card px-4 md:px-6">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
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
