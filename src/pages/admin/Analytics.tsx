import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, DollarSign, Percent, BarChart3 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, Legend, Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { format, subMonths, startOfMonth, endOfMonth, parseISO, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const CustomTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  padding: '8px 12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
};

function MetricCard({ title, value, sub, icon: Icon, trend, trendUp }: {
  title: string; value: string | number; sub: string; icon: any; trend?: string; trendUp?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="flex items-center gap-1.5 mt-1">
          {trend && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
              {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{sub}</span>
        </div>
      </CardContent>
    </Card>
  );
}

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOUR_LABELS = Array.from({ length: 16 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`);

export default function Analytics() {
  const { data } = useQuery({
    queryKey: ['admin-analytics-v2'],
    queryFn: async () => {
      const now = new Date();
      const months: string[] = [];
      for (let i = 5; i >= 0; i--) {
        months.push(format(subMonths(now, i), 'yyyy-MM'));
      }

      const [studentsRes, invoicesRes, enrollmentsRes, attendancesRes, classesRes, sessionsRes, teacherPaymentsRes, teacherProfilesRes, profilesRes, bookingsRes] = await Promise.all([
        supabase.from('student_profiles').select('id, created_at'),
        supabase.from('invoices').select('amount, discount, status, reference_month, due_date, paid_at'),
        supabase.from('enrollments').select('id, enrolled_at, status, class_id, student_id'),
        supabase.from('attendances').select('id, status, session_id, student_id'),
        supabase.from('classes').select('id, name, start_time, end_time, day_of_week, court_id, teacher_id'),
        supabase.from('class_sessions').select('id, class_id, date, status'),
        supabase.from('teacher_payments').select('teacher_id, total_amount, total_classes, reference_month, status'),
        supabase.from('teacher_profiles').select('id, user_id'),
        supabase.from('profiles').select('user_id, full_name'),
        supabase.from('court_bookings').select('id, court_id, date, start_time, end_time, status').neq('status', 'cancelled'),
      ]);

      const students = studentsRes.data || [];
      const invoices = invoicesRes.data || [];
      const enrollments = enrollmentsRes.data || [];
      const attendances = attendancesRes.data || [];
      const classes = classesRes.data || [];
      const sessions = sessionsRes.data || [];
      const teacherPayments = teacherPaymentsRes.data || [];
      const teacherProfiles = teacherProfilesRes.data || [];
      const profiles = profilesRes.data || [];
      const bookings = bookingsRes.data || [];

      // ---- Existing metrics ----
      const studentGrowth = months.map(m => {
        const start = startOfMonth(parseISO(m + '-01'));
        const end = endOfMonth(start);
        const count = students.filter(s => new Date(s.created_at) <= end).length;
        const newStudents = students.filter(s => { const d = new Date(s.created_at); return d >= start && d <= end; }).length;
        return { month: format(start, 'MMM/yy', { locale: ptBR }), total: count, novos: newStudents };
      });

      const revenueData = months.map(m => {
        const mi = invoices.filter(i => i.reference_month === m);
        const paid = mi.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount) - Number(i.discount || 0), 0);
        const pending = mi.filter(i => ['pending', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.amount) - Number(i.discount || 0), 0);
        return { month: format(parseISO(m + '-01'), 'MMM/yy', { locale: ptBR }), recebido: paid, pendente: pending };
      });

      const totalInvoices = invoices.length;
      const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;
      const defaultRate = totalInvoices > 0 ? ((overdueInvoices / totalInvoices) * 100).toFixed(1) : '0';
      const totalAttendances = attendances.length;
      const presentAttendances = attendances.filter(a => ['present', 'confirmed'].includes(a.status)).length;
      const attendanceRate = totalAttendances > 0 ? ((presentAttendances / totalAttendances) * 100).toFixed(1) : '0';
      const activeEnrollments = enrollments.filter(e => e.status === 'active').length;
      const cancelledEnrollments = enrollments.filter(e => e.status === 'cancelled').length;
      const churnRate = (activeEnrollments + cancelledEnrollments) > 0
        ? ((cancelledEnrollments / (activeEnrollments + cancelledEnrollments)) * 100).toFixed(1) : '0';
      const totalPaidRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount) - Number(i.discount || 0), 0);
      const arpu = students.length > 0 ? totalPaidRevenue / students.length : 0;
      const currentMonth = months[5]; const prevMonth = months[4];
      const currentRevenue = invoices.filter(i => i.reference_month === currentMonth && i.status === 'paid').reduce((s, i) => s + Number(i.amount) - Number(i.discount || 0), 0);
      const prevRevenue = invoices.filter(i => i.reference_month === prevMonth && i.status === 'paid').reduce((s, i) => s + Number(i.amount) - Number(i.discount || 0), 0);
      const revenueChange = prevRevenue > 0 ? (((currentRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : null;
      const currentNewStudents = studentGrowth[5]?.novos || 0;
      const prevNewStudents = studentGrowth[4]?.novos || 0;
      const studentChange = prevNewStudents > 0 ? (((currentNewStudents - prevNewStudents) / prevNewStudents) * 100).toFixed(1) : null;

      // ---- NEW: Attendance rate per class (bar chart) ----
      const sessionClassMap = Object.fromEntries(sessions.map(s => [s.id, s.class_id]));
      const classAttendanceMap: Record<string, { present: number; total: number }> = {};
      attendances.forEach(a => {
        const classId = sessionClassMap[a.session_id];
        if (!classId) return;
        if (!classAttendanceMap[classId]) classAttendanceMap[classId] = { present: 0, total: 0 };
        classAttendanceMap[classId].total++;
        if (['present', 'confirmed'].includes(a.status)) classAttendanceMap[classId].present++;
      });
      const attendanceByClass = classes.map(c => ({
        name: c.name.length > 15 ? c.name.slice(0, 15) + '…' : c.name,
        taxa: classAttendanceMap[c.id]
          ? Math.round((classAttendanceMap[c.id].present / classAttendanceMap[c.id].total) * 100)
          : 0,
      })).sort((a, b) => b.taxa - a.taxa).slice(0, 10);

      // ---- NEW: Court occupancy heatmap (day x hour) ----
      const heatmapData: number[][] = Array.from({ length: 7 }, () => Array(16).fill(0));
      // Classes (recurring)
      classes.forEach(c => {
        const startH = parseInt(c.start_time.slice(0, 2), 10);
        const endH = parseInt(c.end_time.slice(0, 2), 10);
        c.day_of_week.forEach((dow: number) => {
          for (let h = startH; h < endH && h - 6 < 16; h++) {
            if (h - 6 >= 0) heatmapData[dow][h - 6]++;
          }
        });
      });
      // Bookings
      bookings.forEach(b => {
        const dow = getDay(parseISO(b.date));
        const startH = parseInt(b.start_time.slice(0, 2), 10);
        const endH = parseInt(b.end_time.slice(0, 2), 10);
        for (let h = startH; h < endH && h - 6 < 16; h++) {
          if (h - 6 >= 0) heatmapData[dow][h - 6]++;
        }
      });
      const maxOccupancy = Math.max(1, ...heatmapData.flat());

      // ---- NEW: Revenue per teacher ----
      const nameMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
      const teacherUserMap = Object.fromEntries(teacherProfiles.map(t => [t.id, t.user_id]));
      const revenueByTeacherMap: Record<string, number> = {};
      teacherPayments.forEach(tp => {
        const userId = teacherUserMap[tp.teacher_id];
        const name = userId ? (nameMap[userId] || 'Professor') : 'Professor';
        revenueByTeacherMap[name] = (revenueByTeacherMap[name] || 0) + Number(tp.total_amount);
      });
      const revenueByTeacher = Object.entries(revenueByTeacherMap)
        .map(([name, total]) => ({ name: name.length > 12 ? name.slice(0, 12) + '…' : name, total }))
        .sort((a, b) => b.total - a.total);

      // ---- NEW: Retention cohort (simplified) ----
      const cohortMonths = months.slice(0, 5); // first 5 months as cohort start
      const cohortData = cohortMonths.map(m => {
        const start = startOfMonth(parseISO(m + '-01'));
        const end = endOfMonth(start);
        const cohortStudents = students.filter(s => {
          const d = new Date(s.created_at);
          return d >= start && d <= end;
        }).map(s => s.id);
        if (cohortStudents.length === 0) return null;

        const activeNow = cohortStudents.filter(id =>
          enrollments.some(e => e.student_id === id && e.status === 'active')
        ).length;
        const retention = Math.round((activeNow / cohortStudents.length) * 100);
        return {
          cohort: format(start, 'MMM/yy', { locale: ptBR }),
          alunos: cohortStudents.length,
          ativos: activeNow,
          retencao: retention,
        };
      }).filter(Boolean);

      return {
        studentGrowth, revenueData, defaultRate, attendanceRate, activeEnrollments, churnRate, arpu,
        totalStudents: students.length, currentNewStudents, revenueChange, studentChange, currentRevenue,
        attendanceByClass, heatmapData, maxOccupancy, revenueByTeacher, cohortData,
      };
    },
  });

  const d = data || {
    studentGrowth: [], revenueData: [], defaultRate: '0', attendanceRate: '0',
    activeEnrollments: 0, churnRate: '0', arpu: 0, totalStudents: 0,
    currentNewStudents: 0, revenueChange: null, studentChange: null, currentRevenue: 0,
    attendanceByClass: [], heatmapData: Array.from({ length: 7 }, () => Array(16).fill(0)),
    maxOccupancy: 1, revenueByTeacher: [], cohortData: [],
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-brand">Analytics</h2>
        <p className="text-sm text-muted-foreground">Análises detalhadas do seu negócio</p>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <MetricCard title="Total de Alunos" value={d.totalStudents} sub="alunos cadastrados" icon={Users}
            trend={d.studentChange ? `${d.studentChange}%` : undefined} trendUp={d.studentChange ? Number(d.studentChange) >= 0 : undefined} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <MetricCard title="Receita Mensal" value={formatCurrency(d.currentRevenue)} sub="mês atual" icon={DollarSign}
            trend={d.revenueChange ? `${d.revenueChange}%` : undefined} trendUp={d.revenueChange ? Number(d.revenueChange) >= 0 : undefined} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <MetricCard title="Taxa de Presença" value={`${d.attendanceRate}%`} sub="confirmados/presentes" icon={Percent} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <MetricCard title="Inadimplência" value={`${d.defaultRate}%`} sub="faturas vencidas" icon={BarChart3} />
        </motion.div>
      </div>

      {/* Row: Attendance by Class + Revenue by Teacher */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Presença por Turma</CardTitle>
              <CardDescription>Taxa de presença (%) das turmas ativas</CardDescription>
            </CardHeader>
            <CardContent>
              {d.attendanceByClass.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={d.attendanceByClass} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CustomTooltipStyle} formatter={(v: number) => `${v}%`} />
                    <Bar dataKey="taxa" name="Presença" radius={[0, 6, 6, 0]}>
                      {d.attendanceByClass.map((_: any, i: number) => (
                        <Cell key={i} fill={d.attendanceByClass[i].taxa >= 70 ? 'hsl(142, 76%, 36%)' : d.attendanceByClass[i].taxa >= 40 ? 'hsl(45, 93%, 47%)' : 'hsl(0, 84%, 60%)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Receita por Professor</CardTitle>
              <CardDescription>Total acumulado de pagamentos registrados</CardDescription>
            </CardHeader>
            <CardContent>
              {d.revenueByTeacher.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={d.revenueByTeacher}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `R$${v}`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CustomTooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="total" name="Total Pago" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Court Occupancy Heatmap */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ocupação de Quadras</CardTitle>
            <CardDescription>Heatmap semanal — turmas fixas + reservas avulsas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Header */}
                <div className="grid gap-0.5" style={{ gridTemplateColumns: `60px repeat(16, 1fr)` }}>
                  <div />
                  {HOUR_LABELS.map(h => (
                    <div key={h} className="text-[10px] text-muted-foreground text-center">{h}</div>
                  ))}
                </div>
                {/* Rows */}
                {[1, 2, 3, 4, 5, 6, 0].map(dow => (
                  <div key={dow} className="grid gap-0.5 mt-0.5" style={{ gridTemplateColumns: `60px repeat(16, 1fr)` }}>
                    <div className="text-xs text-muted-foreground flex items-center justify-end pr-2 font-medium">
                      {DAY_LABELS[dow]}
                    </div>
                    {d.heatmapData[dow].map((val: number, hi: number) => {
                      const intensity = val / d.maxOccupancy;
                      return (
                        <div
                          key={hi}
                          className={cn(
                            'h-7 rounded-sm border border-border/30 flex items-center justify-center text-[9px] font-medium transition-colors',
                            intensity === 0 && 'bg-muted/30',
                          )}
                          style={intensity > 0 ? {
                            backgroundColor: `hsl(var(--primary) / ${Math.max(0.15, intensity * 0.85)})`,
                            color: intensity > 0.5 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                          } : undefined}
                          title={`${DAY_LABELS[dow]} ${HOUR_LABELS[hi]}: ${val} evento(s)`}
                        >
                          {val > 0 ? val : ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Row: Student Growth + Revenue */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Crescimento de Alunos</CardTitle>
              <CardDescription>Evolução total e novos por mês</CardDescription>
            </CardHeader>
            <CardContent>
              {d.studentGrowth.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={d.studentGrowth}>
                    <defs>
                      <linearGradient id="gradSt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={CustomTooltipStyle} />
                    <Legend iconType="circle" iconSize={8} />
                    <Area type="monotone" dataKey="total" name="Total" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#gradSt)" />
                    <Area type="monotone" dataKey="novos" name="Novos" stroke="hsl(142, 76%, 36%)" strokeWidth={2} fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receita vs Pendente</CardTitle>
              <CardDescription>Comparativo mensal</CardDescription>
            </CardHeader>
            <CardContent>
              {d.revenueData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={d.revenueData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `R$${v}`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CustomTooltipStyle} formatter={(v: number) => formatCurrency(v)} />
                    <Legend iconType="circle" iconSize={8} />
                    <Bar dataKey="recebido" name="Recebido" fill="hsl(142, 76%, 36%)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="pendente" name="Pendente" fill="hsl(45, 93%, 47%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Retention Cohort + KPI summary */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Retenção de Alunos (Cohort)</CardTitle>
              <CardDescription>Alunos que entraram em cada mês e permanecem ativos</CardDescription>
            </CardHeader>
            <CardContent>
              {(d.cohortData || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
              ) : (
                <div className="space-y-2">
                  {(d.cohortData || []).map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16 shrink-0 capitalize">{c.cohort}</span>
                      <div className="flex-1 h-8 bg-muted/30 rounded-lg overflow-hidden relative">
                        <div
                          className="h-full rounded-lg transition-all duration-500"
                          style={{
                            width: `${c.retencao}%`,
                            backgroundColor: c.retencao >= 70 ? 'hsl(142, 76%, 36%)' : c.retencao >= 40 ? 'hsl(45, 93%, 47%)' : 'hsl(0, 84%, 60%)',
                          }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold">
                          {c.ativos}/{c.alunos} ({c.retencao}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base">Indicadores-Chave</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Matrículas Ativas', value: d.activeEnrollments, color: 'bg-blue-500' },
                { label: 'Receita por Aluno (ARPU)', value: formatCurrency(d.arpu), color: 'bg-violet-500' },
                { label: 'Taxa de Churn', value: `${d.churnRate}%`, color: 'bg-orange-500' },
                { label: 'Taxa de Presença', value: `${d.attendanceRate}%`, color: 'bg-emerald-500' },
                { label: 'Inadimplência', value: `${d.defaultRate}%`, color: 'bg-red-500' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
