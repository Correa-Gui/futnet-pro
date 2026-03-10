import SlideLayout from '../SlideLayout';
import { Zap } from 'lucide-react';

export default function SlideCover() {
  return (
    <SlideLayout variant="gradient">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {/* Big Logo */}
        <div className="w-28 h-28 rounded-3xl bg-[hsl(25,95%,53%)] flex items-center justify-center mb-10 shadow-2xl">
          <span className="text-white text-5xl font-bold" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.08em' }}>FV</span>
        </div>
        <h1 className="text-8xl font-bold tracking-wider mb-6" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.1em' }}>
          FUTNET PRO
        </h1>
        <p className="text-3xl text-white/60 font-light max-w-[900px] leading-relaxed">
          A plataforma completa para gestão de escolas de FutVôlei e Beach Tennis
        </p>
        <div className="mt-14 flex items-center gap-3 bg-white/10 backdrop-blur rounded-full px-8 py-4">
          <Zap className="w-6 h-6 text-[hsl(25,95%,53%)]" />
          <span className="text-xl text-white/80">Apresentação Comercial</span>
        </div>
      </div>
    </SlideLayout>
  );
}
