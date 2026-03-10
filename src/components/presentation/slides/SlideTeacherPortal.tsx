import SlideLayout from '../SlideLayout';
import { ClipboardCheck, GraduationCap, DollarSign, Calendar } from 'lucide-react';

export default function SlideTeacherPortal() {
  return (
    <SlideLayout variant="dark">
      <div className="flex-1 flex flex-col">
        <p className="text-[hsl(25,95%,53%)] text-xl font-semibold mb-3 uppercase tracking-widest">Portal do Professor</p>
        <h2 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
          Ferramentas dedicadas para professores
        </h2>
        <p className="text-2xl text-white/50 mb-12">Visualize turmas, registre presença e acompanhe pagamentos — tudo separado do admin.</p>

        <div className="flex-1 grid grid-cols-2 gap-8">
          {[
            {
              icon: GraduationCap, title: 'Minhas Turmas',
              desc: 'Veja todas as turmas que leciona com horários, alunos e quadras alocadas',
              mock: ['Avançado B — Ter/Qui 07:00', 'Intermediário C — Seg/Qua 17:00', 'Kids — Sáb 09:00']
            },
            {
              icon: ClipboardCheck, title: 'Registrar Presença',
              desc: 'Marque presença dos alunos com um toque. Veja quem confirmou e quem faltou',
              mock: ['✓ Ana Silva', '✓ Carlos Lima', '✗ Pedro Santos', '⏳ Mariana Costa']
            },
            {
              icon: Calendar, title: 'Agenda da Semana',
              desc: 'Calendário semanal com todas as aulas, incluindo substituições',
              mock: ['Seg 08:00 — Avançado B', 'Ter 07:00 — Avançado B', 'Qua 17:00 — Intermediário C']
            },
            {
              icon: DollarSign, title: 'Meus Pagamentos',
              desc: 'Acompanhe o cálculo de pagamentos por aulas dadas, com extrato mensal',
              mock: ['Fev: 32 aulas × R$80 = R$2.560', 'Mar: 28 aulas × R$80 = R$2.240']
            },
          ].map((card, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[hsl(201,80%,30%)]/40 flex items-center justify-center">
                  <card.icon className="w-6 h-6 text-[hsl(201,80%,50%)]" />
                </div>
                <h3 className="text-2xl font-bold">{card.title}</h3>
              </div>
              <p className="text-lg text-white/50 mb-6">{card.desc}</p>
              <div className="flex-1 bg-white/5 rounded-xl p-5 space-y-3">
                {card.mock.map((m, j) => (
                  <p key={j} className="text-lg text-white/60">{m}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
}
