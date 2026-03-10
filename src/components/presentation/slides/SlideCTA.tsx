import SlideLayout from '../SlideLayout';
import { Rocket, Mail, Phone, Globe } from 'lucide-react';

export default function SlideCTA() {
  return (
    <SlideLayout variant="gradient">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <Rocket className="w-20 h-20 text-[hsl(25,95%,53%)] mb-10" />
        <h2 className="text-7xl font-bold mb-6" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.08em' }}>
          PRONTO PARA ESCALAR<br />SUA ESCOLA?
        </h2>
        <p className="text-3xl text-white/50 max-w-[800px] leading-relaxed mb-14">
          Junte-se às escolas que já automatizaram a gestão com FutNet Pro.<br />
          Comece hoje, sem compromisso.
        </p>

        <div className="flex gap-6 mb-16">
          <div className="bg-[hsl(25,95%,53%)] rounded-2xl px-12 py-5 text-2xl font-bold shadow-2xl">
            Começar agora — Grátis por 14 dias
          </div>
          <div className="bg-white/10 border border-white/20 rounded-2xl px-12 py-5 text-2xl font-medium">
            Agendar demonstração
          </div>
        </div>

        <div className="flex gap-12">
          {[
            { icon: Mail, text: 'contato@futnetpro.com.br' },
            { icon: Phone, text: '(11) 99999-9999' },
            { icon: Globe, text: 'futnetpro.com.br' },
          ].map((c, i) => (
            <div key={i} className="flex items-center gap-3 text-white/40">
              <c.icon className="w-5 h-5" />
              <span className="text-xl">{c.text}</span>
            </div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
}
