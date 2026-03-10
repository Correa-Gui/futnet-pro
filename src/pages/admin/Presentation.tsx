import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PresentationControls from '@/components/presentation/PresentationControls';
import { useExportPPT } from '@/components/presentation/useExportPPT';
import {
  SlideCover, SlideProblem, SlideSolution, SlideDashboard,
  SlideStudents, SlideClasses, SlideAttendance, SlideFinancial,
  SlidePlans, SlideTeachers, SlideBookings, SlideWhatsApp,
  SlideAnalytics, SlideLanding, SlideStudentPortal, SlideTeacherPortal, SlideCTA,
} from '@/components/presentation/slides';

const slides = [
  { component: SlideCover, title: 'Capa' },
  { component: SlideProblem, title: 'Problema' },
  { component: SlideSolution, title: 'Solução' },
  { component: SlideDashboard, title: 'Dashboard' },
  { component: SlideStudents, title: 'Alunos' },
  { component: SlideClasses, title: 'Turmas' },
  { component: SlideAttendance, title: 'Presença' },
  { component: SlideFinancial, title: 'Financeiro' },
  { component: SlidePlans, title: 'Planos' },
  { component: SlideTeachers, title: 'Professores' },
  { component: SlideBookings, title: 'Agendamentos' },
  { component: SlideWhatsApp, title: 'WhatsApp' },
  { component: SlideAnalytics, title: 'Analytics' },
  { component: SlideLanding, title: 'Landing Page' },
  { component: SlideStudentPortal, title: 'Portal Aluno' },
  { component: SlideTeacherPortal, title: 'Portal Professor' },
  { component: SlideCTA, title: 'CTA Final' },
];

export default function Presentation() {
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateScale = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    setScale(Math.min(clientWidth / 1920, clientHeight / 1080));
  }, []);

  useEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); setCurrent(c => Math.min(c + 1, slides.length - 1)); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setCurrent(c => Math.max(c - 1, 0)); }
      if (e.key === 'Escape' && showGrid) setShowGrid(false);
      if (e.key === 'g' || e.key === 'G') setShowGrid(g => !g);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showGrid]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const CurrentSlide = slides[current].component;

  if (showGrid) {
    return (
      <div ref={containerRef} className="fixed inset-0 z-50 bg-[hsl(213,45%,8%)] overflow-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.08em' }}>
            FUTNET PRO — Todos os Slides
          </h2>
          <button onClick={() => setShowGrid(false)} className="text-white/60 hover:text-white text-lg px-4 py-2 bg-white/10 rounded-xl">
            Fechar Grid (G)
          </button>
        </div>
        <div className="grid grid-cols-4 gap-6">
          {slides.map((slide, i) => {
            const Comp = slide.component;
            return (
              <button
                key={i}
                onClick={() => { setCurrent(i); setShowGrid(false); }}
                className={`relative rounded-xl overflow-hidden border-2 transition-all hover:scale-[1.02] ${
                  i === current ? 'border-[hsl(25,95%,53%)] shadow-lg shadow-[hsl(25,95%,53%)]/20' : 'border-white/10 hover:border-white/30'
                }`}
              >
                <div className="w-full aspect-video overflow-hidden">
                  <div style={{ transform: 'scale(0.17)', transformOrigin: 'top left', width: '1920px', height: '1080px', pointerEvents: 'none' }}>
                    <Comp />
                  </div>
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur px-3 py-2 flex items-center gap-2">
                  <span className="text-xs text-white/40 font-mono">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-sm text-white/80 font-medium">{slide.title}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 bg-[hsl(213,45%,6%)] flex items-center justify-center overflow-hidden">
      {/* Sidebar thumbnails */}
      <div className="absolute left-0 top-0 bottom-0 w-[180px] bg-black/40 backdrop-blur border-r border-white/10 overflow-y-auto py-4 px-3 hidden lg:block z-40"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(213,30%,20%) transparent' }}
      >
        {slides.map((slide, i) => {
          const Comp = slide.component;
          return (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-full mb-3 rounded-lg overflow-hidden border transition-all ${
                i === current ? 'border-[hsl(25,95%,53%)] shadow-md shadow-[hsl(25,95%,53%)]/20' : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="w-full aspect-video overflow-hidden">
                <div style={{ transform: 'scale(0.08)', transformOrigin: 'top left', width: '1920px', height: '1080px', pointerEvents: 'none' }}>
                  <Comp />
                </div>
              </div>
              <div className="bg-black/50 px-2 py-1 flex items-center gap-1">
                <span className="text-[10px] text-white/30 font-mono">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[10px] text-white/60 truncate">{slide.title}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main slide */}
      <div className="absolute inset-0 lg:left-[180px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            style={{
              width: '1920px',
              height: '1080px',
              transform: `scale(${scale})`,
              transformOrigin: 'center center',
              position: 'absolute',
            }}
          >
            <CurrentSlide />
          </motion.div>
        </AnimatePresence>
      </div>

      <PresentationControls
        current={current}
        total={slides.length}
        onPrev={() => setCurrent(c => Math.max(c - 1, 0))}
        onNext={() => setCurrent(c => Math.min(c + 1, slides.length - 1))}
        onGoTo={setCurrent}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(g => !g)}
      />
    </div>
  );
}
