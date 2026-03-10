import SlideLayout from '../SlideLayout';
import { Check, Star } from 'lucide-react';

const plans = [
  { name: 'Básico', price: 'R$ 180', freq: '2x por semana', features: ['2 aulas semanais', 'Acesso ao app', 'Presença digital', 'Suporte WhatsApp'], highlight: false },
  { name: 'Premium', price: 'R$ 280', freq: '3x por semana', features: ['3 aulas semanais', 'Acesso ao app', 'Presença digital', 'Suporte WhatsApp', 'Prioridade em turmas', 'Análise de desempenho'], highlight: true },
  { name: 'Ilimitado', price: 'R$ 450', freq: 'Sem limite', features: ['Aulas ilimitadas', 'Acesso ao app', 'Presença digital', 'Suporte WhatsApp', 'Prioridade em turmas', 'Análise de desempenho', 'Reserva de quadra grátis'], highlight: false },
];

export default function SlidePlans() {
  return (
    <SlideLayout variant="dark">
      <div className="flex-1 flex flex-col">
        <p className="text-[hsl(25,95%,53%)] text-xl font-semibold mb-3 uppercase tracking-widest">Planos e Mensalidades</p>
        <h2 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
          Crie planos flexíveis para cada perfil de aluno
        </h2>
        <p className="text-2xl text-white/50 mb-14">Configure preços, frequência semanal e benefícios. Tudo editável pelo admin.</p>

        <div className="flex-1 flex gap-8 items-stretch">
          {plans.map((p, i) => (
            <div key={i} className={`flex-1 rounded-2xl p-8 flex flex-col ${p.highlight ? 'bg-gradient-to-b from-[hsl(25,95%,53%)] to-[hsl(25,80%,40%)] shadow-2xl scale-105' : 'bg-white/5 border border-white/10'}`}>
              {p.highlight && (
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-5 h-5" />
                  <span className="text-lg font-bold uppercase tracking-wider">Mais Popular</span>
                </div>
              )}
              <h3 className="text-3xl font-bold mb-2">{p.name}</h3>
              <p className="text-5xl font-bold mb-1">{p.price}</p>
              <p className={`text-lg mb-8 ${p.highlight ? 'text-white/70' : 'text-white/40'}`}>/mês • {p.freq}</p>
              <div className="space-y-4 flex-1">
                {p.features.map((f, j) => (
                  <div key={j} className="flex items-center gap-3">
                    <Check className={`w-5 h-5 ${p.highlight ? 'text-white' : 'text-emerald-400'}`} />
                    <span className="text-xl">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
}
