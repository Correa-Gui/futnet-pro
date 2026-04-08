import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user, role, loading, profile, studentProfile } = useAuth();

  if (loading) {
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

  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (role === 'teacher') return <Navigate to="/professor" replace />;

  // Students without a plan go to plan selection first
  if (role === 'student' && studentProfile && studentProfile.plan_id === null) {
    return <Navigate to="/aluno/escolher-plano" replace />;
  }

  return <Navigate to="/aluno" replace />;
};

export default Index;
