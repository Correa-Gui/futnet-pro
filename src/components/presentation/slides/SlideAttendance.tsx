import SlideLayout from '../SlideLayout';
import { MessageCircle, CheckCircle2, XCircle, Clock, Send, SmartphoneNfc } from 'lucide-react';

export default function SlideAttendance() {
  return (
    <SlideLayout variant="dark">
      <div className="flex-1 flex flex-col">
        <p className="text-[hsl(25,95%,53%)] text-xl font-semibold mb-3 uppercase tracking-widest">Controle de Presença</p>
        <h2 className="text-5xl font-bold mb-12" style={{ fontFamily: 'Syne, sans-serif' }}>
          Confirmação inteligente via WhatsApp
        </h2>

        <div className="flex-1 flex gap-10">
          {/* WhatsApp flow mockup */}
          <div className="w-[500px] bg-white/5 border border-white/10 rounded-2xl p-10 flex flex-col items-center justify-center gap-6">
            <div className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
              <MessageCircle className="w-14 h-14 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold mb-1">Confirmação via WhatsApp</p>
            <p className="text-lg text-white/40 text-center mb-4">Mensagem automática enviada antes da aula. Aluno confirma com um clique.</p>

            {/* Chat bubble mockup */}
            <div className="w-full bg-[hsl(140,40%,15%)] rounded-2xl p-5 space-y-4">
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center shrink-0">
                  <SmartphoneNfc className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="bg-emerald-800/40 rounded-xl rounded-tl-none px-4 py-3 text-sm leading-relaxed">
                  <p className="font-semibold text-emerald-300 mb-1">FutNet Pro</p>
                  <p className="text-white/80">Olá Ana! Sua aula de <strong>Avançado B</strong> é amanhã às <strong>07:00</strong>. Confirma presença?</p>
                  <div className="flex gap-2 mt-3">
                    <span className="bg-emerald-500/30 text-emerald-300 px-3 py-1 rounded-lg text-xs font-semibold">✅ Confirmar</span>
                    <span className="bg-red-500/20 text-red-300 px-3 py-1 rounded-lg text-xs font-semibold">❌ Não irei</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 items-start justify-end">
                <div className="bg-white/10 rounded-xl rounded-tr-none px-4 py-3 text-sm">
                  <p className="text-white/80">✅ Confirmar</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center shrink-0">
                  <SmartphoneNfc className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="bg-emerald-800/40 rounded-xl rounded-tl-none px-4 py-3 text-sm">
                  <p className="text-white/80">Presença confirmada! ✅ Te vemos amanhã, Ana!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance list */}
          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-8">
            <p className="text-2xl font-semibold mb-6">Turma Avançado B — Hoje 07:00</p>
            <div className="space-y-4">
              {[
                { name: 'Ana Silva', status: 'Confirmado', icon: CheckCircle2, color: 'text-emerald-400', via: 'WhatsApp' },
                { name: 'Carlos Lima', status: 'Confirmado', icon: CheckCircle2, color: 'text-emerald-400', via: 'WhatsApp' },
                { name: 'Juliana Rocha', status: 'Confirmado', icon: CheckCircle2, color: 'text-emerald-400', via: 'WhatsApp' },
                { name: 'Pedro Santos', status: 'Ausente', icon: XCircle, color: 'text-red-400', via: 'WhatsApp' },
                { name: 'Mariana Costa', status: 'Pendente', icon: Clock, color: 'text-yellow-400', via: 'Aguardando' },
                { name: 'Roberto Alves', status: 'Confirmado', icon: CheckCircle2, color: 'text-emerald-400', via: 'WhatsApp' },
                { name: 'Fernanda Lima', status: 'Confirmado', icon: CheckCircle2, color: 'text-emerald-400', via: 'WhatsApp' },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-4 bg-white/5 rounded-xl px-6 py-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-sm font-semibold">{s.name.split(' ').map(n=>n[0]).join('')}</span>
                  </div>
                  <span className="text-xl font-medium flex-1">{s.name}</span>
                  <span className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded-md flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" /> {s.via}
                  </span>
                  <s.icon className={`w-6 h-6 ${s.color}`} />
                  <span className={`text-lg font-medium ${s.color}`}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
}
