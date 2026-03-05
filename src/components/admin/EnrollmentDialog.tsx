import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  classId: string;
  className: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EnrollmentDialog({ classId, className, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [selectedStudent, setSelectedStudent] = useState('');

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: ['enrollments', classId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('id, student_id, status')
        .eq('class_id', classId)
        .eq('status', 'active');
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const studentIds = data.map(e => e.student_id);
      const { data: sps } = await supabase.from('student_profiles').select('id, user_id').in('id', studentIds);
      const userIds = (sps || []).map(s => s.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
      const userToName = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));
      const studentToUser = Object.fromEntries((sps || []).map(s => [s.id, s.user_id]));

      return data.map(e => ({
        ...e,
        studentName: userToName[studentToUser[e.student_id]] || 'Aluno',
      }));
    },
  });

  const { data: availableStudents = [] } = useQuery({
    queryKey: ['available-students', classId],
    enabled: open,
    queryFn: async () => {
      const { data: allStudents } = await supabase.from('student_profiles').select('id, user_id');
      if (!allStudents || allStudents.length === 0) return [];

      const { data: enrolled } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .eq('status', 'active');
      const enrolledIds = new Set((enrolled || []).map(e => e.student_id));

      const available = allStudents.filter(s => !enrolledIds.has(s.id));
      if (available.length === 0) return [];

      const userIds = available.map(s => s.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name').in('user_id', userIds);
      const userToName = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));

      return available.map(s => ({ id: s.id, name: userToName[s.user_id] || 'Aluno' }));
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase.from('enrollments').insert({
        class_id: classId,
        student_id: studentId,
        status: 'active',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', classId] });
      queryClient.invalidateQueries({ queryKey: ['available-students', classId] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-counts'] });
      toast.success('Aluno matriculado!');
      setSelectedStudent('');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unenrollMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase.from('enrollments')
        .update({ status: 'cancelled' as any })
        .eq('id', enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments', classId] });
      queryClient.invalidateQueries({ queryKey: ['available-students', classId] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-counts'] });
      toast.success('Matrícula cancelada!');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alunos — {className}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Selecione um aluno..." />
            </SelectTrigger>
            <SelectContent>
              {availableStudents.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => selectedStudent && enrollMutation.mutate(selectedStudent)}
            disabled={!selectedStudent || enrollMutation.isPending}
            size="icon"
          >
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2 mt-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
          ) : enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum aluno matriculado</p>
          ) : (
            enrollments.map(e => (
              <div key={e.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-sm font-medium">{e.studentName}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { if (confirm('Remover matrícula?')) unenrollMutation.mutate(e.id); }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
