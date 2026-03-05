import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Phone, Mail, CreditCard, CalendarDays, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const LEVELS: Record<string, string> = {
  beginner: 'Aprendiz',
  elementary: 'Principiante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

export default function StudentProfile() {
  const { user, profile, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    cpf: '',
    birth_date: '',
  });

  const { data: studentProfile } = useQuery({
    queryKey: ['student-profile-detail', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('student_profiles')
        .select('*, plans(name, monthly_price)')
        .eq('user_id', user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const startEditing = () => {
    setForm({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      cpf: profile?.cpf || '',
      birth_date: profile?.birth_date || '',
    });
    setIsEditing(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmed = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        cpf: form.cpf.trim() || null,
        birth_date: form.birth_date || null,
      };
      if (!trimmed.full_name) throw new Error('Nome é obrigatório');

      const { error } = await supabase
        .from('profiles')
        .update(trimmed)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setIsEditing(false);
      toast.success('Perfil atualizado!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['student-enrollments', studentProfile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select('id, status, classes(name, day_of_week, start_time, end_time)')
        .eq('student_id', studentProfile!.id)
        .eq('status', 'active');
      return data || [];
    },
    enabled: !!studentProfile,
  });

  const DAYS: Record<number, string> = { 0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb' };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Meu Perfil</h2>

      {/* Personal Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Dados Pessoais</CardTitle>
            {!isEditing && (
              <Button size="sm" variant="outline" onClick={startEditing}>
                Editar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isEditing ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  maxLength={20}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={form.cpf}
                  onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="birth">Data de nascimento</Label>
                <Input
                  id="birth"
                  type="date"
                  value={form.birth_date}
                  onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  Salvar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.full_name || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{profile?.email || user?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.phone || 'Não informado'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>{profile?.cpf || 'Não informado'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span>
                  {profile?.birth_date
                    ? format(new Date(profile.birth_date + 'T12:00:00'), 'dd/MM/yyyy')
                    : 'Não informado'}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan & Level */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Plano & Nível</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Nível</span>
            <Badge variant="outline">{LEVELS[studentProfile?.skill_level || 'beginner']}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Plano</span>
            <span className="font-medium">
              {(studentProfile?.plans as any)?.name || 'Sem plano'}
            </span>
          </div>
          {(studentProfile?.plans as any)?.monthly_price && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Mensalidade</span>
              <span className="font-medium">
                R$ {Number((studentProfile?.plans as any).monthly_price).toFixed(2).replace('.', ',')}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enrolled Classes */}
      {enrollments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Minhas Turmas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {enrollments.map((e: any) => (
              <div key={e.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{e.classes?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {e.classes?.day_of_week?.map((d: number) => DAYS[d]).join(', ')} • {e.classes?.start_time?.slice(0, 5)} – {e.classes?.end_time?.slice(0, 5)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Separator />

      <Button variant="destructive" className="w-full" onClick={signOut}>
        <LogOut className="mr-2 h-4 w-4" />
        Sair da conta
      </Button>
    </div>
  );
}
