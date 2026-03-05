import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { motion } from 'framer-motion';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))', 'hsl(var(--secondary))'];

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
    { label: 'Alunos Ativos', value: s.students, sub: 'matriculados', icon: Users, color: 'text-primary' },
    { label: 'Turmas Ativas', value: s.classes, sub: 'em andamento', icon: GraduationCap, color: 'text-primary' },
    { label: 'Receita Total', value: formatCurrency(s.totalRevenue), sub: 'faturas pagas', icon: TrendingUp, color: 'text-primary' },
    { label: 'Em Aberto', value: formatCurrency(s.totalPending), sub: `${s.overdueCount} vencida(s)`, icon: AlertTriangle, color: 'text-destructive', valueColor: 'text-destructive' },
  ];

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
            <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{kpi.label}</CardTitle>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-muted ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${kpi.valueColor || ''}`}>{kpi.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Faturamento Mensal</CardTitle></CardHeader>
          <CardContent>
            {s.monthlyRevenue.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados de faturamento ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={s.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis tickFormatter={v => `R$${v}`} className="text-xs" />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Status das Faturas</CardTitle></CardHeader>
          <CardContent>
            {s.statusDist.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem faturas registradas.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={s.statusDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {s.statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle>Aulas de Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {todaySessions.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">Nenhuma aula agendada para hoje.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todaySessions.map((session: any) => (
                <div key={session.id} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary" />
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
