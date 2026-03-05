import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt, Calendar, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'outline' },
  paid: { label: 'Pago', variant: 'default' },
  overdue: { label: 'Vencida', variant: 'destructive' },
  cancelled: { label: 'Cancelada', variant: 'secondary' },
};

export default function StudentInvoices() {
  const { user } = useAuth();

  const { data: studentProfile } = useQuery({
    queryKey: ['student-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('student_profiles').select('id').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['student-invoices', studentProfile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('student_id', studentProfile!.id)
        .order('due_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!studentProfile,
  });

  const pendingTotal = invoices
    .filter(i => ['pending', 'overdue'].includes(i.status))
    .reduce((sum, i) => sum + Number(i.amount) - Number(i.discount || 0), 0);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Minhas Faturas</h2>
        <p className="text-sm text-muted-foreground">Acompanhe seus pagamentos</p>
      </div>

      {pendingTotal > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium">Valor em aberto</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(pendingTotal)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-center text-muted-foreground py-8">Carregando...</p>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma fatura encontrada.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const statusInfo = STATUS_MAP[inv.status] || STATUS_MAP.pending;
            const finalAmount = Number(inv.amount) - Number(inv.discount || 0);
            return (
              <Card key={inv.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                        <p className="font-semibold">{inv.reference_month}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Vencimento: {format(parseISO(inv.due_date), 'dd/MM/yyyy')}</span>
                      </div>
                      {inv.paid_at && (
                        <p className="text-xs text-muted-foreground">
                          Pago em {format(parseISO(inv.paid_at), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                      {inv.notes && <p className="text-xs text-muted-foreground">{inv.notes}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      <p className="text-lg font-bold">{formatCurrency(finalAmount)}</p>
                      {Number(inv.discount) > 0 && (
                        <p className="text-xs text-muted-foreground line-through">{formatCurrency(Number(inv.amount))}</p>
                      )}
                    </div>
                  </div>
                  {inv.pix_copy_paste && inv.status === 'pending' && (
                    <div className="mt-3 rounded-md border border-border bg-muted/50 p-3">
                      <p className="text-xs font-medium mb-1">PIX Copia e Cola:</p>
                      <p className="text-xs text-muted-foreground break-all select-all">{inv.pix_copy_paste}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
