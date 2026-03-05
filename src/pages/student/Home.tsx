import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Star, BookOpen } from 'lucide-react';

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function StudentHome() {
  const { user, profile } = useAuth();

  const { data: studentData } = useQuery({
    queryKey: ['student-home-data', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: sp } = await supabase
        .from('student_profiles')
        .select('id, skill_level, plan_id')
        .eq('user_id', user!.id)
        .single();
      if (!sp) return null;

      const [enrollRes, planRes] = await Promise.all([
        supabase.from('enrollments').select('class_id').eq('student_id', sp.id).eq('status', 'active'),
        sp.plan_id ? supabase.from('plans').select('name, monthly_price, classes_per_week').eq('id', sp.plan_id).single() : Promise.resolve({ data: null }),
      ]);

      let classes: any[] = [];
      if (enrollRes.data && enrollRes.data.length > 0) {
        const ids = enrollRes.data.map(e => e.class_id);
        const { data } = await supabase.from('classes').select('name, day_of_week, start_time, end_time').in('id', ids).eq('status', 'active');
        classes = data || [];
      }

      return { student: sp, plan: planRes.data, classes };
    },
  });

  const firstName = profile?.full_name?.split(' ')[0] || 'Aluno';
  const levelLabels: Record<string, string> = { beginner: 'Iniciante', elementary: 'Básico', intermediate: 'Intermediário', advanced: 'Avançado' };

  return (
    <div className="space-y-5 pb-4">
      {/* Greeting */}
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-lg">
        <p className="text-sm opacity-80">{getGreeting()} 👋</p>
        <h2 className="text-xl font-bold mt-0.5" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em' }}>
          {firstName}
        </h2>
        {studentData?.student && (
          <span className="mt-2 inline-block rounded-full bg-primary-foreground/20 px-3 py-0.5 text-xs font-medium">
            {levelLabels[studentData.student.skill_level] || studentData.student.skill_level}
          </span>
        )}
      </div>

      {/* Plan card */}
      {studentData?.plan && (
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Star className="h-4 w-4 text-secondary" />
            <CardTitle className="text-sm font-medium">Meu Plano</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{studentData.plan.name}</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-primary">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(studentData.plan.monthly_price)}
              </span>
              <span className="text-xs text-muted-foreground">/mês</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{studentData.plan.classes_per_week}x por semana</p>
          </CardContent>
        </Card>
      )}

      {/* Classes */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Minhas Turmas</h3>
        </div>
        {!studentData?.classes?.length ? (
          <Card>
            <CardContent className="py-6 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma turma ativa encontrada.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {studentData.classes.map((c: any, i: number) => (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {(c.day_of_week as number[]).map((d: number) => DAY_NAMES[d]).join(', ')}
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
    </div>
  );
}
