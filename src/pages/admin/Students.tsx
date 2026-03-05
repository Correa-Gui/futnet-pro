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
};

export default function Students() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', phone: '', cpf: '',
    skill_level: 'beginner', plan_id: '',
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
      const userIds = data.map(s => s.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, email, phone, cpf, status').in('user_id', userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      return data.map(s => ({
        id: s.id,
        user_id: s.user_id,
        skill_level: s.skill_level,
        plan_id: s.plan_id,
        profile: profileMap[s.user_id] || { full_name: '—', email: null, phone: null, cpf: null, status: 'active' },
        plan: s.plans,
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
      return result;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['students'] }); toast.success('Aluno criado!'); handleClose(); },
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
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['students'] }); toast.success('Aluno atualizado!'); handleClose(); },
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
    setForm({ full_name: '', email: '', password: '', phone: '', cpf: '', skill_level: 'beginner', plan_id: '' });
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
                <TableHead>Status</TableHead>
                <TableHead className="w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum aluno encontrado</TableCell></TableRow>
              ) : filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.profile?.full_name}</TableCell>
                  <TableCell>{s.profile?.email || '—'}</TableCell>
                  <TableCell>{s.profile?.phone || '—'}</TableCell>
                  <TableCell>{SKILL_LABELS[s.skill_level] || s.skill_level}</TableCell>
                  <TableCell>{s.plan?.name || <span className="text-muted-foreground">Sem plano</span>}</TableCell>
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
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Aluno</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Maria Santos" required />
            </div>
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Criando...' : 'Criar Aluno'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
