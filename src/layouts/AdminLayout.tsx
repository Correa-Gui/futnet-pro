import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { NavLink } from "@/components/NavLink";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getAdminMenuGroups, getAdminPageTitle } from "@/modules/admin";

function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, profile, allowedMenus } = useAuth();
  const navigate = useNavigate();

  const { data: trialPendingCount = 0 } = useQuery({
    queryKey: ["admin-trial-pending-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("trial_requests" as any)
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const isSuperAdmin = allowedMenus === null;
  const menuGroups = getAdminMenuGroups(isSuperAdmin);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
            <span className="text-base font-bold text-sidebar-primary-foreground font-brand">FV</span>
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-sm font-bold text-sidebar-foreground font-brand tracking-wider">
                FutVôlei Arena
              </h2>
              <p className="text-[10px] text-sidebar-foreground/40 font-medium uppercase tracking-widest">
                Painel Admin
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        {menuGroups.map((group) => {
          const visibleItems = isSuperAdmin
            ? group.items
            : group.items.filter((item) => allowedMenus!.includes(item.key));

          if (visibleItems.length === 0) return null;

          return (
            <SidebarGroup key={group.label} className="mb-1">
              <SidebarGroupLabel className="text-[10px] font-semibold tracking-[0.15em] uppercase text-sidebar-foreground/30 px-3 mb-1">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.key}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === "/admin"}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/60 transition-all duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          activeClassName="bg-sidebar-primary/15 text-sidebar-primary font-medium"
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!collapsed && <span className="flex-1 truncate">{item.title}</span>}
                          {!collapsed && item.key === "aulas-teste" && trialPendingCount > 0 && (
                            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                              {trialPendingCount}
                            </span>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && profile && (
          <div className="mb-2 flex items-center gap-2.5 rounded-lg px-3 py-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-xs font-semibold">
                {profile.full_name?.split(" ").map((name) => name[0]).join("").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.full_name}</p>
              <p className="text-[11px] text-sidebar-foreground/40 truncate">{profile.email}</p>
            </div>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleSignOut}
              className="rounded-lg text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span className="text-sm">Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function AdminHeader() {
  const { profile } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-sm px-4 md:px-6">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

      <h1 className="text-base font-semibold text-foreground hidden sm:block">
        {getAdminPageTitle(location.pathname)}
      </h1>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="w-56 pl-9 h-9 bg-muted/50 border-transparent focus:border-border text-sm"
          />
        </div>

        <button className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors">
          <Bell className="h-4.5 w-4.5 text-muted-foreground" />
        </button>

        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            {profile?.full_name?.split(" ").map((name) => name[0]).join("").slice(0, 2).toUpperCase() || "AD"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AdminSidebar />
        <div className="flex flex-1 flex-col">
          <AdminHeader />
          <main className="flex-1 overflow-auto bg-background p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
