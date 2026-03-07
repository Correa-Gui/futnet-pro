import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Plan = {
  id: string;
  name: string;
  description: string | null;
  classes_per_week: number;
  monthly_price: number;
  is_active: boolean;
};

export default function Plans() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState({ name: '', description: '', classes_per_week: 2, monthly_price: 0, is_active: true });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('plans').select('*').order('monthly_price');
      if (error) throw error;
      return data as Plan[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      const payload = { name: data.name, description: data.description || null, classes_per_week: data.classes_per_week, monthly_price: data.monthly_price, is_active: data.is_active };
      if (data.id) {
        const { error } = await supabase.from('plans').update(payload).eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('plans').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['plans'] }); toast.success(editing ? 'Plano atualizado!' : 'Plano criado!'); handleClose(); },
    onError: (e: Error) => toast.error('Erro', { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('plans').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['plans'] }); toast.success('Plano removido!'); },
    onError: (e: Error) => toast.error('Erro ao remover', { description: e.message }),
  });

  const handleOpen = (plan?: Plan) => {
    if (plan) { setEditing(plan); setForm({ name: plan.name, description: plan.description || '', classes_per_week: plan.classes_per_week, monthly_price: plan.monthly_price, is_active: plan.is_active }); }
    else { setEditing(null); setForm({ name: '', description: '', classes_per_week: 2, monthly_price: 0, is_active: true }); }
    setOpen(true);
  };

  const handleClose = () => { setOpen(false); setEditing(null); };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-brand">Planos</h2>
          <p className="text-sm text-muted-foreground">Gerencie os planos de mensalidade</p>
        </div>
        <Button onClick={() => handleOpen()}><Plus className="mr-2 h-4 w-4" />Novo Plano</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Aulas/Semana</TableHead>
                <TableHead>Valor Mensal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : plans.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum plano cadastrado</TableCell></TableRow>
              ) : plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>{plan.classes_per_week >= 99 ? 'Ilimitado' : `${plan.classes_per_week}x`}</TableCell>
                  <TableCell>{formatCurrency(plan.monthly_price)}</TableCell>
                  <TableCell><Badge variant={plan.is_active ? 'default' : 'secondary'}>{plan.is_active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpen(plan)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm('Remover este plano?')) deleteMutation.mutate(plan.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Editar Plano' : 'Novo Plano'}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate({ ...form, id: editing?.id }); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Plano 2x/semana" required />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes do plano..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Aulas por semana *</Label>
                <Input type="number" min={1} max={99} value={form.classes_per_week} onChange={(e) => setForm({ ...form, classes_per_week: parseInt(e.target.value) || 1 })} required />
                <p className="text-xs text-muted-foreground">Use 99 para ilimitado</p>
              </div>
              <div className="space-y-2">
                <Label>Valor mensal (R$) *</Label>
                <Input type="number" min={0} step={0.01} value={form.monthly_price} onChange={(e) => setForm({ ...form, monthly_price: parseFloat(e.target.value) || 0 })} required />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Plano ativo</Label>
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
