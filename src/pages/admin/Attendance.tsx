import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ATT_STATUS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  not_confirmed: { label: 'Não confirmado', variant: 'outline' },
  confirmed: { label: 'Confirmado', variant: 'secondary' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
  present: { label: 'Presente', variant: 'default' },
  absent: { label: 'Ausente', variant: 'destructive' },
};

export default function AdminAttendance() {
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>('all');

  const { data: classes = [] } = useQuery({
    queryKey: ['admin-classes-list'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('id, name').eq('status', 'active').order('name');
      return data || [];
    },
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['admin-sessions', selectedClass],
    queryFn: async () => {
      let query = supabase
        .from('class_sessions')
        .select('id, date, status, class_id')
        .order('date', { ascending: false })
        .limit(50);

      if (selectedClass !== 'all') query = query.eq('class_id', selectedClass);

      const { data } = await query;
      if (!data || data.length === 0) return [];

      const classIds = [...new Set(data.map(s => s.class_id))];
      const { data: classData } = await supabase.from('classes').select('id, name').in('id', classIds);
      const classMap = Object.fromEntries((classData || []).map(c => [c.id, c.name]));

      // Get attendance counts per session
      const sessionIds = data.map(s => s.id);
      const { data: atts } = await supabase.from('attendances').select('session_id, status').in('session_id', sessionIds);

      const attCounts: Record<string, { total: number; confirmed: number; present: number; absent: number }> = {};
      (atts || []).forEach(a => {
        if (!attCounts[a.session_id]) attCounts[a.session_id] = { total: 0, confirmed: 0, present: 0, absent: 0 };
        attCounts[a.session_id].total++;
        if (a.status === 'confirmed') attCounts[a.session_id].confirmed++;
        if (a.status === 'present') attCounts[a.session_id].present++;
        if (a.status === 'absent') attCounts[a.session_id].absent++;
      });

      return data.map(s => ({ ...s, className: classMap[s.class_id] || '—', counts: attCounts[s.id] || { total: 0, confirmed: 0, present: 0, absent: 0 } }));
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-sessions', {
        body: { days_ahead: 14 },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      toast.success(`${data.created} sessões geradas!`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const SESSION_STATUS: Record<string, string> = { scheduled: 'Agendada', completed: 'Concluída', cancelled: 'Cancelada' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
            Presença
          </h2>
          <p className="text-sm text-muted-foreground">Gerencie sessões e acompanhe a presença</p>
        </div>
        <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
          <Zap className="mr-2 h-4 w-4" />
          {generateMutation.isPending ? 'Gerando...' : 'Gerar Sessões (14 dias)'}
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Filtrar por turma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as turmas</SelectItem>
            {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Confirmados</TableHead>
                <TableHead>Presentes</TableHead>
                <TableHead>Ausentes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : sessions.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nenhuma sessão encontrada. Clique em "Gerar Sessões" para criar.</TableCell></TableRow>
              ) : sessions.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="capitalize">{format(parseISO(s.date), "dd/MM (EEE)", { locale: ptBR })}</TableCell>
                  <TableCell className="font-medium">{s.className}</TableCell>
                  <TableCell><Badge variant={s.status === 'scheduled' ? 'outline' : s.status === 'completed' ? 'default' : 'destructive'}>{SESSION_STATUS[s.status]}</Badge></TableCell>
                  <TableCell>{s.counts.confirmed}/{s.counts.total}</TableCell>
                  <TableCell className="text-primary font-medium">{s.counts.present}</TableCell>
                  <TableCell className="text-destructive font-medium">{s.counts.absent}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
