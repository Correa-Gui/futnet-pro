import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptions } from '@/core/tenant';

function ModuleDisabledMessage({ label }: { label: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

const Index = () => {
  const { user, role, loading, profile, studentProfile } = useAuth();
  const { data: subscriptions, isLoading: subscriptionsLoading } = useSubscriptions(['admin', 'student', 'teacher']);

  if (loading || subscriptionsLoading || (user && profile === null)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if ((profile as any)?.force_password_change) return <Navigate to="/change-password" replace />;

  const hasModule = (moduleId: 'admin' | 'student' | 'teacher') =>
    subscriptions?.activeModules.includes(moduleId) ?? true;

  if (role === 'admin') {
    return hasModule('admin')
      ? <Navigate to="/admin" replace />
      : <ModuleDisabledMessage label="Módulo administrativo desativado para este tenant." />;
  }

  if (role === 'teacher') {
    return hasModule('teacher')
      ? <Navigate to="/professor" replace />
      : <ModuleDisabledMessage label="Módulo do professor desativado para este tenant." />;
  }

  if (role === 'student' && !hasModule('student')) {
    return <ModuleDisabledMessage label="Módulo do aluno desativado para este tenant." />;
  }

  if (role === 'student' && studentProfile && studentProfile.plan_id === null) {
    return <Navigate to="/aluno/escolher-plano" replace />;
  }

  return <Navigate to="/aluno" replace />;
};

export default Index;
