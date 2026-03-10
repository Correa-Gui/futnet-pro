import SlideLayout from '../SlideLayout';
import { Globe, Pencil, Eye, Smartphone } from 'lucide-react';

export default function SlideLanding() {
  return (
    <SlideLayout variant="dark">
      <div className="flex-1 flex flex-col">
        <p className="text-[hsl(25,95%,53%)] text-xl font-semibold mb-3 uppercase tracking-widest">Landing Page</p>
        <h2 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Syne, sans-serif' }}>
          Página de captação editável pelo admin
        </h2>
        <p className="text-2xl text-white/50 mb-12">Edite textos, imagens, planos e depoimentos sem precisar de desenvolvedor.</p>

        <div className="flex-1 flex gap-8">
          {/* Page mockup */}
          <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="h-14 bg-white/5 border-b border-white/10 flex items-center px-6 gap-3">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
              </div>
              <div className="flex-1 bg-white/5 rounded-lg px-4 py-1.5 text-base text-white/30 flex items-center gap-2">
                <Globe className="w-4 h-4" /> suaescola.futnetpro.com.br
              </div>
            </div>
            <div className="p-8">
              {/* Hero mockup */}
              <div className="bg-gradient-to-r from-[hsl(201,80%,20%)] to-[hsl(25,70%,30%)] rounded-2xl p-10 mb-6">
                <p className="text-4xl font-bold mb-3" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.08em' }}>VENHA JOGAR FUTEVÔLEI</p>
                <p className="text-lg text-white/60 mb-6">A melhor escola de FutVôlei da região</p>
                <div className="bg-[hsl(25,95%,53%)] rounded-lg px-6 py-3 inline-block text-lg font-semibold">Agende uma aula teste</div>
              </div>
              {/* Sections preview */}
              <div className="grid grid-cols-3 gap-4">
                {['Sobre', 'Planos', 'Depoimentos'].map((s, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <div className="w-full h-16 bg-white/5 rounded-lg mb-3" />
                    <p className="text-lg font-medium mb-1">{s}</p>
                    <div className="w-full h-3 bg-white/5 rounded mb-2" />
                    <div className="w-3/4 h-3 bg-white/5 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Editor features */}
          <div className="w-[450px] flex flex-col gap-6">
            {[
              { icon: Pencil, title: 'Editor visual', desc: 'Altere textos, cores e imagens diretamente pelo painel admin' },
              { icon: Eye, title: 'Preview em tempo real', desc: 'Veja as mudanças antes de publicar para todos' },
              { icon: Globe, title: 'SEO otimizado', desc: 'Meta tags, schema markup e performance otimizada' },
              { icon: Smartphone, title: 'Mobile-first', desc: 'Layout responsivo que funciona perfeitamente em celulares' },
            ].map((f, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-7 flex gap-5">
                <div className="w-12 h-12 rounded-xl bg-[hsl(201,80%,30%)]/40 flex items-center justify-center shrink-0">
                  <f.icon className="w-6 h-6 text-[hsl(201,80%,50%)]" />
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
