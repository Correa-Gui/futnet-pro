import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, UserCog, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type AdminRole = Database['public']['Tables']['admin_roles']['Row'];

type AdminUser = Profile & { admin_role_name?: string | null };

function useAdminUsers() {
  return useQuery({
    queryKey: ['system-admin-users'],
    queryFn: async () => {
      // Get all admin user_ids
      const { data: adminRoles, error: rolesErr } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      if (rolesErr) throw rolesErr;

      const userIds = (adminRoles || []).map(r => r.user_id);
      if (userIds.length === 0) return [] as AdminUser[];

      // Get profiles for those users + their admin_role name
      const { data: profiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('*, admin_roles(name)')
        .in('user_id', userIds)
        .order('full_name');
      if (profilesErr) throw profilesErr;

      return (profiles || []).map((p: any) => ({
        ...p,
        admin_role_name: p.admin_roles?.name ?? null,
      })) as AdminUser[];
    },
  });
}

function useAdminRoleOptions() {
  return useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const { data } = await supabase.from('admin_roles').select('id, name').order('name');
      return (data || []) as Pick<AdminRole, 'id' | 'name'>[];
    },
  });
}

// ─── Create dialog ──────────────────────────────────────────────────────────

function CreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { session } = useAuth();
  const { data: roleOptions = [] } = useAdminRoleOptions();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    admin_role_id: '__super__',
  });

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('create-user', {
        body: {
          role: 'admin',
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim() || undefined,
          admin_role_id: form.admin_role_id === '__super__' ? undefined : form.admin_role_id,
        },
      });
      if (res.error) throw new Error(res.error.message);
      const body = res.data as { error?: string };
      if (body?.error) throw new Error(body.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-admin-users'] });
      toast.success('Usuário admin criado com sucesso.');
      onClose();
      setForm({ full_name: '', email: '', password: '', phone: '', admin_role_id: '__super__' });
    },
    onError: (e: Error) => toast.error('Erro ao criar usuário', { description: e.message }),
  });

  const valid = form.full_name.trim() && form.email.trim() && form.password.length >= 6;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Usuário do Sistema</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nome completo</Label>
            <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="João Silva" />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="joao@arena.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Senha inicial</Label>
            <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone (opcional)</Label>
            <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div className="space-y-1.5">
            <Label>Grupo de permissões</Label>
            <Select value={form.admin_role_id} onValueChange={v => set('admin_role_id', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__super__">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Super Admin (acesso total)
                  </span>
                </SelectItem>
                {roleOptions.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={!valid || mutation.isPending}>
            {mutation.isPending ? 'Criando...' : 'Criar Usuário'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit dialog ─────────────────────────────────────────────────────────────

function EditDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: roleOptions = [] } = useAdminRoleOptions();

  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [adminRoleId, setAdminRoleId] = useState(user.admin_role_id ?? '__super__');

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          admin_role_id: adminRoleId === '__super__' ? null : adminRoleId,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-admin-users'] });
      toast.success('Usuário atualizado.');
      onClose();
    },
    onError: (e: Error) => toast.error('Erro ao atualizar', { description: e.message }),
  });

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Nome completo</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input value={user.email ?? ''} disabled className="opacity-60" />
          </div>
          <div className="space-y-1.5">
            <Label>Telefone</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div className="space-y-1.5">
            <Label>Grupo de permissões</Label>
            <Select value={adminRoleId} onValueChange={setAdminRoleId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__super__">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Super Admin (acesso total)
                  </span>
                </SelectItem>
                {roleOptions.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={!fullName.trim() || mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SystemUsers() {
  const { data: users = [], isLoading } = useAdminUsers();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const qc = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Remove from user_roles (effectively removes admin access)
      const { error } = await supabase
        .from('user_roles')
        .update({ role: 'student' } as any)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-admin-users'] });
      toast.success('Acesso admin removido.');
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error('Erro ao remover acesso', { description: e.message }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Usuários do Sistema</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie quem tem acesso ao painel administrativo.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo Admin
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCog className="h-4 w-4" /> Administradores
          </CardTitle>
          <CardDescription>
            {users.length} usuário{users.length !== 1 ? 's' : ''} com acesso admin
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum usuário admin encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Permissão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.phone || '—'}</TableCell>
                    <TableCell>
                      {u.admin_role_name ? (
                        <Badge variant="secondary">{u.admin_role_name}</Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-primary border-primary/30">
                          <ShieldCheck className="h-3 w-3" /> Super Admin
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === 'active' ? 'default' : 'secondary'}>
                        {u.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTarget(u)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(u)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {createOpen && <CreateDialog open onClose={() => setCreateOpen(false)} />}
      {editTarget && <EditDialog user={editTarget} onClose={() => setEditTarget(null)} />}

      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover acesso admin</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai rebaixar "{deleteTarget?.full_name}" para usuário comum. Ele perderá acesso ao painel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.user_id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover acesso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
