import SlideLayout from '../SlideLayout';
import { Smartphone, Calendar, Receipt, User, Bell } from 'lucide-react';

export default function SlideStudentPortal() {
  return (
    <SlideLayout variant="dark">
      <div className="flex-1 flex flex-col">
        <p className="text-[hsl(25,95%,53%)] text-xl font-semibold mb-3 uppercase tracking-widest">Portal do Aluno</p>
        <h2 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
          App mobile-first para seus alunos
        </h2>
        <p className="text-2xl text-white/50 mb-12">Acesso a aulas, faturas, presença e perfil — tudo na palma da mão.</p>

        <div className="flex-1 flex items-center justify-center gap-16">
          {/* Phone mockup */}
          <div className="w-[340px] h-[680px] bg-[hsl(213,45%,8%)] rounded-[40px] border-4 border-white/10 p-4 flex flex-col overflow-hidden">
            {/* Status bar */}
            <div className="flex items-center justify-between px-4 py-2 text-sm text-white/40">
              <span>09:41</span>
              <div className="flex gap-1">
                <div className="w-4 h-2 rounded-sm bg-white/30" />
                <div className="w-4 h-2 rounded-sm bg-white/20" />
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 bg-white/5 rounded-2xl p-5 overflow-hidden">
              <p className="text-xl font-bold mb-1">Olá, Ana! 👋</p>
              <p className="text-sm text-white/40 mb-5">Suas próximas aulas</p>
              
              <div className="space-y-3 mb-5">
                {[
                  { day: 'Hoje', time: '08:00', class: 'Avançado B', court: 'Quadra 1' },
                  { day: 'Amanhã', time: '08:00', class: 'Avançado B', court: 'Quadra 1' },
                ].map((a, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-base font-semibold">{a.class}</span>
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">{a.day}</span>
                    </div>
                    <p className="text-sm text-white/40">{a.time} • {a.court}</p>
                  </div>
                ))}
              </div>

              <p className="text-sm font-semibold mb-2 text-white/60">Fatura aberta</p>
              <div className="bg-[hsl(25,95%,53%)]/10 border border-[hsl(25,95%,53%)]/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold">Março 2026</span>
                  <span className="text-lg font-bold text-[hsl(25,95%,53%)]">R$ 280</span>
                </div>
                <p className="text-xs text-white/40 mt-1">Vence em 10/03</p>
              </div>
            </div>
            {/* Bottom nav */}
            <div className="flex items-center justify-around py-3 mt-2">
              {[Calendar, Receipt, User, Bell].map((Icon, i) => (
                <Icon key={i} className={`w-5 h-5 ${i === 0 ? 'text-[hsl(25,95%,53%)]' : 'text-white/30'}`} />
              ))}
            </div>
          </div>

          {/* Features list */}
          <div className="flex flex-col gap-8 max-w-[600px]">
            {[
              { title: 'Próximas aulas', desc: 'Visualize o calendário de aulas da semana com horário e local' },
              { title: 'Confirmar presença', desc: 'Confirme presença com um toque ou escaneie o QR Code' },
              { title: 'Faturas e pagamento', desc: 'Veja faturas abertas e pague via PIX diretamente pelo app' },
              { title: 'Histórico de frequência', desc: 'Acompanhe sua taxa de presença e evolução ao longo do tempo' },
              { title: 'Perfil e dados', desc: 'Atualize informações pessoais, nível e preferências' },
            ].map((f, i) => (
              <div key={i} className="flex gap-5">
                <div className="w-10 h-10 rounded-xl bg-[hsl(25,95%,53%)]/20 flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-[hsl(25,95%,53%)]">{i+1}</span>
                </div>
                <div>
                  <p className="text-2xl font-bold mb-1">{f.title}</p>
                  <p className="text-lg text-white/50">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
