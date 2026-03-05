import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  not_confirmed: { label: 'Não confirmado', variant: 'outline' },
  confirmed: { label: 'Confirmado', variant: 'secondary' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
  present: { label: 'Presente', variant: 'default' },
  absent: { label: 'Ausente', variant: 'destructive' },
};

export default function StudentAttendance() {
  const { user } = useAuth();

  const { data: studentProfile } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('student_profiles').select('id').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['student-attendance-history', studentProfile?.id],
    queryFn: async () => {
      const { data: attendances } = await supabase
        .from('attendances')
        .select('id, status, confirmed_at, session_id')
        .eq('student_id', studentProfile!.id);

      if (!attendances || attendances.length === 0) return [];

      const sessionIds = attendances.map(a => a.session_id);
      const { data: sessions } = await supabase
        .from('class_sessions')
        .select('id, date, class_id')
        .in('id', sessionIds)
        .order('date', { ascending: false });

      const classIds = [...new Set((sessions || []).map(s => s.class_id))];
      const { data: classes } = await supabase.from('classes').select('id, name').in('id', classIds);
      const classMap = Object.fromEntries((classes || []).map(c => [c.id, c.name]));
      const sessionMap = Object.fromEntries((sessions || []).map(s => [s.id, s]));

      return attendances
        .map(a => {
          const session = sessionMap[a.session_id];
          return session ? { ...a, date: session.date, className: classMap[session.class_id] || 'Aula' } : null;
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.date.localeCompare(a.date));
    },
    enabled: !!studentProfile,
  });

  const stats = {
    present: history.filter((h: any) => h.status === 'present').length,
    absent: history.filter((h: any) => h.status === 'absent').length,
    total: history.filter((h: any) => ['present', 'absent'].includes(h.status)).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Histórico de Presença</h2>
        <p className="text-sm text-muted-foreground">Acompanhe sua frequência nas aulas</p>
      </div>

      {stats.total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-primary">{stats.present}</p><p className="text-xs text-muted-foreground">Presenças</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-destructive">{stats.absent}</p><p className="text-xs text-muted-foreground">Faltas</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold">{stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%</p><p className="text-xs text-muted-foreground">Frequência</p></CardContent></Card>
        </div>
      )}

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : history.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum registro de presença ainda.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {history.map((item: any) => {
            const statusInfo = STATUS_LABELS[item.status] || STATUS_LABELS.not_confirmed;
            return (
              <Card key={item.id}>
                <CardContent className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium">{item.className}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {format(parseISO(item.date), "EEEE, dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
