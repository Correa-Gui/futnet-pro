import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Receipt, Calendar, AlertCircle, QrCode, Copy, CheckCircle, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'outline' },
  paid: { label: 'Pago', variant: 'default' },
  overdue: { label: 'Vencida', variant: 'destructive' },
  cancelled: { label: 'Cancelada', variant: 'secondary' },
};

export default function StudentInvoices() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pixDialog, setPixDialog] = useState<{ qr_code: string; qr_code_base64: string; copy_paste: string; invoiceId?: string; expiresAt?: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for payment status while PIX dialog is open
  useEffect(() => {
    if (pixDialog?.invoiceId) {
      pollingRef.current = setInterval(async () => {
        const { data } = await supabase
          .from('invoices')
          .select('status')
          .eq('id', pixDialog.invoiceId!)
          .single();
        
        if (data?.status === 'paid') {
          setPixDialog(null);
          toast.success('Pagamento confirmado!');
          queryClient.invalidateQueries({ queryKey: ['student-invoices'] });
        }
      }, 5000);

      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }
  }, [pixDialog?.invoiceId, queryClient]);

  // Countdown timer for QR code expiration
  useEffect(() => {
    if (pixDialog?.expiresAt) {
      const updateCountdown = () => {
        const remaining = Math.max(0, Math.floor((new Date(pixDialog.expiresAt!).getTime() - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          if (pollingRef.current) clearInterval(pollingRef.current);
          setPixDialog(null);
          toast.info('QR Code expirado. Gere um novo para continuar.');
          queryClient.invalidateQueries({ queryKey: ['student-invoices'] });
        }
      };
      updateCountdown();
      countdownRef.current = setInterval(updateCountdown, 1000);

      return () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    }
  }, [pixDialog?.expiresAt, queryClient]);

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

  const generatePixMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sessão expirada, faça login novamente');

      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: { invoice_id: invoiceId },
      });
      if (error) throw new Error(error.message || 'Erro ao gerar PIX');
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, invoiceId) => {
      queryClient.invalidateQueries({ queryKey: ['student-invoices'] });
      setPixDialog({
        qr_code: data.qr_code,
        qr_code_base64: data.qr_code_base64,
        copy_paste: data.qr_code,
        invoiceId,
        expiresAt: data.expires_at,
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleCopyPix = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Código PIX copiado!');
  };

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
            const canPay = inv.status === 'pending' || inv.status === 'overdue';
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

                  {canPay && (
                    <div className="mt-3">
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => generatePixMutation.mutate(inv.id)}
                        disabled={generatePixMutation.isPending}
                      >
                        <QrCode className="mr-2 h-4 w-4" />
                        {generatePixMutation.isPending ? 'Gerando...' : 'Pagar via PIX'}
                      </Button>
                    </div>
                  )}

                  {inv.status === 'paid' && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-primary">
                      <CheckCircle className="h-4 w-4" />
                      <span>Pagamento confirmado</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* PIX Dialog */}
      <Dialog open={!!pixDialog} onOpenChange={(open) => {
        if (!open) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (countdownRef.current) clearInterval(countdownRef.current);
          setPixDialog(null);
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Pagamento PIX</DialogTitle>
            <DialogDescription className="text-center">Escaneie o QR Code ou copie o código para pagar</DialogDescription>
          </DialogHeader>
          {pixDialog && (
            <div className="space-y-4">
              {/* Countdown timer */}
              {timeLeft > 0 && (
                <div className={`flex items-center justify-center gap-2 rounded-md p-2 text-sm font-medium ${
                  timeLeft <= 60 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                }`}>
                  <Clock className="h-4 w-4" />
                  <span>Expira em {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
                </div>
              )}

              {pixDialog.qr_code_base64 && (
                <div className="flex justify-center">
                  <img
                    src={`data:image/png;base64,${pixDialog.qr_code_base64}`}
                    alt="QR Code PIX"
                    className="w-48 h-48 rounded-lg border"
                  />
                </div>
              )}
              <div className="rounded-md border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground break-all select-all font-mono">
                  {pixDialog.copy_paste}
                </p>
              </div>
              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleCopyPix(pixDialog.copy_paste)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar código PIX
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
