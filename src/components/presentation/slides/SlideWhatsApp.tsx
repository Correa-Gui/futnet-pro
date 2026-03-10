import SlideLayout from '../SlideLayout';
import { MessageCircle, Send, FileText, Users } from 'lucide-react';

export default function SlideWhatsApp() {
  return (
    <SlideLayout variant="dark">
      <div className="flex-1 flex flex-col">
        <p className="text-[hsl(25,95%,53%)] text-xl font-semibold mb-3 uppercase tracking-widest">WhatsApp</p>
        <h2 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
          Comunicação automatizada com seus alunos
        </h2>
        <p className="text-2xl text-white/50 mb-12">Templates prontos, envio em massa e histórico completo de mensagens.</p>

        <div className="flex-1 flex gap-8">
          {/* Chat mockup */}
          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
            <div className="bg-emerald-600/30 px-8 py-5 flex items-center gap-4 border-b border-white/10">
              <MessageCircle className="w-7 h-7 text-emerald-400" />
              <span className="text-2xl font-semibold">WhatsApp Business</span>
            </div>
            <div className="flex-1 p-8 space-y-6">
              {[
                { msg: 'Olá Ana! 👋 Sua fatura de Março (R$ 280,00) está disponível. Pague via PIX clicando no link abaixo.', time: '08:30' },
                { msg: 'Lembrete: sua aula de FutVôlei é amanhã às 08:00 na Quadra 1. Não esqueça! 🏐', time: '18:00' },
                { msg: 'Parabéns! 🎉 Seu pagamento de R$ 280,00 foi confirmado. Obrigado pela pontualidade!', time: '10:15' },
              ].map((m, i) => (
                <div key={i} className="flex justify-end">
                  <div className="bg-emerald-600/20 border border-emerald-500/20 rounded-2xl rounded-tr-sm px-6 py-4 max-w-[600px]">
                    <p className="text-xl leading-relaxed">{m.msg}</p>
                    <p className="text-sm text-white/30 text-right mt-2">{m.time} ✓✓</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div className="w-[500px] flex flex-col gap-6">
            {[
              { icon: FileText, title: 'Templates personalizáveis', desc: 'Crie modelos para cobranças, lembretes e boas-vindas' },
              { icon: Users, title: 'Envio em massa', desc: 'Envie para todos os alunos ou filtre por turma e status' },
              { icon: Send, title: 'Envio automático', desc: 'Dispare mensagens automáticas em eventos do sistema' },
              { icon: MessageCircle, title: 'Histórico completo', desc: 'Registre todas as mensagens enviadas com status de entrega' },
            ].map((f, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-7 flex gap-5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <f.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xl font-bold mb-1">{f.title}</p>
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
