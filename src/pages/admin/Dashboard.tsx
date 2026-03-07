import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { motion } from 'framer-motion';

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

export default function AdminDashboard() {
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

  const { data: todaySessions = [] } = useQuery({
    queryKey: ['admin-today-sessions'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('class_sessions')
        .select('id, date, class_id, status')
        .eq('date', today);

      if (!data || data.length === 0) return [];
      const classIds = data.map(s => s.class_id);
      const { data: classes } = await supabase.from('classes').select('id, name, start_time, end_time').in('id', classIds);
      const classMap = Object.fromEntries((classes || []).map(c => [c.id, c]));
      return data.map(s => ({ ...s, class: classMap[s.class_id] }));
    },
  });

  const s = stats || { students: 0, classes: 0, courts: 0, totalRevenue: 0, totalPending: 0, overdueCount: 0, monthlyRevenue: [], statusDist: [] };

  const kpis = [
    { label: 'Alunos Ativos', value: s.students, sub: 'matriculados', icon: Users, gradient: 'from-blue-500/10 to-blue-600/5', iconBg: 'bg-blue-500/15 text-blue-600' },
    { label: 'Turmas Ativas', value: s.classes, sub: 'em andamento', icon: GraduationCap, gradient: 'from-emerald-500/10 to-emerald-600/5', iconBg: 'bg-emerald-500/15 text-emerald-600' },
    { label: 'Receita Total', value: formatCurrency(s.totalRevenue), sub: 'faturas pagas', icon: TrendingUp, gradient: 'from-violet-500/10 to-violet-600/5', iconBg: 'bg-violet-500/15 text-violet-600' },
    { label: 'Em Aberto', value: formatCurrency(s.totalPending), sub: `${s.overdueCount} vencida(s)`, icon: AlertTriangle, gradient: 'from-red-500/10 to-red-600/5', iconBg: 'bg-red-500/15 text-red-600', valueColor: 'text-destructive' },
  ];

  const renderCustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>Dashboard</h2>
        <p className="text-sm text-muted-foreground">Visão geral do seu negócio</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.1, ease: 'easeOut' }}
          >
            <Card className={`group relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5`}>
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

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-5">
        <motion.div className="lg:col-span-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }}>
          <Card className="h-full">
            <CardHeader><CardTitle className="text-base">Faturamento Mensal</CardTitle></CardHeader>
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

        <motion.div className="lg:col-span-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.6 }}>
          <Card className="h-full">
            <CardHeader><CardTitle className="text-base">Status das Faturas</CardTitle></CardHeader>
            <CardContent>
              {s.statusDist.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Sem faturas registradas.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={s.statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} labelLine={false} label={renderCustomPieLabel}>
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
      </div>

      {/* Today's sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Aulas de Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {todaySessions.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">Nenhuma aula agendada para hoje.</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {todaySessions.map((session: any) => (
                <div key={session.id} className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                    <p className="text-sm font-medium">{session.class?.name || 'Aula'}</p>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    {session.class?.start_time?.slice(0, 5)} - {session.class?.end_time?.slice(0, 5)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
