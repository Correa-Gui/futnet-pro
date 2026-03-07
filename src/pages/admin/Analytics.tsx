import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, DollarSign, Percent, BarChart3 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

export default function Analytics() {
  const { data } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const now = new Date();
      const months: string[] = [];
      for (let i = 5; i >= 0; i--) {
        months.push(format(subMonths(now, i), 'yyyy-MM'));
      }

      // Fetch all data in parallel
      const [studentsRes, invoicesRes, enrollmentsRes, attendancesRes] = await Promise.all([
        supabase.from('student_profiles').select('id, created_at'),
        supabase.from('invoices').select('amount, discount, status, reference_month, due_date, paid_at'),
        supabase.from('enrollments').select('id, enrolled_at, status'),
        supabase.from('attendances').select('id, status, session_id'),
      ]);

      const students = studentsRes.data || [];
      const invoices = invoicesRes.data || [];
      const enrollments = enrollmentsRes.data || [];
      const attendances = attendancesRes.data || [];

      // Student growth per month
      const studentGrowth = months.map(m => {
        const start = startOfMonth(parseISO(m + '-01'));
        const end = endOfMonth(start);
        const count = students.filter(s => {
          const d = new Date(s.created_at);
          return d <= end;
        }).length;
        const newStudents = students.filter(s => {
          const d = new Date(s.created_at);
          return d >= start && d <= end;
        }).length;
        return {
          month: format(start, 'MMM/yy', { locale: ptBR }),
          total: count,
          novos: newStudents,
        };
      });

      // Revenue vs Pending per month
      const revenueData = months.map(m => {
        const monthInvoices = invoices.filter(i => i.reference_month === m);
        const paid = monthInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount) - Number(i.discount || 0), 0);
        const pending = monthInvoices.filter(i => ['pending', 'overdue'].includes(i.status)).reduce((s, i) => s + Number(i.amount) - Number(i.discount || 0), 0);
        return {
          month: format(parseISO(m + '-01'), 'MMM/yy', { locale: ptBR }),
          recebido: paid,
          pendente: pending,
        };
      });

      // Default rate
      const totalInvoices = invoices.length;
      const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;
      const defaultRate = totalInvoices > 0 ? ((overdueInvoices / totalInvoices) * 100).toFixed(1) : '0';

      // Attendance rate
      const totalAttendances = attendances.length;
      const presentAttendances = attendances.filter(a => ['present', 'confirmed'].includes(a.status)).length;
      const attendanceRate = totalAttendances > 0 ? ((presentAttendances / totalAttendances) * 100).toFixed(1) : '0';

      // Active enrollments
      const activeEnrollments = enrollments.filter(e => e.status === 'active').length;

      // Churn: cancelled enrollments in last 30 days
      const cancelledEnrollments = enrollments.filter(e => e.status === 'cancelled').length;
      const churnRate = (activeEnrollments + cancelledEnrollments) > 0
        ? ((cancelledEnrollments / (activeEnrollments + cancelledEnrollments)) * 100).toFixed(1)
        : '0';

      // Revenue per student (ARPU)
      const totalPaidRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount) - Number(i.discount || 0), 0);
      const arpu = students.length > 0 ? totalPaidRevenue / students.length : 0;

      // Current month vs previous
      const currentMonth = months[5];
      const prevMonth = months[4];
      const currentRevenue = invoices.filter(i => i.reference_month === currentMonth && i.status === 'paid').reduce((s, i) => s + Number(i.amount) - Number(i.discount || 0), 0);
      const prevRevenue = invoices.filter(i => i.reference_month === prevMonth && i.status === 'paid').reduce((s, i) => s + Number(i.amount) - Number(i.discount || 0), 0);
      const revenueChange = prevRevenue > 0 ? (((currentRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1) : null;

      const currentNewStudents = studentGrowth[5]?.novos || 0;
      const prevNewStudents = studentGrowth[4]?.novos || 0;
      const studentChange = prevNewStudents > 0 ? (((currentNewStudents - prevNewStudents) / prevNewStudents) * 100).toFixed(1) : null;

      return {
        studentGrowth,
        revenueData,
        defaultRate,
        attendanceRate,
        activeEnrollments,
        churnRate,
        arpu,
        totalStudents: students.length,
        currentNewStudents,
        revenueChange,
        studentChange,
        currentRevenue,
      };
    },
  });

  const d = data || {
    studentGrowth: [], revenueData: [], defaultRate: '0', attendanceRate: '0',
    activeEnrollments: 0, churnRate: '0', arpu: 0, totalStudents: 0,
    currentNewStudents: 0, revenueChange: null, studentChange: null, currentRevenue: 0,
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
          <MetricCard
            title="Total de Alunos"
            value={d.totalStudents}
            sub="alunos cadastrados"
            icon={Users}
            trend={d.studentChange ? `${d.studentChange}%` : undefined}
            trendUp={d.studentChange ? Number(d.studentChange) >= 0 : undefined}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <MetricCard
            title="Receita Mensal"
            value={formatCurrency(d.currentRevenue)}
            sub="mês atual"
            icon={DollarSign}
            trend={d.revenueChange ? `${d.revenueChange}%` : undefined}
            trendUp={d.revenueChange ? Number(d.revenueChange) >= 0 : undefined}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <MetricCard
            title="Taxa de Presença"
            value={`${d.attendanceRate}%`}
            sub="confirmados/presentes"
            icon={Percent}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <MetricCard
            title="Inadimplência"
            value={`${d.defaultRate}%`}
            sub="faturas vencidas"
            icon={BarChart3}
          />
        </motion.div>
      </div>

      {/* Student Growth Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Crescimento de Alunos</CardTitle>
            <CardDescription>Evolução total e novos alunos por mês</CardDescription>
          </CardHeader>
          <CardContent>
            {d.studentGrowth.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados suficientes.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={d.studentGrowth}>
                  <defs>
                    <linearGradient id="gradStudents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CustomTooltipStyle} />
                  <Legend iconType="circle" iconSize={8} />
                  <Area type="monotone" dataKey="total" name="Total" stroke="hsl(217, 91%, 60%)" strokeWidth={2.5} fill="url(#gradStudents)" dot={{ r: 4, strokeWidth: 2, stroke: 'hsl(var(--card))' }} />
                  <Area type="monotone" dataKey="novos" name="Novos" stroke="hsl(142, 76%, 36%)" strokeWidth={2} fill="none" dot={{ r: 3, strokeWidth: 2, stroke: 'hsl(var(--card))' }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Revenue breakdown */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receita vs Pendente</CardTitle>
            <CardDescription>Comparativo mensal de valores recebidos e em aberto</CardDescription>
          </CardHeader>
          <CardContent>
            {d.revenueData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados suficientes.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={d.revenueData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `R$${v}`} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
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

      {/* Bottom metrics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card>
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Novos Alunos por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              {d.studentGrowth.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={d.studentGrowth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={CustomTooltipStyle} />
                    <Line type="monotone" dataKey="novos" name="Novos Alunos" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 5, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--card))' }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
