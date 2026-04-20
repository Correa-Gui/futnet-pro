import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { DollarSign, CheckCircle, Clock, Users, TrendingUp, Copy, QrCode } from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const monthOptions = () => {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    opts.push({
      value: format(d, 'yyyy-MM'),
      label: format(d, "MMMM 'de' yyyy", { locale: ptBR }),
    });
  }
  return opts;
};

type PaymentRow = {
  id: string;
  status: string;
  total_amount: number;
  total_classes: number;
  rate_per_class: number;
  teacher_name: string;
  pix_key: string | null;
};

export default function TeacherPayments() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [payingPayment, setPayingPayment] = useState<PaymentRow | null>(null);
  const months = monthOptions();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['admin-teacher-payments', selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teacher_payments')
        .select('*, teacher_profiles(id, user_id, rate_per_class, pix_key)')
        .eq('reference_month', selectedMonth)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map((p: any) => p.teacher_profiles?.user_id).filter(Boolean))];
      if (userIds.length === 0) return data || [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.full_name]));

      return (data || []).map((p: any) => ({
        ...p,
        teacher_name: nameMap[p.teacher_profiles?.user_id] || 'Professor',
        pix_key: p.teacher_profiles?.pix_key ?? null,
      }));
    },
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('teacher_payments')
        .update({ status: 'paid', paid_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teacher-payments'] });
      toast.success('Pagamento marcado como pago!');
      setPayingPayment(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalAmount = payments.reduce((s: number, p: any) => s + Number(p.total_amount), 0);
  const paidAmount = payments.filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + Number(p.total_amount), 0);
  const pendingAmount = totalAmount - paidAmount;
  const totalClasses = payments.reduce((s: number, p: any) => s + (p.total_classes || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold font-brand">Pagamentos de Professores</h2>
          <p className="text-sm text-muted-foreground">Gerencie os pagamentos mensais dos professores</p>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map(m => (
              <SelectItem key={m.value} value={m.value} className="capitalize">{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total do Mês', value: formatCurrency(totalAmount), icon: DollarSign, color: 'bg-primary/10 text-primary' },
          { label: 'Pago', value: formatCurrency(paidAmount), icon: CheckCircle, color: 'bg-emerald-500/10 text-emerald-600' },
          { label: 'Pendente', value: formatCurrency(pendingAmount), icon: Clock, color: 'bg-amber-500/10 text-amber-600' },
          { label: 'Aulas no Mês', value: totalClasses, icon: TrendingUp, color: 'bg-blue-500/10 text-blue-600' },
        ].map((kpi, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Payments list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detalhamento por Professor</CardTitle>
          <CardDescription>
            {payments.length === 0 ? 'Nenhum pagamento registrado para este mês.' : `${payments.length} professor(es)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Carregando...</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum pagamento para este período.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment: any, i: number) => (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between rounded-xl border border-border p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {(payment.teacher_name || 'P')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{payment.teacher_name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{payment.total_classes || 0} aulas</span>
                        <span>·</span>
                        <span>{formatCurrency(Number(payment.rate_per_class))}/aula</span>
                        {payment.pix_key && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <QrCode className="h-3 w-3" />
                              PIX cadastrado
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(Number(payment.total_amount))}</p>
                      <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'} className="text-[10px]">
                        {payment.status === 'paid' ? 'Pago' : 'Pendente'}
                      </Badge>
                    </div>
                    {payment.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => setPayingPayment(payment)}
                      >
                        <DollarSign className="mr-1.5 h-3.5 w-3.5" />
                        Pagar
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment confirmation dialog */}
      <Dialog open={!!payingPayment} onOpenChange={(v) => { if (!v) setPayingPayment(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pagar Professor</DialogTitle>
            <DialogDescription>
              Realize a transferência e confirme o pagamento.
            </DialogDescription>
          </DialogHeader>

          {payingPayment && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Professor</span>
                  <span className="font-medium">{payingPayment.teacher_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Aulas</span>
                  <span className="font-medium">{payingPayment.total_classes} aulas × {formatCurrency(Number(payingPayment.rate_per_class))}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2 mt-1">
                  <span className="text-muted-foreground font-medium">Total</span>
                  <span className="font-bold text-lg">{formatCurrency(Number(payingPayment.total_amount))}</span>
                </div>
              </div>

              {payingPayment.pix_key ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-primary" />
                    Chave PIX
                  </p>
                  <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
                    <span className="flex-1 text-sm font-mono break-all">{payingPayment.pix_key}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(payingPayment.pix_key!);
                        toast.success('Chave PIX copiada!');
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Copie a chave PIX, realize a transferência no seu banco e confirme abaixo.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-3">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Este professor não tem chave PIX cadastrada. Cadastre a chave na aba de Professores antes de pagar.
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPayingPayment(null)}>Cancelar</Button>
            <Button
              onClick={() => payingPayment && markPaid.mutate(payingPayment.id)}
              disabled={markPaid.isPending}
            >
              <CheckCircle className="mr-1.5 h-4 w-4" />
              {markPaid.isPending ? 'Confirmando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
