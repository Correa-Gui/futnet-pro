import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users, GraduationCap, TrendingUp, AlertTriangle, Clock,
  ChevronRight, Plus, UserPlus, Receipt, CalendarDays, AlertCircle,
  UserCheck, MapPin,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const COLORS = ['hsl(142, 76%, 36%)', 'hsl(0, 84%, 60%)', 'hsl(45, 93%, 47%)', 'hsl(220, 14%, 60%)'];

const CustomTooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  padding: '8px 12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
};

interface TodaySession {
  id: string;
  date: string;
  class_id: string;
  status: string;
  class?: { id: string; name: string; start_time: string; end_time: string };
  court?: { name: string };
  confirmedCount: number;
  totalStudents: number;
}

interface PendingAction {
  type: 'overdue_invoice' | 'unassigned_student' | 'pending_attendance' | 'pending_booking';
  count: number;
  label: string;
  icon: typeof AlertCircle;
  color: string;
  route: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const [studentsRes, classesRes, courtsRes, invoicesRes] = await Promise.all([
        supabase.from('student_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('classes').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('courts').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('invoices').select('amount, discount, status, paid_at, reference_month'),
      ]);

      const invoices = invoicesRes.data || [];
      const paidInvoices = invoices.filter(i => i.status === 'paid');
      const pendingInvoices = invoices.filter(i => ['pending', 'overdue'].includes(i.status));
      const overdueInvoices = invoices.filter(i => i.status === 'overdue');

      const totalRevenue = paidInvoices.reduce((s, i) => s + Number(i.amount) - Number(i.discount || 0), 0);
      const totalPending = pendingInvoices.reduce((s, i) => s + Number(i.amount) - Number(i.discount || 0), 0);

      const monthlyMap: Record<string, number> = {};
      paidInvoices.forEach(i => {
        const month = i.reference_month || 'N/A';
        monthlyMap[month] = (monthlyMap[month] || 0) + Number(i.amount) - Number(i.discount || 0);
      });
      const monthlyRevenue = Object.entries(monthlyMap)
        .map(([month, total]) => ({ month, total }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);

      const statusDist = [
        { name: 'Pago', value: paidInvoices.length },
        { name: 'Vencido', value: overdueInvoices.length },
        { name: 'Pendente', value: invoices.filter(i => i.status === 'pending').length },
        { name: 'Cancelado', value: invoices.filter(i => i.status === 'cancelled').length },
      ].filter(s => s.value > 0);

      return {
        students: studentsRes.count || 0,
        classes: classesRes.count || 0,
        courts: courtsRes.count || 0,
        totalRevenue,
        totalPending,
        overdueCount: overdueInvoices.length,
        monthlyRevenue,
        statusDist,
      };
    },
  });

  // Pending actions query
  const { data: pendingActions = [] } = useQuery<PendingAction[]>({
    queryKey: ['admin-pending-actions'],
    queryFn: async () => {
      const actions: PendingAction[] = [];

      // Overdue invoices
      const { count: overdueCount } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'overdue');
      if (overdueCount && overdueCount > 0) {
        actions.push({
          type: 'overdue_invoice',
          count: overdueCount,
          label: `${overdueCount} fatura${overdueCount > 1 ? 's' : ''} vencida${overdueCount > 1 ? 's' : ''}`,
          icon: Receipt,
          color: 'text-red-500 bg-red-500/10',
          route: '/admin/faturas',
        });
      }

      // Students without classes
      const { data: allStudents } = await supabase.from('student_profiles').select('id');
      const { data: enrolledStudents } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('status', 'active');
      const enrolledIds = new Set((enrolledStudents || []).map(e => e.student_id));
      const unassigned = (allStudents || []).filter(s => !enrolledIds.has(s.id)).length;
      if (unassigned > 0) {
        actions.push({
          type: 'unassigned_student',
          count: unassigned,
          label: `${unassigned} aluno${unassigned > 1 ? 's' : ''} sem turma`,
          icon: UserPlus,
          color: 'text-amber-500 bg-amber-500/10',
          route: '/admin/alunos',
        });
      }

      // Pending bookings
      const { count: pendingBookings } = await supabase
        .from('court_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'requested');
      if (pendingBookings && pendingBookings > 0) {
        actions.push({
          type: 'pending_booking',
          count: pendingBookings,
          label: `${pendingBookings} agendamento${pendingBookings > 1 ? 's' : ''} pendente${pendingBookings > 1 ? 's' : ''}`,
          icon: CalendarDays,
          color: 'text-blue-500 bg-blue-500/10',
          route: '/admin/agendamentos',
        });
      }

      // Today's unconfirmed attendances
      const today = new Date().toISOString().split('T')[0];
      const { data: todaySessIds } = await supabase
        .from('class_sessions')
        .select('id')
        .eq('date', today)
        .eq('status', 'scheduled');
      if (todaySessIds && todaySessIds.length > 0) {
        const sessIds = todaySessIds.map(s => s.id);
        const { count: unconfirmed } = await supabase
          .from('attendances')
          .select('id', { count: 'exact', head: true })
          .in('session_id', sessIds)
          .eq('status', 'not_confirmed');
        if (unconfirmed && unconfirmed > 0) {
          actions.push({
            type: 'pending_attendance',
            count: unconfirmed,
            label: `${unconfirmed} presença${unconfirmed > 1 ? 's' : ''} não confirmada${unconfirmed > 1 ? 's' : ''}`,
            icon: UserCheck,
            color: 'text-orange-500 bg-orange-500/10',
            route: '/admin/presenca',
          });
        }
      }

      return actions;
    },
  });

  // Today + tomorrow sessions with attendance counts
  const { data: upcomingSessions = [] } = useQuery<TodaySession[]>({
    queryKey: ['admin-upcoming-sessions'],
    queryFn: async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dates = [
        format(today, 'yyyy-MM-dd'),
        format(tomorrow, 'yyyy-MM-dd'),
      ];

      const { data: sessions } = await supabase
        .from('class_sessions')
        .select('id, date, class_id, status')
        .in('date', dates)
        .order('date');

      if (!sessions || sessions.length === 0) return [];

      const classIds = [...new Set(sessions.map(s => s.class_id))];
      const sessionIds = sessions.map(s => s.id);

      const [classesRes, attendancesRes] = await Promise.all([
        supabase.from('classes').select('id, name, start_time, end_time, court_id, max_students').in('id', classIds),
        supabase.from('attendances').select('session_id, status').in('session_id', sessionIds),
      ]);

      const classMap = Object.fromEntries((classesRes.data || []).map(c => [c.id, c]));

      // Get court names
      const courtIds = [...new Set((classesRes.data || []).map(c => c.court_id))];
      const { data: courts } = await supabase.from('courts').select('id, name').in('id', courtIds);
      const courtMap = Object.fromEntries((courts || []).map(c => [c.id, c]));

      // Count confirmed per session
      const attendanceMap: Record<string, { confirmed: number; total: number }> = {};
      (attendancesRes.data || []).forEach(a => {
        if (!attendanceMap[a.session_id]) attendanceMap[a.session_id] = { confirmed: 0, total: 0 };
        attendanceMap[a.session_id].total++;
        if (['confirmed', 'present'].includes(a.status)) attendanceMap[a.session_id].confirmed++;
      });

      return sessions.map(s => {
        const cls = classMap[s.class_id];
        return {
          ...s,
          class: cls ? { id: cls.id, name: cls.name, start_time: cls.start_time, end_time: cls.end_time } : undefined,
          court: cls ? courtMap[cls.court_id] : undefined,
          confirmedCount: attendanceMap[s.id]?.confirmed || 0,
          totalStudents: cls?.max_students || 0,
        };
      }).sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.class?.start_time || '').localeCompare(b.class?.start_time || '');
      });
    },
  });

  const s = stats || { students: 0, classes: 0, courts: 0, totalRevenue: 0, totalPending: 0, overdueCount: 0, monthlyRevenue: [], statusDist: [] };

  const kpis = [
    { label: 'Alunos Ativos', value: s.students, sub: 'matriculados', icon: Users, gradient: 'from-blue-500/10 to-blue-600/5', iconBg: 'bg-blue-500/15 text-blue-600' },
    { label: 'Turmas Ativas', value: s.classes, sub: 'em andamento', icon: GraduationCap, gradient: 'from-emerald-500/10 to-emerald-600/5', iconBg: 'bg-emerald-500/15 text-emerald-600' },
    { label: 'Receita Total', value: formatCurrency(s.totalRevenue), sub: 'faturas pagas', icon: TrendingUp, gradient: 'from-violet-500/10 to-violet-600/5', iconBg: 'bg-violet-500/15 text-violet-600' },
    { label: 'Em Aberto', value: formatCurrency(s.totalPending), sub: `${s.overdueCount} vencida(s)`, icon: AlertTriangle, gradient: 'from-red-500/10 to-red-600/5', iconBg: 'bg-red-500/15 text-red-600', valueColor: 'text-destructive' },
  ];

  const renderCustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
    cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number;
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    if (percent < 0.05) return null;
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const formatSessionDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "EEE, dd MMM", { locale: ptBR });
  };

  // Group sessions by date
  const sessionsByDate = upcomingSessions.reduce<Record<string, TodaySession[]>>((acc, session) => {
    const date = session.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(session);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header with quick actions */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate('/admin/alunos')}>
            <UserPlus className="mr-1.5 h-4 w-4" />Novo Aluno
          </Button>
          <Button size="sm" onClick={() => navigate('/admin/turmas')}>
            <Plus className="mr-1.5 h-4 w-4" />Nova Turma
          </Button>
        </div>
      </div>

      {/* Pending Actions Banner */}
      {pendingActions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400">
              Ações Pendentes ({pendingActions.length})
            </h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {pendingActions.map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.route)}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-left hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${action.color}`}>
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{action.label}</p>
                  <p className="text-xs text-muted-foreground">Clique para resolver</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08, ease: 'easeOut' }}
          >
            <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-60`} />
              <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${kpi.iconBg}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className={`text-2xl font-bold tracking-tight ${kpi.valueColor || ''}`}>{kpi.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main content: Sessions timeline + Chart */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Upcoming sessions timeline */}
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Próximas Aulas</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/agendamentos')}>
                Ver tudo <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {Object.keys(sessionsByDate).length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhuma aula agendada.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(sessionsByDate).map(([date, sessions]) => (
                    <div key={date}>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={isToday(parseISO(date)) ? 'default' : 'secondary'} className="text-xs">
                          {formatSessionDate(date)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{sessions.length} aula{sessions.length > 1 ? 's' : ''}</span>
                      </div>
                      <div className="space-y-1.5 border-l-2 border-border pl-4 ml-1">
                        {sessions.map(session => (
                          <div
                            key={session.id}
                            className="relative flex items-center gap-3 rounded-lg p-2.5 hover:bg-muted/50 transition-colors group cursor-pointer"
                            onClick={() => navigate('/admin/presenca')}
                          >
                            <div className="absolute -left-[21px] top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{session.class?.name || 'Aula'}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground font-mono">
                                  {session.class?.start_time?.slice(0, 5)} - {session.class?.end_time?.slice(0, 5)}
                                </span>
                                {session.court && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                    <MapPin className="h-3 w-3" />
                                    {session.court.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className={`text-xs font-medium ${session.confirmedCount > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                  {session.confirmedCount}/{session.totalStudents}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Revenue chart */}
        <motion.div className="lg:col-span-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Faturamento Mensal</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/analytics')}>
                Analytics <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {s.monthlyRevenue.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados de faturamento ainda.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={s.monthlyRevenue}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `R$${v}`} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={CustomTooltipStyle} formatter={(v: number) => [formatCurrency(v), 'Receita']} />
                    <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#colorRevenue)" dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--card))' }} activeDot={{ r: 6, strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom: Invoice status pie + Quick links */}
      <div className="grid gap-6 lg:grid-cols-5">
        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card className="h-full">
            <CardHeader><CardTitle className="text-base">Status das Faturas</CardTitle></CardHeader>
            <CardContent>
              {s.statusDist.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem faturas registradas.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={s.statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} labelLine={false} label={renderCustomPieLabel}>
                      {s.statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip contentStyle={CustomTooltipStyle} />
                    <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-sm text-foreground">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div className="lg:col-span-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card className="h-full">
            <CardHeader><CardTitle className="text-base">Acesso Rápido</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Gerenciar Alunos', desc: `${s.students} cadastrados`, icon: Users, route: '/admin/alunos', color: 'text-blue-600 bg-blue-500/10' },
                  { label: 'Gerenciar Turmas', desc: `${s.classes} ativas`, icon: GraduationCap, route: '/admin/turmas', color: 'text-emerald-600 bg-emerald-500/10' },
                  { label: 'Faturas', desc: `${s.overdueCount} vencida(s)`, icon: Receipt, route: '/admin/faturas', color: 'text-violet-600 bg-violet-500/10' },
                  { label: 'Agendamentos', desc: 'Calendário semanal', icon: CalendarDays, route: '/admin/agendamentos', color: 'text-amber-600 bg-amber-500/10' },
                  { label: 'Quadras', desc: `${s.courts} ativa(s)`, icon: MapPin, route: '/admin/quadras', color: 'text-cyan-600 bg-cyan-500/10' },
                  { label: 'Presença', desc: 'Registro diário', icon: UserCheck, route: '/admin/presenca', color: 'text-orange-600 bg-orange-500/10' },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(item.route)}
                    className="flex items-center gap-3 rounded-xl border border-border p-3 text-left hover:shadow-md hover:border-primary/20 transition-all duration-200 group"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${item.color}`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
