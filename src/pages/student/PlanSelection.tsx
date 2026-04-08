import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, CalendarDays, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Plan = {
  id: string;
  name: string;
  description: string | null;
  classes_per_week: number;
  monthly_price: number;
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function PlanSelection() {
  const { refreshStudentProfile } = useAuth();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('id, name, description, classes_per_week, monthly_price')
        .eq('is_active', true)
        .order('monthly_price');
      if (error) throw error;
      return data as Plan[];
    },
  });

  const handleConfirm = async () => {
    if (!selectedId) return;
    setIsSubmitting(true);
    const { error } = await supabase.rpc('select_student_plan', { p_plan_id: selectedId });
    if (error) {
      toast.error('Erro ao selecionar plano', { description: error.message });
      setIsSubmitting(false);
      return;
    }
    await refreshStudentProfile();
    toast.success('Plano selecionado!', { description: 'Sua primeira fatura foi gerada.' });
    navigate('/aluno');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      {/* Brand */}
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
          <span className="text-2xl font-bold text-primary-foreground font-brand">FV</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Escolha seu plano</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          Selecione o plano que melhor se encaixa na sua rotina. Você poderá pagar sua mensalidade pela área do aluno.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando planos...</span>
        </div>
      ) : (
        <div className="w-full max-w-2xl space-y-4">
          {plans.map((plan) => {
            const isSelected = selectedId === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedId(plan.id)}
                className="w-full text-left"
              >
                <Card
                  className={cn(
                    'cursor-pointer transition-all duration-150 border-2',
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/40 hover:shadow-sm'
                  )}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        {plan.description && (
                          <CardDescription className="mt-0.5">{plan.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-2xl font-bold text-foreground">
                          {formatCurrency(plan.monthly_price)}
                        </span>
                        <span className="text-xs text-muted-foreground">/mês</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <Badge variant="secondary" className="gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {plan.classes_per_week}x por semana
                    </Badge>
                  </CardContent>
                  {isSelected && (
                    <CardFooter className="pt-0 pb-3">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                        Selecionado
                      </div>
                    </CardFooter>
                  )}
                </Card>
              </button>
            );
          })}

          <Button
            className="w-full mt-2"
            size="lg"
            disabled={!selectedId || isSubmitting}
            onClick={handleConfirm}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirmando...
              </>
            ) : (
              'Confirmar plano'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
