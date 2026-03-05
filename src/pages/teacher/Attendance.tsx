import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ATT_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  not_confirmed: { label: 'Não confirmado', variant: 'outline' },
  confirmed: { label: 'Confirmado', variant: 'secondary' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
  present: { label: 'Presente', variant: 'default' },
  absent: { label: 'Ausente', variant: 'destructive' },
};

export default function TeacherAttendance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});

  const { data: teacherProfile } = useQuery({
    queryKey: ['teacher-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('teacher_profiles').select('id').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['teacher-att-classes', teacherProfile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', teacherProfile!.id)
        .eq('status', 'active');
      return data || [];
    },
    enabled: !!teacherProfile,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['teacher-sessions', classes.map(c => c.id)],
    queryFn: async () => {
      const classIds = classes.map(c => c.id);
      const today = new Date().toISOString().split('T')[0];
      // Show today and recent past sessions (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      const { data } = await supabase
        .from('class_sessions')
        .select('id, date, status, class_id')
        .in('class_id', classIds)
        .gte('date', weekAgoStr)
        .lte('date', today)
        .order('date', { ascending: false });

      const classMap = Object.fromEntries(classes.map(c => [c.id, c.name]));
      return (data || []).map(s => ({ ...s, className: classMap[s.class_id] || 'Aula' }));
    },
    enabled: classes.length > 0,
  });

  const { data: attendances = [] } = useQuery({
    queryKey: ['session-attendances', selectedSession],
    queryFn: async () => {
      const { data: atts } = await supabase
        .from('attendances')
        .select('id, status, student_id')
        .eq('session_id', selectedSession!);

      if (!atts || atts.length === 0) return [];

      const studentIds = atts.map(a => a.student_id);
      const { data: students } = await supabase.from('student_profiles').select('id, user_id').in('id', studentIds);
      const userIds = (students || []).map(s => s.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);

      const userToName = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
      const studentToUser = Object.fromEntries((students || []).map(s => [s.id, s.user_id]));

      return atts.map(a => ({
        ...a,
        studentName: userToName[studentToUser[a.student_id]] || 'Aluno',
      }));
    },
    enabled: !!selectedSession,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(localStatuses);
      for (const [id, status] of updates) {
        const { error } = await supabase.from('attendances').update({ status: status as any }).eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-attendances'] });
      setLocalStatuses({});
      toast.success('Presenças salvas!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getStatus = (att: any) => localStatuses[att.id] || att.status;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Chamada</h2>
        <p className="text-sm text-muted-foreground">Marque a presença dos alunos após a aula</p>
      </div>

      {sessions.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma sessão disponível para chamada.</CardContent></Card>
      ) : (
        <>
          <div className="space-y-2">
            <Select value={selectedSession || ''} onValueChange={v => { setSelectedSession(v); setLocalStatuses({}); }}>
              <SelectTrigger><SelectValue placeholder="Selecione uma aula..." /></SelectTrigger>
              <SelectContent>
                {sessions.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.className} — {format(parseISO(s.date), "dd/MM (EEEE)", { locale: ptBR })}
                    {isToday(parseISO(s.date)) ? ' • Hoje' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSession && attendances.length === 0 && (
            <Card><CardContent className="py-6 text-center text-muted-foreground">Nenhum aluno matriculado nesta aula.</CardContent></Card>
          )}

          {selectedSession && attendances.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Lista de Alunos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {attendances.map((att: any) => {
                  const status = getStatus(att);
                  return (
                    <div key={att.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div>
                        <p className="text-sm font-medium">{att.studentName}</p>
                        <Badge variant={ATT_STATUS[status]?.variant || 'outline'} className="mt-1">
                          {ATT_STATUS[status]?.label || status}
                        </Badge>
                      </div>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant={status === 'present' ? 'default' : 'outline'}
                          onClick={() => setLocalStatuses(prev => ({ ...prev, [att.id]: 'present' }))}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={status === 'absent' ? 'destructive' : 'outline'}
                          onClick={() => setLocalStatuses(prev => ({ ...prev, [att.id]: 'absent' }))}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {Object.keys(localStatuses).length > 0 && (
                  <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {saveMutation.isPending ? 'Salvando...' : 'Salvar Chamada'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
