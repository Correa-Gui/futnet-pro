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
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import EnrollmentDialog from '@/components/admin/EnrollmentDialog';

const DAYS = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

const LEVELS: Record<string, string> = {
  beginner: 'Aprendiz',
  elementary: 'Principiante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativa',
  paused: 'Pausada',
  closed: 'Encerrada',
};

type ClassRow = {
  id: string;
  name: string;
  level: string;
  day_of_week: number[];
  start_time: string;
  end_time: string;
  max_students: number;
  status: string;
  court_id: string;
  teacher_id: string;
  courts?: { name: string } | null;
  _teacherName?: string;
};

export default function Classes() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRow | null>(null);
  const [enrollClass, setEnrollClass] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({
    name: '', level: 'beginner' as string, day_of_week: [] as number[],
    start_time: '17:30', end_time: '18:30', max_students: 12,
    status: 'active' as string, court_id: '', teacher_id: '',
  });

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*, courts(name), teacher_profiles(id)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Fetch teacher names separately
      const teacherIds = [...new Set((data || []).map((c: any) => c.teacher_profiles?.id).filter(Boolean))];
      let teacherNames: Record<string, string> = {};
      if (teacherIds.length > 0) {
        const { data: tps } = await supabase.from('teacher_profiles').select('id, user_id').in('id', teacherIds);
        if (tps) {
          const userIds = tps.map(t => t.user_id);
          const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
          if (profiles) {
            const userToName = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
            tps.forEach(t => { teacherNames[t.id] = userToName[t.user_id] || '—'; });
          }
        }
      }
      return (data || []).map((c: any) => ({
        ...c,
        _teacherName: teacherNames[c.teacher_profiles?.id] || '—',
      })) as (ClassRow & { _teacherName: string })[];
    },
  });

  const { data: courts = [] } = useQuery({
    queryKey: ['courts-select'],
    queryFn: async () => {
      const { data } = await supabase.from('courts').select('id, name').eq('is_active', true);
      return data || [];
    },
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers-select'],
    queryFn: async () => {
      const { data: tps } = await supabase.from('teacher_profiles').select('id, user_id');
      if (!tps || tps.length === 0) return [];
      const userIds = tps.map(t => t.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
      const userToName = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
      return tps.map(t => ({ id: t.id, name: userToName[t.user_id] || 'Professor' }));
    },
  });

  const { data: enrollmentCounts = {} } = useQuery({
    queryKey: ['enrollment-counts'],
    queryFn: async () => {
      const { data } = await supabase.from('enrollments').select('class_id').eq('status', 'active');
      const counts: Record<string, number> = {};
      (data || []).forEach((e: any) => { counts[e.class_id] = (counts[e.class_id] || 0) + 1; });
      return counts;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      const payload = {
        name: data.name, level: data.level as any, day_of_week: data.day_of_week,
        start_time: data.start_time, end_time: data.end_time, max_students: data.max_students,
        status: data.status as any, court_id: data.court_id, teacher_id: data.teacher_id,
      };
      if (data.id) {
        const { error } = await supabase.from('classes').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('classes').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classes'] }); toast.success(editing ? 'Turma atualizada!' : 'Turma criada!'); handleClose(); },
    onError: (e: Error) => toast.error('Erro', { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('classes').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['classes'] }); toast.success('Turma removida!'); },
  });

  const handleOpen = (cls?: ClassRow) => {
    if (cls) {
      setEditing(cls);
      setForm({ name: cls.name, level: cls.level, day_of_week: cls.day_of_week, start_time: cls.start_time.slice(0, 5), end_time: cls.end_time.slice(0, 5), max_students: cls.max_students, status: cls.status, court_id: cls.court_id, teacher_id: cls.teacher_id });
    } else {
      setEditing(null);
      setForm({ name: '', level: 'beginner', day_of_week: [], start_time: '17:30', end_time: '18:30', max_students: 12, status: 'active', court_id: '', teacher_id: '' });
    }
    setOpen(true);
  };

  const handleClose = () => { setOpen(false); setEditing(null); };

  const toggleDay = (day: number) => {
    setForm((prev) => ({
      ...prev,
      day_of_week: prev.day_of_week.includes(day) ? prev.day_of_week.filter((d) => d !== day) : [...prev.day_of_week, day].sort(),
    }));
  };

  const getDaysLabel = (days: number[]) => days.map((d) => DAYS.find((dd) => dd.value === d)?.label).filter(Boolean).join(', ');

  const getTeacherName = (cls: any) => cls._teacherName || '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>Turmas</h2>
          <p className="text-sm text-muted-foreground">Gerencie as turmas e horários</p>
        </div>
        <Button onClick={() => handleOpen()}><Plus className="mr-2 h-4 w-4" />Nova Turma</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Quadra</TableHead>
                <TableHead>Professor</TableHead>
                <TableHead>Alunos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : classes.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma turma cadastrada</TableCell></TableRow>
              ) : classes.map((cls) => {
                const count = enrollmentCounts[cls.id] || 0;
                const isFull = count >= cls.max_students;
                return (
                  <TableRow key={cls.id}>
                    <TableCell className="font-medium">{cls.name}</TableCell>
                    <TableCell>{LEVELS[cls.level] || cls.level}</TableCell>
                    <TableCell>{getDaysLabel(cls.day_of_week)}</TableCell>
                    <TableCell>{cls.start_time.slice(0, 5)} - {cls.end_time.slice(0, 5)}</TableCell>
                    <TableCell>{(cls.courts as any)?.name || '—'}</TableCell>
                    <TableCell>{getTeacherName(cls)}</TableCell>
                    <TableCell>
                      <Badge variant={isFull ? 'destructive' : 'outline'}>{count}/{cls.max_students}</Badge>
                    </TableCell>
                    <TableCell><Badge variant={cls.status === 'active' ? 'default' : 'secondary'}>{STATUS_LABELS[cls.status]}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEnrollClass({ id: cls.id, name: cls.name })} title="Gerenciar alunos"><Users className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpen(cls)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm('Remover esta turma?')) deleteMutation.mutate(cls.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Editar Turma' : 'Nova Turma'}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ ...form, id: editing?.id }); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da turma *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Turma Aprendiz - Seg 17:30" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nível *</Label>
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEVELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dias da semana *</Label>
              <div className="flex flex-wrap gap-3">
                {DAYS.map((day) => (
                  <label key={day.value} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={form.day_of_week.includes(day.value)} onCheckedChange={() => toggleDay(day.value)} />
                    {day.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Início *</Label>
                <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Fim *</Label>
                <Input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Máx. alunos *</Label>
                <Input type="number" min={1} max={50} value={form.max_students} onChange={(e) => setForm({ ...form, max_students: parseInt(e.target.value) || 12 })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quadra *</Label>
                <Select value={form.court_id} onValueChange={(v) => setForm({ ...form, court_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {courts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Professor *</Label>
                <Select value={form.teacher_id} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
