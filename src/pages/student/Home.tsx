import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, BookOpen, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
        .select('id, skill_level')
        .eq('user_id', user!.id)
        .single();
      if (!sp) return null;

      // Get confirmed attendances
      const { data: attendances } = await supabase
        .from('attendances')
        .select('id, status, session_id')
        .eq('student_id', sp.id)
        .eq('status', 'confirmed');

      let upcomingSessions: any[] = [];
      if (attendances && attendances.length > 0) {
        const sessionIds = attendances.map(a => a.session_id);
        const today = new Date().toISOString().split('T')[0];
        const { data: sessions } = await supabase
          .from('class_sessions')
          .select('id, date, class_id')
          .in('id', sessionIds)
          .gte('date', today)
          .eq('status', 'scheduled')
          .order('date', { ascending: true })
          .limit(5);

        if (sessions && sessions.length > 0) {
          const classIds = [...new Set(sessions.map(s => s.class_id))];
          const { data: classes } = await supabase
            .from('classes')
            .select('id, name, start_time, end_time, courts(name)')
            .in('id', classIds);
          const classMap = Object.fromEntries((classes || []).map(c => [c.id, c]));
          upcomingSessions = sessions.map(s => ({ ...s, class: classMap[s.class_id] }));
        }
      }

      return { student: sp, upcomingSessions };
    },
  });

  const firstName = profile?.full_name?.split(' ')[0] || 'Aluno';
  const levelLabels: Record<string, string> = { beginner: 'Iniciante', elementary: 'Básico', intermediate: 'Intermediário', advanced: 'Avançado' };

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "EEEE, dd/MM", { locale: ptBR });
  };

  return (
    <div className="space-y-5 pb-4">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
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
      </motion.div>

      {/* Upcoming confirmed sessions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Próximas Aulas Confirmadas</h3>
        </div>
        {!studentData?.upcomingSessions?.length ? (
          <Card>
            <CardContent className="py-6 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma aula confirmada.</p>
              <p className="text-xs text-muted-foreground mt-1">Confirme presença na aba Aulas.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {studentData.upcomingSessions.map((s: any, i: number) => (
              <motion.div key={s.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.25 + i * 0.08 }}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium capitalize text-muted-foreground">
                        {getDateLabel(s.date)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-primary font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        Confirmado
                      </span>
                    </div>
                    <p className="text-sm font-semibold">{s.class?.name || 'Aula'}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {s.class?.start_time?.slice(0, 5)} – {s.class?.end_time?.slice(0, 5)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {(s.class?.courts as any)?.name || '—'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
