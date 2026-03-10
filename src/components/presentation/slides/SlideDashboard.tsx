import SlideLayout from '../SlideLayout';
import { Users, DollarSign, GraduationCap, TrendingUp } from 'lucide-react';

const kpis = [
  { icon: Users, label: 'Alunos Ativos', value: '127', change: '+12%' },
  { icon: GraduationCap, label: 'Turmas', value: '18', change: '+3' },
  { icon: DollarSign, label: 'Receita Mensal', value: 'R$ 38.400', change: '+8%' },
  { icon: TrendingUp, label: 'Taxa de Presença', value: '94%', change: '+2%' },
];

export default function SlideDashboard() {
  return (
    <SlideLayout variant="dark">
      <div className="flex-1 flex flex-col">
        <p className="text-[hsl(25,95%,53%)] text-xl font-semibold mb-3 uppercase tracking-widest">Dashboard</p>
        <h2 className="text-5xl font-bold mb-12" style={{ fontFamily: 'Syne, sans-serif' }}>
          Visão completa do seu negócio em tempo real
        </h2>

        <div className="grid grid-cols-4 gap-6 mb-10">
          {kpis.map((k, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-xl bg-[hsl(201,80%,30%)]/40 flex items-center justify-center">
                  <k.icon className="w-5 h-5 text-[hsl(201,80%,50%)]" />
                </div>
                <span className="text-lg text-emerald-400 font-semibold">{k.change}</span>
              </div>
              <p className="text-4xl font-bold mb-1">{k.value}</p>
              <p className="text-lg text-white/40">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Mock chart area */}
        <div className="flex-1 grid grid-cols-5 gap-6">
          <div className="col-span-3 bg-white/5 border border-white/10 rounded-2xl p-8">
            <p className="text-xl font-semibold mb-6">Receita Mensal</p>
            <div className="flex items-end gap-4 h-[250px]">
              {[45, 62, 55, 78, 65, 82, 90, 72, 88, 95, 85, 100].map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-[hsl(201,80%,30%)] to-[hsl(25,95%,53%)]" style={{ height: `${h * 2.5}px` }} />
                  <span className="text-xs text-white/30">{['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-2 bg-white/5 border border-white/10 rounded-2xl p-8">
            <p className="text-xl font-semibold mb-6">Ações Pendentes</p>
            <div className="space-y-4">
              {[
                { label: '5 faturas vencidas', color: 'bg-red-500' },
                { label: '3 aulas teste pendentes', color: 'bg-[hsl(25,95%,53%)]' },
                { label: '2 alunos sem turma', color: 'bg-yellow-500' },
                { label: '8 presenças para confirmar', color: 'bg-[hsl(201,80%,50%)]' },
              ].map((a, i) => (
                <div key={i} className="flex items-center gap-4 bg-white/5 rounded-xl px-5 py-4">
                  <div className={`w-3 h-3 rounded-full ${a.color}`} />
                  <span className="text-lg text-white/70">{a.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
