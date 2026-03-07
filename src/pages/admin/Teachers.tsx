import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type TeacherRow = {
  id: string;
  user_id: string;
  rate_per_class: number;
  profile: { full_name: string; email: string | null; phone: string | null; status: string };
};

export default function Teachers() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '', rate_per_class: 50 });

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_profiles')
        .select('id, user_id, rate_per_class')
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [] as TeacherRow[];
      const userIds = data.map(t => t.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, email, phone, status').in('user_id', userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p]));
      return data.map(t => ({
        id: t.id,
        user_id: t.user_id,
        rate_per_class: t.rate_per_class,
        profile: profileMap[t.user_id] || { full_name: '—', email: null, phone: null, status: 'active' },
      })) as TeacherRow[];
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
          role: 'teacher',
          rate_per_class: data.rate_per_class,
        },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teachers'] }); toast.success('Professor criado!'); handleClose(); },
    onError: (e: Error) => toast.error('Erro ao criar professor', { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('teacher_profiles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teachers'] }); toast.success('Professor removido!'); },
    onError: (e: Error) => toast.error('Erro', { description: e.message }),
  });

  const handleClose = () => { setOpen(false); setForm({ full_name: '', email: '', password: '', phone: '', rate_per_class: 50 }); };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-brand">Professores</h2>
          <p className="text-sm text-muted-foreground">Gerencie os professores</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Novo Professor</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Valor/Aula</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : teachers.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum professor cadastrado</TableCell></TableRow>
              ) : teachers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.profile?.full_name}</TableCell>
                  <TableCell>{t.profile?.email || '—'}</TableCell>
                  <TableCell>{t.profile?.phone || '—'}</TableCell>
                  <TableCell>{formatCurrency(t.rate_per_class)}</TableCell>
                  <TableCell><Badge variant={t.profile?.status === 'active' ? 'default' : 'secondary'}>{t.profile?.status === 'active' ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm('Remover este professor?')) deleteMutation.mutate(t.id); }}>
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
          <DialogHeader><DialogTitle>Novo Professor</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="João Silva" required />
            </div>
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="professor@email.com" required />
            </div>
            <div className="space-y-2">
              <Label>Senha *</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" required minLength={6} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label>Valor por aula (R$) *</Label>
                <Input type="number" min={0} step={0.01} value={form.rate_per_class} onChange={(e) => setForm({ ...form, rate_per_class: parseFloat(e.target.value) || 0 })} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Criando...' : 'Criar Professor'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
