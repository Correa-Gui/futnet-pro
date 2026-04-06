import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, GraduationCap, TrendingUp, CalendarDays, Clock, Receipt, MapPin, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

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
  students: number;
  classes: number;
  aulaRevenue: number;
  rentalRevenue: number;
  dayUseRevenue: number;
  dayUsePending: number;
  dayUseToday: number;
  sessions: SessionItem[];
  dayUseBookings: BookingItem[];
};

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: typeof Users;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const { data } = useQuery<DashboardData>({
    queryKey: ['admin-dashboard-tabs'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrow = format(tomorrowDate, 'yyyy-MM-dd');

      const [studentsRes, classesRes, invoicesRes, bookingsRes, sessionsRes] = await Promise.all([
        supabase.from('student_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('classes').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('invoices').select('amount, discount, status'),
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
      ]);

      const paidInvoices = (invoicesRes.data || []).filter((i) => i.status === 'paid');
      const aulaRevenue = paidInvoices.reduce((sum, i) => sum + Number(i.amount) - Number(i.discount || 0), 0);

      const bookings = (bookingsRes.data || []) as unknown as BookingItem[];
      const paidBookings = bookings.filter((b) => b.status === 'paid');
      const rentalRevenue = paidBookings
        .filter((b) => b.booking_type === 'rental')
        .reduce((sum, b) => sum + Number(b.price || 0), 0);
      const dayUseRevenue = paidBookings
        .filter((b) => b.booking_type === 'day_use')
        .reduce((sum, b) => sum + Number(b.price || 0), 0);

      const sessions = ((sessionsRes.data || []) as any[]).map((session) => ({
        id: session.id,
        date: session.date,
        className: session.classes?.name || 'Aula',
        start: session.classes?.start_time || '',
        end: session.classes?.end_time || '',
        courtName: session.classes?.courts?.name || 'Quadra',
      }));

      return {
        students: studentsRes.count || 0,
        classes: classesRes.count || 0,
        aulaRevenue,
        rentalRevenue,
        dayUseRevenue,
        dayUsePending: bookings.filter((b) => b.booking_type === 'day_use' && b.status === 'requested').length,
        dayUseToday: bookings.filter((b) => b.booking_type === 'day_use' && b.date === today).length,
        sessions,
        dayUseBookings: bookings.filter((b) => b.booking_type === 'day_use').slice(0, 6),
      };
    },
  });

  const stats = data || {
    students: 0,
    classes: 0,
    aulaRevenue: 0,
    rentalRevenue: 0,
    dayUseRevenue: 0,
    dayUsePending: 0,
    dayUseToday: 0,
    sessions: [],
    dayUseBookings: [],
  };

  const formatDateLabel = (date: string) => {
    const parsed = parseISO(date);
    if (isToday(parsed)) return 'Hoje';
    if (isTomorrow(parsed)) return 'Amanhã';
    return format(parsed, 'dd/MM', { locale: ptBR });
  };

  return (
    <div className="space-y-6">
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

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Alunos" value={stats.students} description="ativos na base" icon={Users} />
        <StatCard title="Turmas" value={stats.classes} description="em andamento" icon={GraduationCap} />
        <StatCard
          title="Receita Total"
          value={formatCurrency(stats.aulaRevenue + stats.rentalRevenue + stats.dayUseRevenue)}
          description="aulas + quadra + day use"
          icon={TrendingUp}
        />
        <StatCard title="Day Use Hoje" value={stats.dayUseToday} description="reservas do dia" icon={Clock} />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Dashboards por operação</h3>
            <p className="text-sm text-muted-foreground">Abas separadas para leitura rápida de aulas e day use.</p>
          </div>
          <TabsList className="grid w-full grid-cols-3 lg:w-[420px]">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="classes">Aulas</TabsTrigger>
            <TabsTrigger value="dayuse">Day Use</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Receita por categoria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm text-muted-foreground">Aulas</span>
                  <span className="font-semibold">{formatCurrency(stats.aulaRevenue)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm text-muted-foreground">Aluguel de quadra</span>
                  <span className="font-semibold">{formatCurrency(stats.rentalRevenue)}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <span className="text-sm text-muted-foreground">Day use</span>
                  <span className="font-semibold">{formatCurrency(stats.dayUseRevenue)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Próximas aulas</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/admin/presenca')}>
                  Presença <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {stats.sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma aula agendada para hoje ou amanhã.</p>
                ) : (
                  <div className="space-y-3">
                    {stats.sessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant={isToday(parseISO(session.date)) ? 'default' : 'secondary'}>
                              {formatDateLabel(session.date)}
                            </Badge>
                            <p className="text-sm font-medium truncate">{session.className}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {session.start.slice(0, 5)} - {session.end.slice(0, 5)} • {session.courtName}
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

        <TabsContent value="classes" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Receita de aulas" value={formatCurrency(stats.aulaRevenue)} description="mensalidades pagas" icon={Receipt} />
            <StatCard title="Turmas ativas" value={stats.classes} description="rotina fixa" icon={GraduationCap} />
            <StatCard title="Sessões próximas" value={stats.sessions.length} description="hoje e amanhã" icon={CalendarDays} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agenda detalhada de aulas</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem sessões próximas para exibir.</p>
              ) : (
                <div className="space-y-3">
                  {stats.sessions.map((session) => (
                    <div key={session.id} className="rounded-xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={isToday(parseISO(session.date)) ? 'default' : 'secondary'}>
                              {formatDateLabel(session.date)}
                            </Badge>
                            <h4 className="text-sm font-semibold">{session.className}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Horário: {session.start.slice(0, 5)} - {session.end.slice(0, 5)}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {session.courtName}
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

        <TabsContent value="dayuse" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Receita day use" value={formatCurrency(stats.dayUseRevenue)} description="reservas pagas" icon={Receipt} />
            <StatCard title="Pendentes" value={stats.dayUsePending} description="aguardando confirmação" icon={Clock} />
            <StatCard title="Hoje" value={stats.dayUseToday} description="reservas previstas" icon={CalendarDays} />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Reservas de day use</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin/agendamentos')}>
                Ver agenda <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {stats.dayUseBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum day use futuro encontrado.</p>
              ) : (
                <div className="space-y-3">
                  {stats.dayUseBookings.map((booking) => (
                    <div key={booking.id} className="rounded-xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={booking.status === 'paid' ? 'default' : 'secondary'}>
                              {booking.status === 'requested' ? 'Solicitado' : booking.status === 'paid' ? 'Pago' : 'Confirmado'}
                            </Badge>
                            <h4 className="text-sm font-semibold">{booking.requester_name || 'Reserva sem nome'}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            {formatDateLabel(booking.date)} • {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {booking.courts?.name || 'Quadra'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(Number(booking.price || 0))}</p>
                          <p className="text-xs text-muted-foreground mt-1">day use</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
