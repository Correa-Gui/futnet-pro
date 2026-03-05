import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { CalendarDays, User, ClipboardCheck, Home } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Início', url: '/professor', icon: Home },
  { title: 'Turmas', url: '/professor/turmas', icon: CalendarDays },
  { title: 'Presença', url: '/professor/presenca', icon: ClipboardCheck },
  { title: 'Perfil', url: '/professor/perfil', icon: User },
];

export default function TeacherLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <span className="text-sm font-bold text-primary-foreground" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>FV</span>
          </div>
          <div>
            <h1 className="text-sm font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>FutVôlei Arena</h1>
            <p className="text-xs text-muted-foreground">Prof. {profile?.full_name?.split(' ')[0] || 'Professor'}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const isActive = item.url === '/professor'
              ? location.pathname === '/professor'
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
