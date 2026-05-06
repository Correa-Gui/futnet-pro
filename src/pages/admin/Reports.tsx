import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileDown } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

function downloadCSV(filename: string, rows: string[][]) {
  const content = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const INVOICE_STATUS: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Vencida',
  cancelled: 'Cancelada',
};

const BOOKING_STATUS: Record<string, string> = {
  requested: 'Solicitado',
  confirmed: 'Confirmado',
  paid: 'Pago',
  cancelled: 'Cancelado',
};

export default function Reports() {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  );

  const monthStart = startOfMonth(new Date(selectedMonth + '-02'));
  const monthEnd = endOfMonth(monthStart);
  const monthStartStr = format(monthStart, 'yyyy-MM-dd');
  const monthEndStr = format(monthEnd, 'yyyy-MM-dd');
  const monthLabel = format(monthStart, 'MMMM yyyy', { locale: ptBR });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['reports-invoices', selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('status', 'paid')
        .gte('due_date', monthStartStr)
        .lte('due_date', monthEndStr)
        .order('due_date', { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const studentIds = [...new Set(data.map(i => i.student_id))];
      const { data: sps } = await supabase
        .from('student_profiles')
        .select('id, user_id')
        .in('id', studentIds);
      const userIds = (sps || []).map(s => s.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      const userToName = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
      const studentToUser = Object.fromEntries((sps || []).map(s => [s.id, s.user_id]));
      return data.map(i => ({
        ...i,
        studentName: userToName[studentToUser[i.student_id]] || 'Aluno',
        finalAmount: Number(i.amount) - Number(i.discount || 0),
      }));
    },
  });

  const { data: rentals = [], isLoading: loadingRentals } = useQuery({
    queryKey: ['reports-rentals', selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('court_bookings')
        .select('*, courts(name)')
        .eq('booking_type', 'rental')
        .eq('status', 'paid')
        .gte('date', monthStartStr)
        .lte('date', monthEndStr)
        .order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: dayUses = [], isLoading: loadingDayUse } = useQuery({
    queryKey: ['reports-dayuse', selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('court_bookings')
        .select('*, courts(name)')
        .eq('booking_type', 'day_use')
        .eq('status', 'paid')
        .gte('date', monthStartStr)
        .lte('date', monthEndStr)
        .order('date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  function exportInvoices() {
    const header = ['Aluno', 'Referência', 'Vencimento', 'Valor', 'Desconto', 'Total', 'Status'];
    const rows = invoices.map(i => [
      i.studentName,
      i.reference_month || '',
      i.due_date,
      String(i.amount),
      String(i.discount || 0),
      String(i.finalAmount),
      INVOICE_STATUS[i.status] || i.status,
    ]);
    downloadCSV(`alunos-${selectedMonth}.csv`, [header, ...rows]);
  }

  function exportRentals() {
    const header = ['Data', 'Hora Início', 'Hora Fim', 'Quadra', 'Solicitante', 'Telefone', 'Valor', 'Status'];
    const rows = rentals.map(b => [
      b.date,
      b.start_time,
      b.end_time,
      (b.courts as any)?.name || '',
      b.requester_name || '',
      (b as any).requester_phone || '',
      String(b.price || 0),
      BOOKING_STATUS[b.status] || b.status,
    ]);
    downloadCSV(`alugueis-${selectedMonth}.csv`, [header, ...rows]);
  }

  function exportDayUse() {
    const header = ['Data', 'Hora Início', 'Hora Fim', 'Quadra', 'Solicitante', 'Telefone', 'Valor', 'Status'];
    const rows = dayUses.map(b => [
      b.date,
      b.start_time,
      b.end_time,
      (b.courts as any)?.name || '',
      b.requester_name || '',
      (b as any).requester_phone || '',
      String(b.price || 0),
      BOOKING_STATUS[b.status] || b.status,
    ]);
    downloadCSV(`day-use-${selectedMonth}.csv`, [header, ...rows]);
  }

  function exportAll() {
    const rows: string[][] = [
      ['Tipo', 'Aluno / Solicitante', 'Referência / Data', 'Valor', 'Status'],
      ...invoices.map(i => ['Aluno', i.studentName, i.due_date, String(i.finalAmount), INVOICE_STATUS[i.status] || i.status]),
      ...rentals.map(b => ['Aluguel', b.requester_name || '', b.date, String(b.price || 0), BOOKING_STATUS[b.status] || b.status]),
      ...dayUses.map(b => ['Day Use', b.requester_name || '', b.date, String(b.price || 0), BOOKING_STATUS[b.status] || b.status]),
    ];
    downloadCSV(`relatorio-${selectedMonth}.csv`, rows);
  }

  const invoiceTotal = invoices.reduce((s, i) => s + i.finalAmount, 0);
  const rentalTotal = rentals.reduce((s, b) => s + Number(b.price || 0), 0);
  const dayUseTotal = dayUses.reduce((s, b) => s + Number(b.price || 0), 0);
  const grandTotal = invoiceTotal + rentalTotal + dayUseTotal;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold font-brand">Relatórios</h2>
          <p className="text-sm text-muted-foreground capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-background"
          />
          <Button onClick={exportAll}>
            <FileDown className="mr-2 h-4 w-4" />Exportar Tudo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Alunos</p>
            <p className="text-xl font-bold">{formatCurrency(invoiceTotal)}</p>
            <p className="text-xs text-muted-foreground">{invoices.length} fatura(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Aluguéis</p>
            <p className="text-xl font-bold">{formatCurrency(rentalTotal)}</p>
            <p className="text-xs text-muted-foreground">{rentals.length} reserva(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Day Use</p>
            <p className="text-xl font-bold">{formatCurrency(dayUseTotal)}</p>
            <p className="text-xs text-muted-foreground">{dayUses.length} reserva(s)</p>
          </CardContent>
        </Card>
        <Card className="border-primary/40">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Geral</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(grandTotal)}</p>
            <p className="text-xs text-muted-foreground">{invoices.length + rentals.length + dayUses.length} registros</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="alunos">Alunos</TabsTrigger>
          <TabsTrigger value="alugueis">Aluguéis</TabsTrigger>
          <TabsTrigger value="dayuse">Day Use</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportAll}>
              <Download className="mr-2 h-4 w-4" />CSV Completo
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Aluno / Solicitante</TableHead>
                    <TableHead>Data / Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(loadingInvoices || loadingRentals || loadingDayUse) ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : (invoices.length + rentals.length + dayUses.length) === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum registro encontrado</TableCell></TableRow>
                  ) : (
                    <>
                      {invoices.map(i => (
                        <TableRow key={`inv-${i.id}`}>
                          <TableCell><Badge variant="outline">Aluno</Badge></TableCell>
                          <TableCell>{i.studentName}</TableCell>
                          <TableCell>{format(parseISO(i.due_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{formatCurrency(i.finalAmount)}</TableCell>
                          <TableCell>
                            <Badge variant={i.status === 'paid' ? 'default' : i.status === 'overdue' ? 'destructive' : 'outline'}>
                              {INVOICE_STATUS[i.status] || i.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {rentals.map(b => (
                        <TableRow key={`rent-${b.id}`}>
                          <TableCell><Badge variant="secondary">Aluguel</Badge></TableCell>
                          <TableCell>{b.requester_name || '-'}</TableCell>
                          <TableCell>{format(parseISO(b.date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{formatCurrency(Number(b.price || 0))}</TableCell>
                          <TableCell>
                            <Badge variant={b.status === 'paid' ? 'default' : b.status === 'cancelled' ? 'destructive' : 'outline'}>
                              {BOOKING_STATUS[b.status] || b.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {dayUses.map(b => (
                        <TableRow key={`du-${b.id}`}>
                          <TableCell><Badge>Day Use</Badge></TableCell>
                          <TableCell>{b.requester_name || '-'}</TableCell>
                          <TableCell>{format(parseISO(b.date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>{formatCurrency(Number(b.price || 0))}</TableCell>
                          <TableCell>
                            <Badge variant={b.status === 'paid' ? 'default' : b.status === 'cancelled' ? 'destructive' : 'outline'}>
                              {BOOKING_STATUS[b.status] || b.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alunos" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportInvoices}>
              <Download className="mr-2 h-4 w-4" />Exportar CSV
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingInvoices ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : invoices.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma fatura encontrada</TableCell></TableRow>
                  ) : invoices.map(i => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.studentName}</TableCell>
                      <TableCell>{i.reference_month || '-'}</TableCell>
                      <TableCell>{format(parseISO(i.due_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{formatCurrency(Number(i.amount))}</TableCell>
                      <TableCell>{formatCurrency(Number(i.discount || 0))}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(i.finalAmount)}</TableCell>
                      <TableCell>
                        <Badge variant={i.status === 'paid' ? 'default' : i.status === 'overdue' ? 'destructive' : 'outline'}>
                          {INVOICE_STATUS[i.status] || i.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alugueis" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportRentals}>
              <Download className="mr-2 h-4 w-4" />Exportar CSV
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Quadra</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRentals ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : rentals.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum aluguel encontrado</TableCell></TableRow>
                  ) : rentals.map(b => (
                    <TableRow key={b.id}>
                      <TableCell>{format(parseISO(b.date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{b.start_time} – {b.end_time}</TableCell>
                      <TableCell>{(b.courts as any)?.name || '-'}</TableCell>
                      <TableCell>{b.requester_name || '-'}</TableCell>
                      <TableCell>{(b as any).requester_phone || '-'}</TableCell>
                      <TableCell>{formatCurrency(Number(b.price || 0))}</TableCell>
                      <TableCell>
                        <Badge variant={b.status === 'paid' ? 'default' : b.status === 'cancelled' ? 'destructive' : 'outline'}>
                          {BOOKING_STATUS[b.status] || b.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dayuse" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportDayUse}>
              <Download className="mr-2 h-4 w-4" />Exportar CSV
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Quadra</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingDayUse ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : dayUses.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum day use encontrado</TableCell></TableRow>
                  ) : dayUses.map(b => (
                    <TableRow key={b.id}>
                      <TableCell>{format(parseISO(b.date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{b.start_time} – {b.end_time}</TableCell>
                      <TableCell>{(b.courts as any)?.name || '-'}</TableCell>
                      <TableCell>{b.requester_name || '-'}</TableCell>
                      <TableCell>{(b as any).requester_phone || '-'}</TableCell>
                      <TableCell>{formatCurrency(Number(b.price || 0))}</TableCell>
                      <TableCell>
                        <Badge variant={b.status === 'paid' ? 'default' : b.status === 'cancelled' ? 'destructive' : 'outline'}>
                          {BOOKING_STATUS[b.status] || b.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
