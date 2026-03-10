import SlideLayout from '../SlideLayout';
import { LayoutDashboard, Users, CreditCard, MessageCircle, BarChart3, Smartphone } from 'lucide-react';

const features = [
  { icon: LayoutDashboard, label: 'Dashboard inteligente' },
  { icon: Users, label: 'Gestão de alunos e turmas' },
  { icon: CreditCard, label: 'Cobranças PIX automáticas' },
  { icon: MessageCircle, label: 'WhatsApp integrado' },
  { icon: BarChart3, label: 'Analytics em tempo real' },
  { icon: Smartphone, label: 'App para alunos e professores' },
];

export default function SlideSolution() {
  return (
    <SlideLayout variant="gradient">
      <div className="flex-1 flex items-center">
        <div className="flex-1">
          <p className="text-[hsl(25,95%,53%)] text-xl font-semibold mb-3 uppercase tracking-widest">A Solução</p>
          <h2 className="text-6xl font-bold mb-6" style={{ fontFamily: 'Syne, sans-serif' }}>
            Tudo que você precisa<br />em uma única plataforma
          </h2>
          <p className="text-2xl text-white/50 mb-14 max-w-[700px] leading-relaxed">
            FutNet Pro automatiza a operação da sua escola, do cadastro do aluno ao recebimento do pagamento.
          </p>
          <div className="grid grid-cols-2 gap-5 max-w-[700px]">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-4 bg-white/5 rounded-xl px-6 py-5 border border-white/10">
                <f.icon className="w-6 h-6 text-[hsl(25,95%,53%)]" />
                <span className="text-xl font-medium">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="w-[600px] h-[600px] relative">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[hsl(201,80%,30%)] to-[hsl(213,45%,15%)] border border-white/10 shadow-2xl flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-[hsl(25,95%,53%)] mx-auto mb-6 flex items-center justify-center">
                <span className="text-3xl font-bold" style={{ fontFamily: 'Bebas Neue, sans-serif' }}>FV</span>
              </div>
              <p className="text-4xl font-bold" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.08em' }}>FUTNET PRO</p>
              <p className="text-lg text-white/40 mt-2">Gestão 360° para escolas de esporte</p>
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
