import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Users, Clock } from 'lucide-react';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function TeacherHome() {
  const { user, profile } = useAuth();

  const { data } = useQuery({
    queryKey: ['teacher-home', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: tp } = await supabase
        .from('teacher_profiles')
        .select('id')
        .eq('user_id', user!.id)
        .single();
      if (!tp) return null;

      const today = new Date().toISOString().split('T')[0];
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name, start_time, end_time, day_of_week, max_students')
        .eq('teacher_id', tp.id)
        .eq('status', 'active');

      const classIds = (classes || []).map(c => c.id);
      let todaySessions: any[] = [];
      let enrollmentCounts: Record<string, number> = {};

      if (classIds.length > 0) {
        const [sessionsRes, enrollRes] = await Promise.all([
          supabase.from('class_sessions').select('id, class_id, status').eq('date', today).in('class_id', classIds),
          supabase.from('enrollments').select('class_id').in('class_id', classIds).eq('status', 'active'),
        ]);
        todaySessions = sessionsRes.data || [];
        (enrollRes.data || []).forEach(e => {
          enrollmentCounts[e.class_id] = (enrollmentCounts[e.class_id] || 0) + 1;
        });
      }

      return { classes: classes || [], todaySessions, enrollmentCounts, totalClasses: classIds.length };
    },
  });

  const firstName = profile?.full_name?.split(' ')[0] || 'Professor';
  const todayClassIds = new Set((data?.todaySessions || []).map((s: any) => s.class_id));
  const todayClasses = (data?.classes || []).filter((c: any) => todayClassIds.has(c.id));

  return (
    <div className="space-y-5 pb-4">
      {/* Greeting */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-lg">
        <p className="text-sm opacity-80">{getGreeting()} 👋</p>
        <h2 className="text-xl font-bold mt-0.5" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em' }}>
          {firstName}
        </h2>
        <div className="mt-3 flex gap-4 text-sm">
          <div className="flex items-center gap-1.5 bg-primary-foreground/15 rounded-full px-3 py-1">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="font-medium">{todayClasses.length} aula(s) hoje</span>
          </div>
          <div className="flex items-center gap-1.5 bg-primary-foreground/15 rounded-full px-3 py-1">
            <Users className="h-3.5 w-3.5" />
            <span className="font-medium">{data?.totalClasses || 0} turma(s)</span>
          </div>
        </div>
      </div>

      {/* Today's classes */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Aulas de Hoje</h3>
        </div>
        {todayClasses.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma aula agendada para hoje.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {todayClasses.map((c: any) => (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {data?.enrollmentCounts[c.id] || 0}/{c.max_students} alunos
                    </p>
                  </div>
                  <span className="text-sm font-mono text-muted-foreground">
                    {c.start_time?.slice(0, 5)} - {c.end_time?.slice(0, 5)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* All classes */}
      {(data?.classes || []).length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-foreground mb-3">Todas as Turmas</h3>
          <div className="space-y-2">
            {data!.classes.map((c: any) => {
              const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
              return (
                <Card key={c.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{c.name}</p>
                      <span className="text-xs text-muted-foreground font-mono">
                        {c.start_time?.slice(0, 5)} - {c.end_time?.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-muted-foreground">
                        {(c.day_of_week as number[]).map((d: number) => DAY_NAMES[d]).join(', ')}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {data?.enrollmentCounts[c.id] || 0}/{c.max_students}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
