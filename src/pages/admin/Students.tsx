import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Plus, Trash2, Search, Pencil, LayoutGrid, List, GraduationCap, Phone, Mail, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { Database } from '@/integrations/supabase/types';

type SkillLevel = Database['public']['Enums']['skill_level'];
type UserStatus = Database['public']['Enums']['user_status'];
type EnrollmentStatus = Database['public']['Enums']['enrollment_status'];

const SKILL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Aprendiz',
  elementary: 'Principiante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

const SKILL_COLORS: Record<SkillLevel, string> = {
  beginner: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  elementary: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  intermediate: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  advanced: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

const STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  suspended: 'Suspenso',
  defaulter: 'Inadimplente',
};

const STATUS_VARIANTS: Record<UserStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  inactive: 'secondary',
  suspended: 'destructive',
  defaulter: 'destructive',
};

type StudentRow = {
  id: string;
  user_id: string;
  skill_level: SkillLevel;
  plan_id: string | null;
  profile: { full_name: string; email: string | null; phone: string | null; cpf: string | null; status: UserStatus };
  plan: { name: string } | null;
  enrolledClassIds: string[];
};

interface StudentForm {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  cpf: string;
  skill_level: SkillLevel;
  plan_id: string;
  class_ids: string[];
}

const EMPTY_FORM: StudentForm = {
  full_name: '', email: '', password: '', phone: '', cpf: '',
  skill_level: 'beginner', plan_id: '', class_ids: [],
};

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function Students() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [form, setForm] = useState<StudentForm>({ ...EMPTY_FORM });

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
        profile: profileMap[s.user_id] || { full_name: '—', email: null, phone: null, cpf: null, status: 'active' as UserStatus },
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
    mutationFn: async (data: StudentForm) => {
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
          class_ids: data.class_ids.length > 0 ? data.class_ids : undefined,
        },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return { ...result, hasPlan: !!data.plan_id, classCount: data.class_ids.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-counts'] });

      // Rich feedback with context
      const parts: string[] = ['Aluno criado com sucesso!'];
      if (result.classCount > 0) parts.push(`Matriculado em ${result.classCount} turma(s).`);
      if (result.hasPlan) parts.push('Fatura gerada automaticamente.');

      toast.success(parts[0], {
        description: parts.slice(1).join(' '),
        action: result.hasPlan ? {
          label: 'Ver Faturas',
          onClick: () => navigate('/admin/faturas'),
        } : undefined,
      });
      handleClose();
    },
    onError: (e: Error) => toast.error('Erro ao criar aluno', { description: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ student, data }: { student: StudentRow; data: StudentForm }) => {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: data.full_name, phone: data.phone || null, cpf: data.cpf || null })
        .eq('user_id', student.user_id);
      if (profileError) throw profileError;

      const { error: studentError } = await supabase
        .from('student_profiles')
        .update({ skill_level: data.skill_level, plan_id: data.plan_id || null })
        .eq('id', student.id);
      if (studentError) throw studentError;

      const currentIds = new Set(student.enrolledClassIds);
      const newIds = new Set(data.class_ids);

      const toAdd = data.class_ids.filter(id => !currentIds.has(id));
      if (toAdd.length > 0) {
        const enrollments = toAdd.map(class_id => ({
          class_id,
          student_id: student.id,
          status: 'active' as EnrollmentStatus,
        }));
        const { error } = await supabase.from('enrollments').insert(enrollments);
        if (error) throw error;
      }

      const toRemove = student.enrolledClassIds.filter(id => !newIds.has(id));
      if (toRemove.length > 0) {
        for (const classId of toRemove) {
          await supabase.from('enrollments')
            .update({ status: 'cancelled' as EnrollmentStatus })
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
    setForm({ ...EMPTY_FORM });
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

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10" placeholder="Buscar por nome, e-mail ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setViewMode('cards')}
            className={`p-2 transition-colors ${viewMode === 'cards' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Nenhum aluno encontrado</div>
      ) : viewMode === 'cards' ? (
        /* Card View */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.id} className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-11 w-11 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {getInitials(s.profile.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold truncate">{s.profile.full_name}</p>
                        <Badge variant={STATUS_VARIANTS[s.profile.status]} className="text-[10px] mt-0.5">
                          {STATUS_LABELS[s.profile.status]}
                        </Badge>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(s)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm('Remover este aluno?')) deleteMutation.mutate(s.id); }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  {s.profile.email && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3" /><span className="truncate">{s.profile.email}</span>
                    </div>
                  )}
                  {s.profile.phone && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3" /><span>{s.profile.phone}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${SKILL_COLORS[s.skill_level]}`}>
                    {SKILL_LABELS[s.skill_level]}
                  </span>
                  {s.plan ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">
                      <CreditCard className="h-3 w-3" />{s.plan.name}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground italic">Sem plano</span>
                  )}
                  {s.enrolledClassIds.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <GraduationCap className="h-3 w-3" />{s.enrolledClassIds.length} turma{s.enrolledClassIds.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Table View */
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
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                            {getInitials(s.profile.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        {s.profile.full_name}
                      </div>
                    </TableCell>
                    <TableCell>{s.profile.email || '—'}</TableCell>
                    <TableCell>{s.profile.phone || '—'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${SKILL_COLORS[s.skill_level]}`}>
                        {SKILL_LABELS[s.skill_level]}
                      </span>
                    </TableCell>
                    <TableCell>{s.plan?.name || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      {s.enrolledClassIds.length > 0 ? (
                        <Badge variant="secondary">{s.enrolledClassIds.length}</Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell><Badge variant={STATUS_VARIANTS[s.profile.status]}>{STATUS_LABELS[s.profile.status]}</Badge></TableCell>
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
      )}

      {/* Dialog stays the same */}
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
                <Select value={form.skill_level} onValueChange={(v) => setForm({ ...form, skill_level: v as SkillLevel })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(SKILL_LABELS) as [SkillLevel, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
