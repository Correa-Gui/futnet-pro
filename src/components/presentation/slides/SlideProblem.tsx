import SlideLayout from '../SlideLayout';
import { AlertTriangle, Clock, FileSpreadsheet, PhoneOff, DollarSign, Users } from 'lucide-react';

const problems = [
  { icon: FileSpreadsheet, title: 'Planilhas manuais', desc: 'Controle de alunos, turmas e pagamentos em planilhas que se perdem' },
  { icon: Clock, title: 'Tempo perdido', desc: 'Horas gastas com presença manual e cobranças por WhatsApp' },
  { icon: PhoneOff, title: 'Comunicação falha', desc: 'Mensagens esquecidas, alunos que não recebem avisos' },
  { icon: DollarSign, title: 'Inadimplência', desc: 'Sem controle automático de faturas e cobranças PIX' },
  { icon: Users, title: 'Crescimento travado', desc: 'Sem dados para tomar decisões e escalar o negócio' },
  { icon: AlertTriangle, title: 'Retrabalho', desc: 'Informações duplicadas, erros de lançamento constantes' },
];

export default function SlideProblem() {
  return (
    <SlideLayout variant="dark">
      <div className="flex-1 flex flex-col">
        <p className="text-[hsl(25,95%,53%)] text-xl font-semibold mb-3 uppercase tracking-widest">O Problema</p>
        <h2 className="text-6xl font-bold mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
          A gestão manual é o maior<br />inimigo do seu crescimento
        </h2>
        <p className="text-2xl text-white/50 mb-14 max-w-[800px]">
          Escolas de esporte ainda dependem de ferramentas genéricas que não foram feitas para esse mercado.
        </p>
        <div className="grid grid-cols-3 gap-6 flex-1">
          {problems.map((p, i) => (
            <div key={i} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 flex flex-col gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <p.icon className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-2xl font-bold">{p.title}</h3>
              <p className="text-lg text-white/50 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
}
