import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { CalendarDays, Receipt, User, Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import NotificationBell from '@/components/student/NotificationBell';

const navItems = [
  { title: 'Início', url: '/aluno', icon: Home },
  { title: 'Aulas', url: '/aluno/aulas', icon: CalendarDays },
  { title: 'Faturas', url: '/aluno/faturas', icon: Receipt },
  { title: 'Perfil', url: '/aluno/perfil', icon: User },
];

export default function StudentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <span className="text-sm font-bold text-primary-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>FV</span>
            </div>
            <div>
              <h1 className="text-sm font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>FutVôlei Arena</h1>
              <p className="text-xs text-muted-foreground">Olá, {profile?.full_name?.split(' ')[0] || 'Aluno'}!</p>
            </div>
          </div>
          <NotificationBell />
        </div>

      {/* Content */}
      <main className="flex-1 overflow-auto p-4 pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = item.url === '/aluno'
              ? location.pathname === '/aluno'
              : location.pathname.startsWith(item.url);
            return (
              <button
                key={item.title}
                onClick={() => navigate(item.url)}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
