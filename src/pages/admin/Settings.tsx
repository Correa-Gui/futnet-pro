import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useBusinessHours, type BusinessHours, DEFAULT_BUSINESS_HOURS } from '@/hooks/useBusinessHours';
import { Badge } from '@/components/ui/badge';
import { Clock, Building2 } from 'lucide-react';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function Settings() {
  const { data: bh } = useBusinessHours();
  const hours: BusinessHours = bh || DEFAULT_BUSINESS_HOURS;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
          Configurações
        </h2>
        <p className="text-sm text-muted-foreground">Configurações gerais do sistema</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">Informações do Negócio</CardTitle>
            <CardDescription>Dados gerais da arena</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p>Em breve: nome, logo, endereço, CNPJ e dados de contato.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">Horário de Funcionamento</CardTitle>
            <CardDescription>
              Configure na aba <strong>Landing Page</strong> do menu lateral
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            {DAY_LABELS.map((label, i) => (
              <Badge key={i} variant={hours.open_days.includes(i) ? 'default' : 'outline'}>
                {label}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Aberto das <strong>{String(hours.open_hour).padStart(2, '0')}:00</strong> às{' '}
            <strong>{String(hours.close_hour).padStart(2, '0')}:00</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
