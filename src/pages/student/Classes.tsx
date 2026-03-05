import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isToday, isTomorrow, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  not_confirmed: { label: 'Aguardando resposta', variant: 'outline' },
  confirmed: { label: '✅ Vou', variant: 'default' },
  cancelled: { label: '❌ Não vou', variant: 'destructive' },
  present: { label: 'Presente ✓', variant: 'default' },
  absent: { label: 'Ausente', variant: 'destructive' },
};

export default function StudentClasses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: studentProfile } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['student-sessions', studentProfile?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      // Get attendances for this student with session data
      const { data: attendances, error } = await supabase
        .from('attendances')
        .select('id, status, session_id, student_id')
        .eq('student_id', studentProfile!.id);
      
      if (error) throw error;
      if (!attendances || attendances.length === 0) return [];

      // Get session details
      const sessionIds = attendances.map(a => a.session_id);
      const { data: sessionData } = await supabase
        .from('class_sessions')
        .select('id, date, status, class_id')
        .in('id', sessionIds)
        .gte('date', today)
        .order('date', { ascending: true });

      if (!sessionData) return [];

      // Get class details
      const classIds = [...new Set(sessionData.map(s => s.class_id))];
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name, start_time, end_time, courts(name)')
        .in('id', classIds);

      const classMap = Object.fromEntries((classData || []).map(c => [c.id, c]));
      const attMap = Object.fromEntries(attendances.map(a => [a.session_id, a]));

      return sessionData.map(s => ({
        ...s,
        class: classMap[s.class_id],
        attendance: attMap[s.id],
      }));
    },
    enabled: !!studentProfile,
  });

  const updateAttendance = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: any = { status };
      if (status === 'confirmed') update.confirmed_at = new Date().toISOString();
      const { error } = await supabase.from('attendances').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-sessions'] });
      toast.success('Presença atualizada!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "EEEE, dd/MM", { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Próximas Aulas</h2>
        <p className="text-sm text-muted-foreground">Confirme se você vai ou não nas próximas aulas</p>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Nenhuma aula próxima encontrada.</p>
            <p className="mt-1 text-sm text-muted-foreground">Você será notificado quando houver aulas agendadas.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const att = session.attendance;
            const statusInfo = STATUS_LABELS[att?.status || 'not_confirmed'];
            const canConfirm = att && ['not_confirmed', 'cancelled'].includes(att.status) && session.status === 'scheduled';
            const canCancel = att && att.status === 'confirmed' && session.status === 'scheduled';

            return (
              <Card key={session.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <p className="font-semibold">{session.class?.name || 'Aula'}</p>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span className="capitalize">{getDateLabel(session.date)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{session.class?.start_time?.slice(0, 5)} - {session.class?.end_time?.slice(0, 5)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{(session.class?.courts as any)?.name || '—'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      {canConfirm && (
                        <div className="flex flex-col gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => updateAttendance.mutate({ id: att.id, status: 'confirmed' })}
                            disabled={updateAttendance.isPending}
                          >
                            <CheckCircle className="mr-1 h-3.5 w-3.5" />
                            Vou
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateAttendance.mutate({ id: att.id, status: 'cancelled' })}
                            disabled={updateAttendance.isPending}
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            Não vou
                          </Button>
                        </div>
                      )}
                      {canCancel && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAttendance.mutate({ id: att.id, status: 'cancelled' })}
                          disabled={updateAttendance.isPending}
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                          Não vou mais
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
