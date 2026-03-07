import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CalendarDays, ChevronLeft, ChevronRight, Flame, CheckCircle2, XCircle, MinusCircle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths,
  isSameMonth, isToday, parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_COLORS: Record<string, string> = {
  present: 'bg-primary',
  confirmed: 'bg-primary/60',
  absent: 'bg-destructive',
  cancelled: 'bg-muted-foreground/40',
  not_confirmed: 'bg-warning/60',
};

const STATUS_LABELS: Record<string, string> = {
  present: 'Presente',
  confirmed: 'Confirmado',
  absent: 'Faltou',
  cancelled: 'Cancelado',
  not_confirmed: 'Não confirmado',
};

export default function AttendanceHistory() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-history', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: sp } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('user_id', user!.id)
        .single();
      if (!sp) return null;

      const { data: attendances } = await supabase
        .from('attendances')
        .select('id, status, session_id')
        .eq('student_id', sp.id);

      if (!attendances?.length) return { dateMap: {}, total: 0, presentCount: 0, absentCount: 0, streak: 0 };

      const sessionIds = attendances.map(a => a.session_id);
      const { data: sessions } = await supabase
        .from('class_sessions')
        .select('id, date')
        .in('id', sessionIds);

      const sessionDateMap = Object.fromEntries((sessions || []).map(s => [s.id, s.date]));

      // Map date → status (prefer present > confirmed > absent > cancelled > not_confirmed)
      const dateMap: Record<string, string> = {};
      for (const a of attendances) {
        const date = sessionDateMap[a.session_id];
        if (!date) continue;
        const existing = dateMap[date];
        if (!existing || priorityOf(a.status) > priorityOf(existing)) {
          dateMap[date] = a.status;
        }
      }

      const total = attendances.length;
      const presentCount = attendances.filter(a => a.status === 'present').length;
      const absentCount = attendances.filter(a => a.status === 'absent').length;

      // Streak calculation
      const presentDates = Object.entries(dateMap)
        .filter(([, s]) => ['present', 'confirmed'].includes(s))
        .map(([d]) => d)
        .sort()
        .reverse();

      let streak = 0;
      if (presentDates.length > 0) {
        const getWeek = (d: string) => {
          const date = new Date(d);
          const start = new Date(date.getFullYear(), 0, 1);
          return Math.floor((date.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
        };
        const weeks = [...new Set(presentDates.map(getWeek))].sort((a, b) => b - a);
        const now = new Date();
        const currentWeek = getWeek(now.toISOString().split('T')[0]);
        if (weeks[0] >= currentWeek - 1) {
          streak = 1;
          for (let i = 1; i < weeks.length; i++) {
            if (weeks[i - 1] - weeks[i] === 1) streak++;
            else break;
          }
        }
      }

      return { dateMap, total, presentCount, absentCount, streak };
    },
  });

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOffset = getDay(startOfMonth(currentMonth));
  const attendanceRate = data?.total ? Math.round((data.presentCount / data.total) * 100) : 0;

  return (
    <div className="space-y-5 pb-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-lg font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.04em' }}>
          Histórico de Presença
        </h2>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle2 className="mx-auto h-5 w-5 text-primary mb-1" />
            <p className="text-lg font-bold">{data?.presentCount ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Presenças</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <XCircle className="mx-auto h-5 w-5 text-destructive mb-1" />
            <p className="text-lg font-bold">{data?.absentCount ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Faltas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Flame className="mx-auto h-5 w-5 text-warning mb-1" />
            <p className="text-lg font-bold">{data?.streak ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">Semanas</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Attendance rate bar */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Taxa de presença geral</span>
              <span className="font-bold">{attendanceRate}%</span>
            </div>
            <Progress value={attendanceRate} className="h-2" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Calendar */}
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardContent className="p-4">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} className="text-center text-[10px] font-medium text-muted-foreground">{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              {days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const status = data?.dateMap?.[dateStr];
                const today = isToday(day);
                return (
                  <div
                    key={dateStr}
                    className={`aspect-square flex items-center justify-center rounded-lg text-xs relative ${today ? 'ring-1 ring-primary' : ''}`}
                  >
                    {status && (
                      <div className={`absolute inset-1 rounded-md ${STATUS_COLORS[status]} opacity-20`} />
                    )}
                    <span className={`relative z-10 ${status ? 'font-semibold' : 'text-muted-foreground'}`}>
                      {format(day, 'd')}
                    </span>
                    {status && (
                      <div className={`absolute bottom-0.5 h-1.5 w-1.5 rounded-full ${STATUS_COLORS[status]}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-border">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${STATUS_COLORS[key]}`} />
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function priorityOf(status: string): number {
  const map: Record<string, number> = { present: 5, confirmed: 4, absent: 3, cancelled: 2, not_confirmed: 1 };
  return map[status] || 0;
}
