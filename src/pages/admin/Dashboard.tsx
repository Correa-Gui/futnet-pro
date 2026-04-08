import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, GraduationCap, TrendingUp, CalendarDays, Clock, Receipt,
  MapPin, ChevronRight, AlertTriangle, CheckCircle2, Hourglass,
  UserX, Banknote, BarChart3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const pct = (num: number, den: number) =>
  den === 0 ? 0 : Math.round((num / den) * 100);

type SessionItem = {
  id: string;
  date: string;
  className: string;
  start: string;
  end: string;
  courtName: string;
};

type BookingItem = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  price: number | null;
  requester_name: string | null;
  booking_type: string | null;
  courts?: { name: string } | null;
};

type DashboardData = {
  // totais gerais
  students: number;
  studentsWithoutPlan: number;
  classes: number;

  // aulas
  mrr: number;
  aulaPaidAmount: number;
  aulaPaidCount: number;
  aulaPendingAmount: number;
  aulaPendingCount: number;
  aulaOverdueAmount: number;
  aulaOverdueCount: number;

  // aluguéis
  rentalPaidAmount: number;
  rentalPaidCount: number;
  rentalConfirmedAmount: number;
  rentalConfirmedCount: number;
  rentalRequestedAmount: number;
  rentalRequestedCount: number;
  rentalTicketAvg: number;
  rentalUpcoming: BookingItem[];

  // day use
  dayUsePaidAmount: number;
  dayUsePaidCount: number;
  dayUseConfirmedAmount: number;
  dayUseConfirmedCount: number;
  dayUseRequestedAmount: number;
  dayUseRequestedCount: number;
  dayUseTicketAvg: number;
  dayUseToday: number;
  dayUseBookings: BookingItem[];

  sessions: SessionItem[];
};

// ─── sub-components ──────────────────────────────────────────────────────────

function StatCard({
  title, value, description, icon: Icon, highlight = false,
}: {
  title: string; value: string | number; description: string;
  icon: typeof Users; highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-destructive/40 bg-destructive/5' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${highlight ? 'text-destructive' : 'text-primary'}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${highlight ? 'text-destructive' : ''}`}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

function MetricRow({
  label, amount, count, icon: Icon, variant = 'default',
}: {
  label: string; amount: number; count: number;
  icon: typeof CheckCircle2; variant?: 'default' | 'warn' | 'danger';
}) {
  const colors: Record<string, string> = {
    default: 'text-emerald-600',
    warn: 'text-amber-600',
    danger: 'text-destructive',
  };
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className={`h-4 w-4 shrink-0 ${colors[variant]}`} />
        <span className="text-sm text-muted-foreground truncate">{label}</span>
        {count > 0 && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0 shrink-0">{count}</Badge>
        )}
      </div>
      <span className={`font-semibold tabular-nums shrink-0 ${colors[variant]}`}>
        {formatCurrency(amount)}
      </span>
    </div>
  );
}

