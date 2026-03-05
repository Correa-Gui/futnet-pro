import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Zap, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'outline' },
  paid: { label: 'Pago', variant: 'default' },
  overdue: { label: 'Vencida', variant: 'destructive' },
  cancelled: { label: 'Cancelada', variant: 'secondary' },
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function AdminInvoices() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState({
    student_id: '', amount: '', discount: '0', due_date: '',
    reference_month: '', notes: '', status: 'pending',
  });
  const [batchForm, setBatchForm] = useState({
    reference_month: '', due_date: '', 
  });

  // Fetch students with plan info
  const { data: students = [] } = useQuery({
    queryKey: ['admin-students-invoices'],
    queryFn: async () => {
      const { data: sps } = await supabase
        .from('student_profiles')
        .select('id, user_id, plan_id, plans(name, monthly_price)');
      if (!sps || sps.length === 0) return [];
      const userIds = sps.map(s => s.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
      const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
      return sps.map(s => ({
        id: s.id,
        name: nameMap[s.user_id] || 'Aluno',
        plan: s.plans as any,
      }));
    },
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['admin-invoices', statusFilter],
    queryFn: async () => {
      let query = supabase.from('invoices').select('*').order('due_date', { ascending: false });
      if (statusFilter !== 'all') query = query.eq('status', statusFilter as any);
      const { data, error } = await query;
      if (error) throw error;

      // Map student names
      const studentIds = [...new Set((data || []).map(i => i.student_id))];
      if (studentIds.length === 0) return [];
      const { data: sps } = await supabase.from('student_profiles').select('id, user_id').in('id', studentIds);
      const userIds = (sps || []).map(s => s.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
      const userToName = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
      const studentToUser = Object.fromEntries((sps || []).map(s => [s.id, s.user_id]));

      return (data || []).map(i => ({
        ...i,
        studentName: userToName[studentToUser[i.student_id]] || 'Aluno',
      }));
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      const payload = {
        student_id: data.student_id,
        amount: parseFloat(data.amount),
        discount: parseFloat(data.discount) || 0,
        due_date: data.due_date,
        reference_month: data.reference_month,
        notes: data.notes || null,
        status: data.status as any,
        ...(data.status === 'paid' && !editing?.paid_at ? { paid_at: new Date().toISOString() } : {}),
      };
      if (data.id) {
        const { error } = await supabase.from('invoices').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('invoices').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      toast.success(editing ? 'Fatura atualizada!' : 'Fatura criada!');
      handleClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const batchMutation = useMutation({
    mutationFn: async () => {
      const studentsWithPlan = students.filter(s => s.plan);
      if (studentsWithPlan.length === 0) throw new Error('Nenhum aluno com plano ativo');

      // Check for existing invoices in this reference_month to avoid duplicates
      const { data: existing } = await supabase
        .from('invoices')
        .select('student_id')
        .eq('reference_month', batchForm.reference_month)
        .in('status', ['pending', 'paid', 'overdue'] as any);
      const existingSet = new Set((existing || []).map(e => e.student_id));

      const eligibleStudents = studentsWithPlan.filter(s => !existingSet.has(s.id));
      if (eligibleStudents.length === 0) throw new Error('Todos os alunos já possuem fatura para este mês');

      const invoicesToCreate = eligibleStudents.map(s => ({
        student_id: s.id,
        amount: s.plan.monthly_price,
        discount: 0,
        due_date: batchForm.due_date,
        reference_month: batchForm.reference_month,
        status: 'pending' as const,
      }));

      const { error } = await supabase.from('invoices').insert(invoicesToCreate);
      if (error) throw error;
      const skipped = studentsWithPlan.length - eligibleStudents.length;
      return { created: eligibleStudents.length, skipped };
    },
    onSuccess: ({ created, skipped }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      let msg = `${created} fatura(s) gerada(s)!`;
      if (skipped > 0) msg += ` ${skipped} aluno(s) já possuíam fatura e foram ignorados.`;
      toast.success(msg);
      setBatchOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invoices')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-invoices'] });
      toast.success('Fatura marcada como paga!');
    },
  });

  const handleOpen = (inv?: any) => {
    if (inv) {
      setEditing(inv);
      setForm({
        student_id: inv.student_id, amount: String(inv.amount),
        discount: String(inv.discount || 0), due_date: inv.due_date,
        reference_month: inv.reference_month, notes: inv.notes || '', status: inv.status,
      });
    } else {
      setEditing(null);
      setForm({ student_id: '', amount: '', discount: '0', due_date: '', reference_month: '', notes: '', status: 'pending' });
    }
    setOpen(true);
  };

  const handleClose = () => { setOpen(false); setEditing(null); };

  // Stats
  const totalPending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + Number(i.amount) - Number(i.discount || 0), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount) - Number(i.discount || 0), 0);
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.amount) - Number(i.discount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>Faturas</h2>
          <p className="text-sm text-muted-foreground">Gerencie cobranças e pagamentos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBatchOpen(true)}>
            <Zap className="mr-2 h-4 w-4" />Gerar em Lote
          </Button>
          <Button onClick={() => handleOpen()}>
            <Plus className="mr-2 h-4 w-4" />Nova Fatura
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Pendente</p><p className="text-xl font-bold">{formatCurrency(totalPending)}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Recebido</p><p className="text-xl font-bold text-primary">{formatCurrency(totalPaid)}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Vencido</p><p className="text-xl font-bold text-destructive">{formatCurrency(totalOverdue)}</p></CardContent></Card>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="paid">Pago</SelectItem>
            <SelectItem value="overdue">Vencida</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
          </SelectContent>
        </Select>
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
                <TableHead>Status</TableHead>
                <TableHead className="w-28">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : invoices.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nenhuma fatura encontrada</TableCell></TableRow>
              ) : invoices.map(inv => {
                const statusInfo = STATUS_MAP[inv.status] || STATUS_MAP.pending;
                const finalAmount = Number(inv.amount) - Number(inv.discount || 0);
                return (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.studentName}</TableCell>
                    <TableCell>{inv.reference_month}</TableCell>
                    <TableCell>{format(parseISO(inv.due_date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{formatCurrency(finalAmount)}</TableCell>
                    <TableCell><Badge variant={statusInfo.variant}>{statusInfo.label}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpen(inv)}><Pencil className="h-4 w-4" /></Button>
                        {inv.status === 'pending' && (
                          <Button variant="ghost" size="icon" onClick={() => markPaidMutation.mutate(inv.id)} title="Marcar como pago">
                            <CheckCircle className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Single Invoice Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Editar Fatura' : 'Nova Fatura'}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate({ ...form, id: editing?.id }); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Aluno *</Label>
              <Select value={form.student_id} onValueChange={v => {
                const student = students.find(s => s.id === v);
                setForm(prev => ({
                  ...prev,
                  student_id: v,
                  amount: student?.plan ? String(student.plan.monthly_price) : prev.amount,
                }));
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.plan ? `(${s.plan.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mês de Referência *</Label>
                <Input value={form.reference_month} onChange={e => setForm({ ...form, reference_month: e.target.value })} placeholder="Mar/2026" required />
              </div>
              <div className="space-y-2">
                <Label>Vencimento *</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Desconto (R$)</Label>
                <Input type="number" step="0.01" min="0" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Batch Generation Dialog */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Gerar Faturas em Lote</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Serão geradas faturas para todos os {students.filter(s => s.plan).length} alunos com plano ativo,
            usando o valor do plano de cada aluno.
          </p>
          <form onSubmit={e => { e.preventDefault(); batchMutation.mutate(); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mês de Referência *</Label>
                <Input value={batchForm.reference_month} onChange={e => setBatchForm({ ...batchForm, reference_month: e.target.value })} placeholder="Mar/2026" required />
              </div>
              <div className="space-y-2">
                <Label>Vencimento *</Label>
                <Input type="date" value={batchForm.due_date} onChange={e => setBatchForm({ ...batchForm, due_date: e.target.value })} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBatchOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={batchMutation.isPending}>
                {batchMutation.isPending ? 'Gerando...' : 'Gerar Faturas'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
