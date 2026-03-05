import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Search, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const SKILL_LABELS: Record<string, string> = {
  beginner: 'Aprendiz',
  elementary: 'Principiante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  suspended: 'Suspenso',
  defaulter: 'Inadimplente',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  inactive: 'secondary',
  suspended: 'destructive',
  defaulter: 'destructive',
};

type StudentRow = {
  id: string;
  user_id: string;
  skill_level: string;
  plan_id: string | null;
  profile: { full_name: string; email: string | null; phone: string | null; cpf: string | null; status: string };
  plan: { name: string } | null;
  enrolledClassIds: string[];
};

export default function Students() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', phone: '', cpf: '',
    skill_level: 'beginner', plan_id: '', class_ids: [] as string[],
  });

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('id, user_id, skill_level, plan_id, plans(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [] as StudentRow[];

      const studentIds = data.map(s => s.id);
      const userIds = data.map(s => s.user_id);

      const [profilesRes, enrollmentsRes] = await Promise.all([
        supabase.from('profiles').select('user_id, full_name, email, phone, cpf, status').in('user_id', userIds),
        supabase.from('enrollments').select('student_id, class_id').in('student_id', studentIds).eq('status', 'active'),
      ]);

      const profileMap = Object.fromEntries((profilesRes.data || []).map(p => [p.user_id, p]));
      const enrollMap: Record<string, string[]> = {};
      (enrollmentsRes.data || []).forEach(e => {
        if (!enrollMap[e.student_id]) enrollMap[e.student_id] = [];
        enrollMap[e.student_id].push(e.class_id);
      });

      return data.map(s => ({
        id: s.id,
        user_id: s.user_id,
        skill_level: s.skill_level,
        plan_id: s.plan_id,
        profile: profileMap[s.user_id] || { full_name: '—', email: null, phone: null, cpf: null, status: 'active' },
        plan: s.plans,
        enrolledClassIds: enrollMap[s.id] || [],
      })) as StudentRow[];
    },
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['plans-select'],
    queryFn: async () => {
      const { data } = await supabase.from('plans').select('id, name').eq('is_active', true);
      return data || [];
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-select'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('id, name').eq('status', 'active').order('name');
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const { data: result, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: data.email,
          password: data.password,
          full_name: data.full_name,
          phone: data.phone || undefined,
          cpf: data.cpf || undefined,
          role: 'student',
          skill_level: data.skill_level,
          plan_id: data.plan_id || undefined,
        },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);

      // Enroll in selected classes
      if (data.class_ids.length > 0) {
        const { data: sp } = await supabase
          .from('student_profiles')
          .select('id')
          .eq('user_id', result.user_id)
          .single();
        if (sp) {
          const enrollments = data.class_ids.map(class_id => ({
            class_id,
            student_id: sp.id,
            status: 'active' as const,
          }));
          const { error: enrollError } = await supabase.from('enrollments').insert(enrollments);
          if (enrollError) throw enrollError;

          // Auto-generate first invoice if student has a plan
          if (data.plan_id) {
            const { data: planData } = await supabase
              .from('plans')
              .select('monthly_price, name')
              .eq('id', data.plan_id)
              .single();
            if (planData) {
              const now = new Date();
              const dueDate = addDays(now, 30);
              const refMonth = format(now, 'MMM/yyyy');
              await supabase.from('invoices').insert({
                student_id: sp.id,
                amount: planData.monthly_price,
                discount: 0,
                due_date: format(dueDate, 'yyyy-MM-dd'),
                reference_month: refMonth,
                status: 'pending' as const,
              });
            }
          }
        }
      } else if (data.plan_id) {
        // No classes but has plan — still generate invoice
        const { data: sp } = await supabase
          .from('student_profiles')
          .select('id')
          .eq('user_id', result.user_id)
          .single();
        if (sp) {
          const { data: planData } = await supabase
            .from('plans')
            .select('monthly_price, name')
            .eq('id', data.plan_id)
            .single();
          if (planData) {
            const now = new Date();
            const dueDate = addDays(now, 30);
            const refMonth = format(now, 'MMM/yyyy');
            await supabase.from('invoices').insert({
              student_id: sp.id,
              amount: planData.monthly_price,
              discount: 0,
              due_date: format(dueDate, 'yyyy-MM-dd'),
              reference_month: refMonth,
              status: 'pending' as const,
            });
          }
        }
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-counts'] });
      toast.success('Aluno criado!');
      handleClose();
    },
    onError: (e: Error) => toast.error('Erro ao criar aluno', { description: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ student, data }: { student: StudentRow; data: typeof form }) => {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: data.full_name, phone: data.phone || null, cpf: data.cpf || null })
        .eq('user_id', student.user_id);
      if (profileError) throw profileError;

      const { error: studentError } = await supabase
        .from('student_profiles')
        .update({ skill_level: data.skill_level as any, plan_id: data.plan_id || null })
        .eq('id', student.id);
      if (studentError) throw studentError;

      // Sync enrollments
      const currentIds = new Set(student.enrolledClassIds);
      const newIds = new Set(data.class_ids);

      // Add new enrollments
      const toAdd = data.class_ids.filter(id => !currentIds.has(id));
      if (toAdd.length > 0) {
        const enrollments = toAdd.map(class_id => ({
          class_id,
          student_id: student.id,
          status: 'active' as const,
        }));
        const { error } = await supabase.from('enrollments').insert(enrollments);
        if (error) throw error;
      }

      // Cancel removed enrollments
      const toRemove = student.enrolledClassIds.filter(id => !newIds.has(id));
      if (toRemove.length > 0) {
        for (const classId of toRemove) {
          await supabase.from('enrollments')
            .update({ status: 'cancelled' as any })
            .eq('student_id', student.id)
            .eq('class_id', classId)
            .eq('status', 'active');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-counts'] });
      toast.success('Aluno atualizado!');
      handleClose();
    },
    onError: (e: Error) => toast.error('Erro ao atualizar aluno', { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('student_profiles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['students'] }); toast.success('Aluno removido!'); },
  });

  const handleClose = () => {
    setOpen(false);
    setEditingStudent(null);
    setForm({ full_name: '', email: '', password: '', phone: '', cpf: '', skill_level: 'beginner', plan_id: '', class_ids: [] });
  };

  const handleEdit = (s: StudentRow) => {
    setEditingStudent(s);
    setForm({
      full_name: s.profile?.full_name || '',
      email: s.profile?.email || '',
      password: '',
      phone: s.profile?.phone || '',
      cpf: s.profile?.cpf || '',
      skill_level: s.skill_level,
      plan_id: s.plan_id || '',
      class_ids: s.enrolledClassIds,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      updateMutation.mutate({ student: editingStudent, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const toggleClass = (classId: string) => {
    setForm(prev => ({
      ...prev,
      class_ids: prev.class_ids.includes(classId)
        ? prev.class_ids.filter(id => id !== classId)
        : [...prev.class_ids, classId],
    }));
  };

  const filtered = students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.profile?.full_name?.toLowerCase().includes(q) ||
      s.profile?.email?.toLowerCase().includes(q) ||
      s.profile?.cpf?.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>Alunos</h2>
          <p className="text-sm text-muted-foreground">{students.length} alunos cadastrados</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Novo Aluno</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-10" placeholder="Buscar por nome, e-mail ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Turmas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum aluno encontrado</TableCell></TableRow>
              ) : filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.profile?.full_name}</TableCell>
                  <TableCell>{s.profile?.email || '—'}</TableCell>
                  <TableCell>{s.profile?.phone || '—'}</TableCell>
                  <TableCell>{SKILL_LABELS[s.skill_level] || s.skill_level}</TableCell>
                  <TableCell>{s.plan?.name || <span className="text-muted-foreground">Sem plano</span>}</TableCell>
                  <TableCell>
                    {s.enrolledClassIds.length > 0 ? (
                      <Badge variant="secondary">{s.enrolledClassIds.length} turma(s)</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">Nenhuma</span>
                    )}
                  </TableCell>
                  <TableCell><Badge variant={STATUS_VARIANTS[s.profile?.status] || 'secondary'}>{STATUS_LABELS[s.profile?.status] || s.profile?.status}</Badge></TableCell>
                  <TableCell className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm('Remover este aluno?')) deleteMutation.mutate(s.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingStudent ? 'Editar Aluno' : 'Novo Aluno'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Maria Santos" required />
            </div>
            {!editingStudent && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-mail *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="aluno@email.com" required />
                </div>
                <div className="space-y-2">
                  <Label>Senha *</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" required minLength={6} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nível</Label>
                <Select value={form.skill_level} onValueChange={(v) => setForm({ ...form, skill_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SKILL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={form.plan_id} onValueChange={(v) => setForm({ ...form, plan_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Turmas */}
            <div className="space-y-2">
              <Label>Turmas</Label>
              {classes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma turma ativa disponível.</p>
              ) : (
                <div className="rounded-md border border-input p-3 space-y-2 max-h-40 overflow-y-auto">
                  {classes.map((c) => (
                    <div key={c.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`class-${c.id}`}
                        checked={form.class_ids.includes(c.id)}
                        onCheckedChange={() => toggleClass(c.id)}
                      />
                      <label htmlFor={`class-${c.id}`} className="text-sm cursor-pointer flex-1">
                        {c.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
              {form.class_ids.length > 0 && (
                <p className="text-xs text-muted-foreground">{form.class_ids.length} turma(s) selecionada(s)</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingStudent
                  ? (updateMutation.isPending ? 'Salvando...' : 'Salvar')
                  : (createMutation.isPending ? 'Criando...' : 'Criar Aluno')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
