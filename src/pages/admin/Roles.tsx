import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ADMIN_MENU_GROUPS } from '@/lib/adminMenus';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AdminRole = Database['public']['Tables']['admin_roles']['Row'];

const ALL_MENU_KEYS = ADMIN_MENU_GROUPS.flatMap(g => g.items.map(i => i.key));

function RoleDialog({
  open,
  role,
  onClose,
}: {
  open: boolean;
  role: AdminRole | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!role;

  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [selectedMenus, setSelectedMenus] = useState<string[]>(role?.allowed_menus ?? []);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        const { error } = await supabase
          .from('admin_roles')
          .update({ name: name.trim(), description: description.trim() || null, allowed_menus: selectedMenus, updated_at: new Date().toISOString() })
          .eq('id', role!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('admin_roles')
          .insert({ name: name.trim(), description: description.trim() || null, allowed_menus: selectedMenus });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-roles'] });
      toast.success(isEdit ? 'Permissão atualizada.' : 'Permissão criada.');
      onClose();
    },
    onError: (e: Error) => toast.error('Erro ao salvar', { description: e.message }),
  });

  const toggleMenu = (key: string) => {
    setSelectedMenus(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleGroup = (keys: string[]) => {
    const allSelected = keys.every(k => selectedMenus.includes(k));
    if (allSelected) {
      setSelectedMenus(prev => prev.filter(k => !keys.includes(k)));
    } else {
      setSelectedMenus(prev => [...new Set([...prev, ...keys])]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Permissão' : 'Nova Permissão'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="role-name">Nome</Label>
            <Input
              id="role-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Administrador"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="role-desc">Descrição (opcional)</Label>
            <Textarea
              id="role-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva o que esse nível de acesso pode fazer"
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <Label>Menus acessíveis</Label>
            {ADMIN_MENU_GROUPS.map(group => {
              const groupKeys = group.items.map(i => i.key);
              const allChecked = groupKeys.every(k => selectedMenus.includes(k));
              const someChecked = groupKeys.some(k => selectedMenus.includes(k));
              return (
                <div key={group.label}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Checkbox
                      id={`group-${group.label}`}
                      checked={allChecked}
                      onCheckedChange={() => toggleGroup(groupKeys)}
                      className={someChecked && !allChecked ? 'opacity-60' : ''}
                    />
                    <label htmlFor={`group-${group.label}`} className="text-sm font-medium cursor-pointer">
                      {group.label}
                    </label>
                  </div>
                  <div className="ml-6 grid grid-cols-2 gap-1.5">
                    {group.items.map(item => (
                      <div key={item.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`menu-${item.key}`}
                          checked={selectedMenus.includes(item.key)}
                          onCheckedChange={() => toggleMenu(item.key)}
                        />
                        <label htmlFor={`menu-${item.key}`} className="text-sm text-muted-foreground cursor-pointer">
                          {item.title}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || mutation.isPending}
          >
            {mutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Roles() {
  const qc = useQueryClient();
  const [dialogRole, setDialogRole] = useState<AdminRole | null | 'new'>('new' as any);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminRole | null>(null);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as AdminRole[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('admin_roles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-roles'] });
      toast.success('Permissão removida.');
      setDeleteTarget(null);
    },
    onError: (e: Error) => toast.error('Erro ao remover', { description: e.message }),
  });

  const openCreate = () => {
    setDialogRole(null);
    setDialogOpen(true);
  };

  const openEdit = (role: AdminRole) => {
    setDialogRole(role);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Permissões</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Crie grupos de acesso e defina quais menus cada grupo pode visualizar.
            Usuários do sistema sem grupo atribuído são tratados como Super Admin (acesso total).
          </p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Nova Permissão
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Grupos de Acesso
          </CardTitle>
          <CardDescription>
            {roles.length} grupo{roles.length !== 1 ? 's' : ''} configurado{roles.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
          ) : roles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum grupo criado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Menus liberados</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map(role => (
                  <TableRow key={role.id}>
                    <TableCell className="font-medium">{role.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {role.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {role.allowed_menus.length} / {ALL_MENU_KEYS.length}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(role)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(role)}
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

      <RoleDialog
        open={dialogOpen}
        role={dialogRole as AdminRole | null}
        onClose={() => setDialogOpen(false)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover permissão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover "{deleteTarget?.name}"?
              Usuários com essa permissão perderão o grupo atribuído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