function BookingCard({ booking, navigate }: { booking: BookingItem; navigate: (p: string) => void }) {
  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    paid: { label: 'Pago', variant: 'default' },
    confirmed: { label: 'Confirmado', variant: 'secondary' },
    requested: { label: 'Solicitado', variant: 'outline' },
  };
  const s = statusMap[booking.status] ?? { label: booking.status, variant: 'secondary' };
  const parsed = parseISO(booking.date);
  const dateLabel = isToday(parsed) ? 'Hoje' : isTomorrow(parsed) ? 'Amanhã' : format(parsed, 'dd/MM', { locale: ptBR });

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={s.variant}>{s.label}</Badge>
            <h4 className="text-sm font-semibold truncate">{booking.requester_name || 'Sem nome'}</h4>
          </div>
          <p className="text-sm text-muted-foreground mt-1.5">
            {dateLabel} • {booking.start_time.slice(0, 5)} – {booking.end_time.slice(0, 5)}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3" />
            {booking.courts?.name || 'Quadra'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold">{formatCurrency(Number(booking.price || 0))}</p>
          <Button variant="ghost" size="sm" className="mt-1 h-7 text-xs px-2" onClick={() => navigate('/admin/agendamentos')}>
            Ver
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const monthRef = format(new Date(), 'yyyy-MM');
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data } = useQuery<DashboardData>({
    queryKey: ['admin-dashboard-rich'],
    queryFn: async () => {
      const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');

      const [studentsRes, studentsNoPlanRes, classesRes, invoicesRes, bookingsRes, sessionsRes, mrrRes] =
        await Promise.all([
          supabase.from('student_profiles').select('id', { count: 'exact', head: true }),
          supabase
            .from('student_profiles')
            .select('id', { count: 'exact', head: true })
            .is('plan_id', null),
          supabase
            .from('classes')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active'),
          supabase
            .from('invoices')
            .select('amount, discount, status, reference_month'),
          supabase
            .from('court_bookings')
            .select('id, date, start_time, end_time, status, price, requester_name, booking_type, courts(name)')
            .gte('date', today)
            .order('date', { ascending: true })
            .order('start_time', { ascending: true }),
          supabase
            .from('class_sessions')
            .select('id, date, classes(name, start_time, end_time, courts(name))')
            .in('date', [today, tomorrow])
            .order('date', { ascending: true }),
          supabase
            .from('student_profiles')
            .select('plans(monthly_price)')
            .not('plan_id', 'is', null),
        ]);

      // MRR
      const mrr = (mrrRes.data || []).reduce((sum, sp: any) => {
        return sum + Number(sp.plans?.monthly_price || 0);
      }, 0);

      // Invoices
      const allInvoices = invoicesRes.data || [];
      const thisMonthInvoices = allInvoices.filter((i) => i.reference_month === monthRef);
      const paidThisMonth = thisMonthInvoices.filter((i) => i.status === 'paid');
      const pendingThisMonth = thisMonthInvoices.filter((i) => i.status === 'pending');
      const overdueAll = allInvoices.filter((i) => i.status === 'overdue');

      const invoiceAmount = (list: typeof allInvoices) =>
        list.reduce((s, i) => s + Number(i.amount) - Number(i.discount || 0), 0);

      // Bookings by type
      const bookings = (bookingsRes.data || []) as unknown as BookingItem[];

      const rentals = bookings.filter((b) => b.booking_type === 'rental');
      const dayUses = bookings.filter((b) => b.booking_type === 'day_use');

      const byStatus = (list: BookingItem[], status: string) =>
        list.filter((b) => b.status === status);
      const bookingAmount = (list: BookingItem[]) =>
        list.reduce((s, b) => s + Number(b.price || 0), 0);
      const ticketAvg = (list: BookingItem[]) =>
        list.length === 0 ? 0 : bookingAmount(list) / list.length;

      const rentalPaid = byStatus(rentals, 'paid');
      const rentalConfirmed = byStatus(rentals, 'confirmed');
      const rentalRequested = byStatus(rentals, 'requested');

      const dayUsePaid = byStatus(dayUses, 'paid');
      const dayUseConfirmed = byStatus(dayUses, 'confirmed');
      const dayUseRequested = byStatus(dayUses, 'requested');

      const sessions = ((sessionsRes.data || []) as any[]).map((s) => ({
        id: s.id,
        date: s.date,
        className: s.classes?.name || 'Aula',
        start: s.classes?.start_time || '',
        end: s.classes?.end_time || '',
        courtName: s.classes?.courts?.name || 'Quadra',
      }));

      return {
        students: studentsRes.count || 0,
        studentsWithoutPlan: studentsNoPlanRes.count || 0,
        classes: classesRes.count || 0,

        mrr,
        aulaPaidAmount: invoiceAmount(paidThisMonth),
        aulaPaidCount: paidThisMonth.length,
        aulaPendingAmount: invoiceAmount(pendingThisMonth),
        aulaPendingCount: pendingThisMonth.length,
        aulaOverdueAmount: invoiceAmount(overdueAll),
        aulaOverdueCount: overdueAll.length,

        rentalPaidAmount: bookingAmount(rentalPaid),
        rentalPaidCount: rentalPaid.length,
        rentalConfirmedAmount: bookingAmount(rentalConfirmed),
        rentalConfirmedCount: rentalConfirmed.length,
        rentalRequestedAmount: bookingAmount(rentalRequested),
        rentalRequestedCount: rentalRequested.length,
        rentalTicketAvg: ticketAvg([...rentalPaid, ...rentalConfirmed]),
        rentalUpcoming: rentals.slice(0, 6),

        dayUsePaidAmount: bookingAmount(dayUsePaid),
        dayUsePaidCount: dayUsePaid.length,
        dayUseConfirmedAmount: bookingAmount(dayUseConfirmed),
        dayUseConfirmedCount: dayUseConfirmed.length,
        dayUseRequestedAmount: bookingAmount(dayUseRequested),
        dayUseRequestedCount: dayUseRequested.length,
        dayUseTicketAvg: ticketAvg([...dayUsePaid, ...dayUseConfirmed]),
        dayUseToday: dayUses.filter((b) => b.date === today).length,
        dayUseBookings: dayUses.slice(0, 6),

        sessions,
      };
    },
  });

  const d = data ?? {
    students: 0, studentsWithoutPlan: 0, classes: 0,
    mrr: 0,
    aulaPaidAmount: 0, aulaPaidCount: 0,
    aulaPendingAmount: 0, aulaPendingCount: 0,
    aulaOverdueAmount: 0, aulaOverdueCount: 0,
    rentalPaidAmount: 0, rentalPaidCount: 0,
    rentalConfirmedAmount: 0, rentalConfirmedCount: 0,
    rentalRequestedAmount: 0, rentalRequestedCount: 0,
    rentalTicketAvg: 0, rentalUpcoming: [],
    dayUsePaidAmount: 0, dayUsePaidCount: 0,
    dayUseConfirmedAmount: 0, dayUseConfirmedCount: 0,
    dayUseRequestedAmount: 0, dayUseRequestedCount: 0,
    dayUseTicketAvg: 0, dayUseToday: 0, dayUseBookings: [],
    sessions: [],
  };

  const totalReceived = d.aulaPaidAmount + d.rentalPaidAmount + d.dayUsePaidAmount;
  const totalPending = d.aulaPendingAmount + d.rentalConfirmedAmount + d.dayUseConfirmedAmount;
  const collectionRate = pct(d.aulaPaidAmount, d.mrr);

  const formatDateLabel = (date: string) => {
    const p = parseISO(date);
    if (isToday(p)) return 'Hoje';
    if (isTomorrow(p)) return 'Amanhã';
    return format(p, 'dd/MM', { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-brand">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <Button onClick={() => navigate('/admin/agendamentos')}>
          <CalendarDays className="mr-2 h-4 w-4" />
          Abrir agenda
        </Button>
      </div>

      {/* Top stat cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Alunos" value={d.students} description="ativos na base" icon={Users} />
        <StatCard title="Turmas ativas" value={d.classes} description="em andamento" icon={GraduationCap} />
        <StatCard
          title="Recebido este mês"
          value={formatCurrency(totalReceived)}
          description="aulas + quadra + day use"
          icon={TrendingUp}
        />
        <StatCard
          title="Em atraso"
          value={formatCurrency(d.aulaOverdueAmount)}
          description={`${d.aulaOverdueCount} fatura${d.aulaOverdueCount !== 1 ? 's' : ''} vencida${d.aulaOverdueCount !== 1 ? 's' : ''}`}
          icon={AlertTriangle}
          highlight={d.aulaOverdueCount > 0}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Visão por processo</h3>
            <p className="text-sm text-muted-foreground">Métricas detalhadas de aulas, aluguéis e day use.</p>
          </div>
          <TabsList className="grid w-full grid-cols-4 lg:w-[520px]">
            <TabsTrigger value="overview">Geral</TabsTrigger>
            <TabsTrigger value="classes">Aulas</TabsTrigger>
            <TabsTrigger value="rental">Aluguéis</TabsTrigger>
            <TabsTrigger value="dayuse">Day Use</TabsTrigger>
          </TabsList>
        </div>

        {/* ── GERAL ── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Receita consolidada */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Receita consolidada
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground font-medium mb-3 grid grid-cols-3 gap-2 text-right">
                  <span className="text-left">Processo</span>
                  <span>Recebido</span>
                  <span>Pendente</span>
                </div>
                {[
                  { label: 'Aulas', paid: d.aulaPaidAmount, pending: d.aulaPendingAmount },
                  { label: 'Aluguéis', paid: d.rentalPaidAmount, pending: d.rentalConfirmedAmount },
                  { label: 'Day Use', paid: d.dayUsePaidAmount, pending: d.dayUseConfirmedAmount },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-3 gap-2 rounded-lg border px-3 py-2.5 text-sm">
                    <span className="font-medium">{row.label}</span>
                    <span className="text-right font-semibold text-emerald-600 tabular-nums">
                      {formatCurrency(row.paid)}
                    </span>
                    <span className="text-right text-amber-600 tabular-nums">
                      {formatCurrency(row.pending)}
                    </span>
                  </div>
                ))}
                <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-sm mt-2">
                  <span className="font-bold">Total</span>
                  <span className="text-right font-bold text-emerald-600 tabular-nums">
                    {formatCurrency(totalReceived)}
                  </span>
                  <span className="text-right font-bold text-amber-600 tabular-nums">
                    {formatCurrency(totalPending)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Próximas aulas */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Próximas aulas</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/presenca')}>
                  Presença <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {d.sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma aula agendada para hoje ou amanhã.</p>
                ) : (
                  <div className="space-y-3">
                    {d.sessions.map((s) => (
                      <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={isToday(parseISO(s.date)) ? 'default' : 'secondary'}>
                              {formatDateLabel(s.date)}
                            </Badge>
                            <p className="text-sm font-medium truncate">{s.className}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {s.start.slice(0, 5)} – {s.end.slice(0, 5)} • {s.courtName}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/turmas')}>
                          Ver turma
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── AULAS ── */}
        <TabsContent value="classes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard title="MRR esperado" value={formatCurrency(d.mrr)} description="soma dos planos ativos" icon={Banknote} />
            <StatCard title="Recebido este mês" value={formatCurrency(d.aulaPaidAmount)} description={`${d.aulaPaidCount} fatura${d.aulaPaidCount !== 1 ? 's' : ''} paga${d.aulaPaidCount !== 1 ? 's' : ''}`} icon={CheckCircle2} />
            <StatCard title="A receber" value={formatCurrency(d.aulaPendingAmount)} description={`${d.aulaPendingCount} pendente${d.aulaPendingCount !== 1 ? 's' : ''} este mês`} icon={Hourglass} />
            <StatCard
              title="Em atraso"
              value={formatCurrency(d.aulaOverdueAmount)}
              description={`${d.aulaOverdueCount} fatura${d.aulaOverdueCount !== 1 ? 's' : ''} vencida${d.aulaOverdueCount !== 1 ? 's' : ''}`}
              icon={AlertTriangle}
              highlight={d.aulaOverdueCount > 0}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Taxa de cobrança */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Taxa de cobrança mensal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold">{collectionRate}%</p>
                    <p className="text-sm text-muted-foreground">do MRR recebido</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{formatCurrency(d.aulaPaidAmount)} de {formatCurrency(d.mrr)}</p>
                  </div>
                </div>
                <Progress value={collectionRate} className="h-2" />
                <div className="space-y-2">
                  <MetricRow label="Recebido este mês" amount={d.aulaPaidAmount} count={d.aulaPaidCount} icon={CheckCircle2} variant="default" />
                  <MetricRow label="A receber (este mês)" amount={d.aulaPendingAmount} count={d.aulaPendingCount} icon={Hourglass} variant="warn" />
                  <MetricRow label="Em atraso (total)" amount={d.aulaOverdueAmount} count={d.aulaOverdueCount} icon={AlertTriangle} variant="danger" />
                </div>
              </CardContent>
            </Card>

            {/* Alunos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Base de alunos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-bold">{d.students}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total de alunos</p>
                  </div>
                  <div className={`rounded-lg border p-3 text-center ${d.studentsWithoutPlan > 0 ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : ''}`}>
                    <p className={`text-2xl font-bold ${d.studentsWithoutPlan > 0 ? 'text-amber-600' : ''}`}>{d.studentsWithoutPlan}</p>
                    <p className="text-xs text-muted-foreground mt-1">Sem plano</p>
                  </div>
                </div>
                <div className="rounded-lg border p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Turmas ativas</span>
                  </div>
                  <span className="font-semibold">{d.classes}</span>
                </div>
                <div className="rounded-lg border p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">Sessões hoje/amanhã</span>
                  </div>
                  <span className="font-semibold">{d.sessions.length}</span>
                </div>
                {d.studentsWithoutPlan > 0 && (
                  <Button variant="outline" size="sm" className="w-full gap-2 text-amber-600 border-amber-300" onClick={() => navigate('/admin/alunos')}>
                    <UserX className="h-4 w-4" />
                    Ver alunos sem plano
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Agenda */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Agenda de aulas — hoje e amanhã</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/presenca')}>
                Registrar presença <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {d.sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem sessões agendadas para hoje ou amanhã.</p>
              ) : (
                <div className="space-y-3">
                  {d.sessions.map((s) => (
                    <div key={s.id} className="rounded-xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={isToday(parseISO(s.date)) ? 'default' : 'secondary'}>
                              {formatDateLabel(s.date)}
                            </Badge>
                            <h4 className="text-sm font-semibold">{s.className}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            {s.start.slice(0, 5)} – {s.end.slice(0, 5)}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {s.courtName}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate('/admin/presenca')}>
                          Presença
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── ALUGUÉIS ── */}
        <TabsContent value="rental" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard title="Receita paga" value={formatCurrency(d.rentalPaidAmount)} description={`${d.rentalPaidCount} reserva${d.rentalPaidCount !== 1 ? 's' : ''} paga${d.rentalPaidCount !== 1 ? 's' : ''}`} icon={CheckCircle2} />
            <StatCard title="Confirmados" value={formatCurrency(d.rentalConfirmedAmount)} description={`${d.rentalConfirmedCount} a pagar`} icon={Hourglass} />
            <StatCard title="Aguardando" value={formatCurrency(d.rentalRequestedAmount)} description={`${d.rentalRequestedCount} solicitação${d.rentalRequestedCount !== 1 ? 'ões' : ''}`} icon={Clock} />
            <StatCard title="Ticket médio" value={formatCurrency(d.rentalTicketAvg)} description="por reserva confirmada" icon={Receipt} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo de aluguéis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <MetricRow label="Pago" amount={d.rentalPaidAmount} count={d.rentalPaidCount} icon={CheckCircle2} variant="default" />
                <MetricRow label="Confirmado (a pagar)" amount={d.rentalConfirmedAmount} count={d.rentalConfirmedCount} icon={Hourglass} variant="warn" />
                <MetricRow label="Solicitado" amount={d.rentalRequestedAmount} count={d.rentalRequestedCount} icon={Clock} />
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Pipeline total</span>
                    <span className="font-bold">
                      {formatCurrency(d.rentalPaidAmount + d.rentalConfirmedAmount + d.rentalRequestedAmount)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Próximos aluguéis</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/agendamentos')}>
                  Ver agenda <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {d.rentalUpcoming.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum aluguel futuro encontrado.</p>
                ) : (
                  <div className="space-y-3">
                    {d.rentalUpcoming.map((b) => (
                      <BookingCard key={b.id} booking={b} navigate={navigate} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── DAY USE ── */}
        <TabsContent value="dayuse" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard title="Receita paga" value={formatCurrency(d.dayUsePaidAmount)} description={`${d.dayUsePaidCount} reserva${d.dayUsePaidCount !== 1 ? 's' : ''} paga${d.dayUsePaidCount !== 1 ? 's' : ''}`} icon={CheckCircle2} />
            <StatCard title="Confirmados" value={formatCurrency(d.dayUseConfirmedAmount)} description={`${d.dayUseConfirmedCount} a pagar`} icon={Hourglass} />
            <StatCard title="Aguardando" value={formatCurrency(d.dayUseRequestedAmount)} description={`${d.dayUseRequestedCount} solicitação${d.dayUseRequestedCount !== 1 ? 'ões' : ''}`} icon={Clock} />
            <StatCard title="Hoje" value={d.dayUseToday} description={`ticket médio ${formatCurrency(d.dayUseTicketAvg)}`} icon={CalendarDays} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo de day use</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <MetricRow label="Pago" amount={d.dayUsePaidAmount} count={d.dayUsePaidCount} icon={CheckCircle2} variant="default" />
                <MetricRow label="Confirmado (a pagar)" amount={d.dayUseConfirmedAmount} count={d.dayUseConfirmedCount} icon={Hourglass} variant="warn" />
                <MetricRow label="Solicitado" amount={d.dayUseRequestedAmount} count={d.dayUseRequestedCount} icon={Clock} />
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Pipeline total</span>
                    <span className="font-bold">
                      {formatCurrency(d.dayUsePaidAmount + d.dayUseConfirmedAmount + d.dayUseRequestedAmount)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Próximos day use</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/agendamentos')}>
                  Ver agenda <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {d.dayUseBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum day use futuro encontrado.</p>
                ) : (
                  <div className="space-y-3">
                    {d.dayUseBookings.map((b) => (
                      <BookingCard key={b.id} booking={b} navigate={navigate} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
