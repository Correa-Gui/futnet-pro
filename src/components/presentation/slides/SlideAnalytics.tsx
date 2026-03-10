import SlideLayout from '../SlideLayout';
import { TrendingUp, Users, DollarSign, BarChart3 } from 'lucide-react';

export default function SlideAnalytics() {
  return (
    <SlideLayout variant="dark">
      <div className="flex-1 flex flex-col">
        <p className="text-[hsl(25,95%,53%)] text-xl font-semibold mb-3 uppercase tracking-widest">Analytics</p>
        <h2 className="text-5xl font-bold mb-12" style={{ fontFamily: 'Syne, sans-serif' }}>
          Dados que impulsionam decisões inteligentes
        </h2>

        <div className="grid grid-cols-3 gap-6 mb-8">
          {[
            { label: 'Receita Mensal', value: 'R$ 38.4k', trend: '+12%', icon: DollarSign },
            { label: 'Retenção', value: '92%', trend: '+3%', icon: Users },
            { label: 'Crescimento', value: '+15 alunos', trend: 'este mês', icon: TrendingUp },
          ].map((k, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <div className="flex items-center justify-between mb-4">
                <k.icon className="w-6 h-6 text-[hsl(201,80%,50%)]" />
                <span className="text-lg text-emerald-400 font-medium">{k.trend}</span>
              </div>
              <p className="text-4xl font-bold mb-1">{k.value}</p>
              <p className="text-lg text-white/40">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 flex gap-6">
          {/* Chart mockup */}
          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="w-5 h-5 text-white/40" />
              <span className="text-xl font-semibold">Evolução de Alunos Ativos</span>
            </div>
            <div className="flex items-end gap-3 h-[300px]">
              {[60, 68, 72, 78, 82, 85, 91, 95, 102, 110, 118, 127].map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-sm text-white/30">{v}</span>
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-[hsl(201,80%,25%)] to-[hsl(201,80%,45%)]" style={{ height: `${(v/130)*280}px` }} />
                  <span className="text-xs text-white/30">{['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pie chart mockup */}
          <div className="w-[400px] bg-white/5 border border-white/10 rounded-2xl p-8">
            <p className="text-xl font-semibold mb-6">Distribuição por Nível</p>
            <div className="flex-1 flex items-center justify-center">
              <div className="relative w-52 h-52">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(25,95%,53%)" strokeWidth="20" strokeDasharray="75 175" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(201,80%,45%)" strokeWidth="20" strokeDasharray="62 188" strokeDashoffset="-75" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(152,60%,40%)" strokeWidth="20" strokeDasharray="50 200" strokeDashoffset="-137" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(38,92%,50%)" strokeWidth="20" strokeDasharray="63 187" strokeDashoffset="-187" />
                </svg>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {[
                { label: 'Iniciante', pct: '30%', color: 'bg-[hsl(25,95%,53%)]' },
                { label: 'Elementar', pct: '25%', color: 'bg-[hsl(201,80%,45%)]' },
                { label: 'Intermediário', pct: '20%', color: 'bg-[hsl(152,60%,40%)]' },
                { label: 'Avançado', pct: '25%', color: 'bg-[hsl(38,92%,50%)]' },
              ].map((l, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${l.color}`} />
                  <span className="text-lg text-white/60 flex-1">{l.label}</span>
                  <span className="text-lg font-medium">{l.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
