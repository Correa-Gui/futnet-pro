import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CalendarDays, BookOpen, Clock, MapPin, CheckCircle2,
  AlertCircle, Receipt, Flame, TrendingUp, Bell,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO, isToday, isTomorrow, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

const LEVEL_ORDER = ['beginner', 'elementary', 'intermediate', 'advanced'] as const;
const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Iniciante',
  elementary: 'Básico',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};
const LEVEL_THRESHOLDS = [0, 20, 60, 120];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function StudentHome() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ['student-home-rich', user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get student profile
      const { data: sp } = await supabase
        .from('student_profiles')
        .select('id, skill_level')
        .eq('user_id', user!.id)
        .single();
      if (!sp) return null;

      const now = new Date();
      const monthStart = startOfMonth(now).toISOString().split('T')[0];
      const monthEnd = endOfMonth(now).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];

      // Parallel fetches
      const [attendancesRes, invoicesRes, notificationsRes] = await Promise.all([
        supabase
          .from('attendances')
          .select('id, status, session_id, confirmed_at')
          .eq('student_id', sp.id),
        supabase
          .from('invoices')
          .select('id, amount, discount, status, due_date, reference_month')
          .eq('student_id', sp.id),
        supabase
          .from('notifications')
          .select('id, title, message, type, sent_at, read_at')
          .eq('user_id', user!.id)
          .order('sent_at', { ascending: false })
          .limit(3),
      ]);

      const attendances = attendancesRes.data || [];
      const invoices = invoicesRes.data || [];
      const notifications = notificationsRes.data || [];

      // Get sessions for this month to calculate attendance rate
      let monthSessions: any[] = [];
      let upcomingSessions: any[] = [];

      if (attendances.length > 0) {
        const sessionIds = attendances.map(a => a.session_id);
        const [monthRes, upcomingRes] = await Promise.all([
          supabase
            .from('class_sessions')
            .select('id, date')
            .in('id', sessionIds)
            .gte('date', monthStart)
            .lte('date', monthEnd),
          supabase
            .from('class_sessions')
            .select('id, date, class_id')
            .in('id', sessionIds)
            .gte('date', today)
            .eq('status', 'scheduled')
            .order('date', { ascending: true })
            .limit(3),
        ]);
        monthSessions = monthRes.data || [];
        const rawUpcoming = upcomingRes.data || [];

        if (rawUpcoming.length > 0) {
          const classIds = [...new Set(rawUpcoming.map(s => s.class_id))];
          const { data: classes } = await supabase
            .from('classes')
            .select('id, name, start_time, end_time, courts(name)')
            .in('id', classIds);
          const classMap = Object.fromEntries((classes || []).map(c => [c.id, c]));
          upcomingSessions = rawUpcoming.map(s => ({ ...s, class: classMap[s.class_id] }));
        }
      }

      // Attendance stats for this month
      const monthSessionIds = new Set(monthSessions.map(s => s.id));
      const monthAttendances = attendances.filter(a => monthSessionIds.has(a.session_id));
      const totalMonthSessions = monthAttendances.length;
      const confirmedMonth = monthAttendances.filter(a => ['confirmed', 'present'].includes(a.status)).length;

      // Total "present" count for skill progression
      const totalPresent = attendances.filter(a => a.status === 'present').length;

      // Streak: consecutive weeks with at least one 'present' or 'confirmed'
      const streak = calculateStreak(attendances);

      // Financial
      const pendingInvoices = invoices.filter(i => ['pending', 'overdue'].includes(i.status));
      const pendingTotal = pendingInvoices.reduce((s, i) => s + Number(i.amount) - Number(i.discount || 0), 0);
      const overdueCount = pendingInvoices.filter(i => i.status === 'overdue').length;

      // Filter upcoming to only confirmed
      const attMap = Object.fromEntries(attendances.map(a => [a.session_id, a]));
      const confirmedUpcoming = upcomingSessions.filter(s => {
        const att = attMap[s.id];
        return att && att.status === 'confirmed';
      });

      return {
        student: sp,
        attendanceRate: totalMonthSessions > 0 ? Math.round((confirmedMonth / totalMonthSessions) * 100) : 0,
        confirmedMonth,
        totalMonthSessions,
        totalPresent,
        streak,
        pendingTotal,
        overdueCount,
        pendingInvoiceCount: pendingInvoices.length,
        upcomingSessions: confirmedUpcoming,
        notifications,
      };
    },
  });

  const firstName = profile?.full_name?.split(' ')[0] || 'Aluno';

  // Skill progression
  const currentLevel = data?.student?.skill_level || 'beginner';
  const currentLevelIdx = LEVEL_ORDER.indexOf(currentLevel as any);
  const nextLevelIdx = Math.min(currentLevelIdx + 1, LEVEL_ORDER.length - 1);
  const currentThreshold = LEVEL_THRESHOLDS[currentLevelIdx];
  const nextThreshold = LEVEL_THRESHOLDS[nextLevelIdx];
  const totalPresent = data?.totalPresent || 0;
  const progressToNext = currentLevelIdx >= LEVEL_ORDER.length - 1
    ? 100
    : Math.min(100, Math.round(((totalPresent - currentThreshold) / (nextThreshold - currentThreshold)) * 100));

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "EEEE, dd/MM", { locale: ptBR });
  };

  const monthName = format(new Date(), 'MMMM', { locale: ptBR });

  return (
    <div className="space-y-5 pb-4">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-lg">
          <p className="text-sm opacity-80">{getGreeting()} 👋</p>
          <h2 className="text-xl font-bold mt-0.5" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em' }}>
            {firstName}
          </h2>
          <div className="mt-2 flex items-center gap-2">
            {data?.student && (
              <span className="inline-block rounded-full bg-primary-foreground/20 px-3 py-0.5 text-xs font-medium">
                {LEVEL_LABELS[data.student.skill_level] || data.student.skill_level}
              </span>
            )}
            {(data?.streak ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/20 px-3 py-0.5 text-xs font-medium">
                <Flame className="h-3 w-3" />
                {data!.streak} sem. seguidas
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Financial Alert */}
      {(data?.pendingTotal ?? 0) > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Card className="border-destructive/40 bg-destructive/5 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate('/aluno/faturas')}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {data!.pendingInvoiceCount} fatura{data!.pendingInvoiceCount > 1 ? 's' : ''} pendente{data!.pendingInvoiceCount > 1 ? 's' : ''}
                  </p>
                  <p className="text-lg font-bold text-destructive">{formatCurrency(data!.pendingTotal)}</p>
                </div>
              </div>
              <Button size="sm" variant="destructive">
                <Receipt className="mr-1.5 h-4 w-4" />
                Pagar
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Grid */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}
        className="grid grid-cols-2 gap-3">
        {/* Attendance Rate */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground capitalize">Presença {monthName}</span>
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold">{data?.attendanceRate ?? 0}%</p>
            <Progress value={data?.attendanceRate ?? 0} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground">
              {data?.confirmedMonth ?? 0} de {data?.totalMonthSessions ?? 0} aulas
            </p>
          </CardContent>
        </Card>

        {/* Skill Progression */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Evolução</span>
              <TrendingUp className="h-4 w-4 text-accent" />
            </div>
            <p className="text-sm font-bold">{LEVEL_LABELS[currentLevel]}</p>
            {currentLevelIdx < LEVEL_ORDER.length - 1 ? (
              <>
                <Progress value={progressToNext} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground">
                  {totalPresent}/{nextThreshold} para {LEVEL_LABELS[LEVEL_ORDER[nextLevelIdx]]}
                </p>
              </>
            ) : (
              <p className="text-[10px] text-primary font-medium">Nível máximo! 🏆</p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Upcoming confirmed sessions */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Próximas Aulas</h3>
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/aluno/aulas')}>
            Ver todas
          </Button>
        </div>
        {!data?.upcomingSessions?.length ? (
          <Card>
            <CardContent className="py-6 text-center">
              <CalendarDays className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma aula confirmada.</p>
              <p className="text-xs text-muted-foreground mt-1">Confirme presença na aba Aulas.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {data.upcomingSessions.map((s: any, i: number) => (
              <motion.div key={s.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.25 + i * 0.06 }}>
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

      {/* Recent Notifications */}
      {data?.notifications && data.notifications.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.3 }}>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground">Notificações</h3>
          </div>
          <div className="space-y-2">
            {data.notifications.map((n: any) => (
              <Card key={n.id} className={n.read_at ? 'opacity-60' : ''}>
                <CardContent className="p-3 flex items-start gap-3">
                  <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${n.read_at ? 'bg-muted-foreground/30' : 'bg-primary'}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

/** Calculate consecutive weeks with attendance (confirmed/present) */
function calculateStreak(attendances: any[]): number {
  const confirmedDates = attendances
    .filter(a => ['confirmed', 'present'].includes(a.status))
    .map(a => a.confirmed_at)
    .filter(Boolean)
    .map(d => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  if (confirmedDates.length === 0) return 0;

  let streak = 1;
  const now = new Date();
  const getWeekNum = (d: Date) => {
    const start = new Date(d.getFullYear(), 0, 1);
    return Math.floor((d.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
  };

  const currentWeek = getWeekNum(now);
  const weeks = [...new Set(confirmedDates.map(d => getWeekNum(d)))].sort((a, b) => b - a);

  if (weeks[0] < currentWeek - 1) return 0;

  for (let i = 1; i < weeks.length; i++) {
    if (weeks[i - 1] - weeks[i] === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
