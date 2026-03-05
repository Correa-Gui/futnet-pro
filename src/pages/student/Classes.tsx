import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, Clock, MapPin, ThumbsUp, ThumbsDown, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  not_confirmed: { label: 'Aguardando', variant: 'outline' },
  confirmed: { label: 'Vou ✓', variant: 'default' },
  cancelled: { label: 'Não vou', variant: 'destructive' },
  present: { label: 'Presente ✓', variant: 'default' },
  absent: { label: 'Faltou', variant: 'destructive' },
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
      
      const { data: attendances, error } = await supabase
        .from('attendances')
        .select('id, status, session_id, student_id')
        .eq('student_id', studentProfile!.id);
      
      if (error) throw error;
      if (!attendances || attendances.length === 0) return [];

      const sessionIds = attendances.map(a => a.session_id);
      const { data: sessionData } = await supabase
        .from('class_sessions')
        .select('id, date, status, class_id')
        .in('id', sessionIds)
        .gte('date', today)
        .order('date', { ascending: true });

      if (!sessionData) return [];

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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['student-sessions'] });
      toast.success(variables.status === 'confirmed' ? 'Confirmado! Até lá 🏐' : 'Aula desmarcada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "EEEE, dd/MM", { locale: ptBR });
  };

  const pendingSessions = sessions.filter(s => s.attendance?.status === 'not_confirmed');
  const answeredSessions = sessions.filter(s => s.attendance?.status !== 'not_confirmed');
  const pendingCount = pendingSessions.length;

  const renderSession = (session: any, showActions: 'pending' | 'answered') => {
    const att = session.attendance;
    const statusInfo = STATUS_CONFIG[att?.status || 'not_confirmed'];
    const isPending = showActions === 'pending';
    const canUndo = att && ['confirmed', 'cancelled'].includes(att.status) && session.status === 'scheduled';

    return (
      <Card key={session.id} className={isPending ? 'border-primary/30 bg-primary/5' : ''}>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium capitalize text-muted-foreground">
              {getDateLabel(session.date)}
            </span>
            {!isPending && <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>}
          </div>

          <p className="font-semibold">{session.class?.name || 'Aula'}</p>

          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {session.class?.start_time?.slice(0, 5)} – {session.class?.end_time?.slice(0, 5)}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {(session.class?.courts as any)?.name || '—'}
            </span>
          </div>

          {isPending && (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => updateAttendance.mutate({ id: att.id, status: 'confirmed' })}
                disabled={updateAttendance.isPending}
              >
                <ThumbsUp className="mr-1.5 h-4 w-4" />
                Vou
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={() => updateAttendance.mutate({ id: att.id, status: 'cancelled' })}
                disabled={updateAttendance.isPending}
              >
                <ThumbsDown className="mr-1.5 h-4 w-4" />
                Não vou
              </Button>
            </div>
          )}

          {!isPending && canUndo && (
            <div className="mt-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => updateAttendance.mutate({
                  id: att.id,
                  status: att.status === 'confirmed' ? 'cancelled' : 'confirmed',
                })}
                disabled={updateAttendance.isPending}
              >
                <Undo2 className="mr-1 h-3 w-3" />
                {att.status === 'confirmed' ? 'Desmarcar' : 'Quero ir'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Minhas Aulas</h2>
        <p className="text-sm text-muted-foreground">Confirme se você vai nas próximas aulas</p>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <CalendarDays className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma aula agendada.</p>
            <p className="mt-1 text-xs text-muted-foreground">Suas aulas aparecerão aqui quando forem geradas.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={pendingCount > 0 ? 'pending' : 'all'}>
          <TabsList className="w-full">
            <TabsTrigger value="pending" className="flex-1">
              Pendentes {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-5 min-w-5 px-1 text-[10px]">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1">Confirmadas</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-3 space-y-3">
            {pendingSessions.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  🎉 Tudo respondido! Nenhuma aula pendente.
                </CardContent>
              </Card>
            ) : (
              pendingSessions.map(s => renderSession(s, 'pending'))
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-3 space-y-3">
            {answeredSessions.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma aula respondida ainda.
                </CardContent>
              </Card>
            ) : (
              answeredSessions.map(s => renderSession(s, 'answered'))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
