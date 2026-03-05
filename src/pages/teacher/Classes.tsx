import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Users } from 'lucide-react';

const DAYS: Record<number, string> = { 0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb' };
const LEVELS: Record<string, string> = { beginner: 'Aprendiz', elementary: 'Principiante', intermediate: 'Intermediário', advanced: 'Avançado' };

export default function TeacherClasses() {
  const { user } = useAuth();

  const { data: teacherProfile } = useQuery({
    queryKey: ['teacher-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('teacher_profiles').select('id').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['teacher-classes', teacherProfile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('classes')
        .select('*, courts(name)')
        .eq('teacher_id', teacherProfile!.id)
        .eq('status', 'active')
        .order('start_time');
      return data || [];
    },
    enabled: !!teacherProfile,
  });

  const { data: enrollmentCounts = {} } = useQuery({
    queryKey: ['teacher-enrollment-counts', teacherProfile?.id],
    queryFn: async () => {
      const classIds = classes.map(c => c.id);
      const { data } = await supabase.from('enrollments').select('class_id').eq('status', 'active').in('class_id', classIds);
      const counts: Record<string, number> = {};
      (data || []).forEach(e => { counts[e.class_id] = (counts[e.class_id] || 0) + 1; });
      return counts;
    },
    enabled: classes.length > 0,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Minhas Turmas</h2>
        <p className="text-sm text-muted-foreground">Turmas que você ministra</p>
      </div>

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : classes.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhuma turma atribuída.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {classes.map((cls: any) => (
            <Card key={cls.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-semibold">{cls.name}</p>
                    <Badge variant="outline">{LEVELS[cls.level] || cls.level}</Badge>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span>{cls.day_of_week.map((d: number) => DAYS[d]).join(', ')} • {cls.start_time.slice(0, 5)} - {cls.end_time.slice(0, 5)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{(cls.courts as any)?.name || '—'}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{enrollmentCounts[cls.id] || 0}/{cls.max_students}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
