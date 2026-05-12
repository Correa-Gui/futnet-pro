import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Search } from "lucide-react";
import NotificationBell from "@/components/student/NotificationBell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { getStudentPageTitle, STUDENT_NAV_ITEMS } from "@/modules/student/navigation";

function StudentSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-border bg-sidebar">
      <div className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
            <span className="text-base font-bold text-sidebar-primary-foreground font-brand">FV</span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-sidebar-foreground font-brand tracking-wider">FutVôlei Arena</h2>
            <p className="text-[10px] text-sidebar-foreground/40 font-medium uppercase tracking-widest">
              Área do Aluno
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {STUDENT_NAV_ITEMS.map((item) => {
          const isActive = item.url === "/aluno"
            ? location.pathname === "/aluno"
            : location.pathname.startsWith(item.url);

          return (
            <button
              key={item.title}
              onClick={() => navigate(item.url)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                isActive
                  ? "bg-sidebar-primary/15 text-sidebar-primary font-medium"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.title}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {profile && (
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
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}

function StudentHeader() {
  const { profile } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card/80 backdrop-blur-sm px-4">
      {isMobile && (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-xs font-bold text-primary-foreground font-brand">FV</span>
          </div>
        </div>
      )}

      <h1 className="text-base font-semibold text-foreground">
        {isMobile ? `Olá, ${profile?.full_name?.split(" ")[0] || "Aluno"}!` : getStudentPageTitle(location.pathname)}
      </h1>

      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="w-48 pl-9 h-9 bg-muted/50 border-transparent focus:border-border text-sm"
          />
        </div>

        <NotificationBell />

        <Avatar className="h-8 w-8 cursor-pointer hidden md:flex">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            {profile?.full_name?.split(" ").map((name) => name[0]).join("").slice(0, 2).toUpperCase() || "AL"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden">
      <div className="flex items-center justify-around py-2">
        {STUDENT_NAV_ITEMS.map((item) => {
          const isActive = item.url === "/aluno"
            ? location.pathname === "/aluno"
            : location.pathname.startsWith(item.url);

          return (
            <button
              key={item.title}
              onClick={() => navigate(item.url)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default function StudentLayout() {
  const { studentProfile } = useAuth();

  if (studentProfile !== undefined && studentProfile !== null && studentProfile.plan_id === null) {
    return <Navigate to="/aluno/escolher-plano" replace />;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <StudentSidebar />
      <div className="flex flex-1 flex-col">
        <StudentHeader />
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
