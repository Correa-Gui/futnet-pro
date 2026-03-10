import { ChevronLeft, ChevronRight, Maximize, Minimize, Grid3X3, Download, Loader2 } from 'lucide-react';

interface PresentationControlsProps {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (index: number) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onExportPPT?: () => void;
  exporting?: boolean;
}

export default function PresentationControls({
  current, total, onPrev, onNext, onGoTo,
  isFullscreen, onToggleFullscreen, showGrid, onToggleGrid,
  onExportPPT, exporting,
}: PresentationControlsProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/70 backdrop-blur-md rounded-full px-5 py-2.5 z-50">
      <button onClick={onToggleGrid} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
        <Grid3X3 className="w-4 h-4 text-white/70" />
      </button>
      <button onClick={onPrev} disabled={current === 0} className="p-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-30">
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>
      <span className="text-white/80 text-sm font-medium min-w-[60px] text-center tabular-nums">
        {current + 1} / {total}
      </span>
      <button onClick={onNext} disabled={current === total - 1} className="p-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-30">
        <ChevronRight className="w-5 h-5 text-white" />
      </button>
      <button onClick={onToggleFullscreen} className="p-1.5 rounded-full hover:bg-white/10 transition-colors">
        {isFullscreen ? <Minimize className="w-4 h-4 text-white/70" /> : <Maximize className="w-4 h-4 text-white/70" />}
      </button>
      <div className="w-px h-5 bg-white/20" />
      <button
        onClick={onExportPPT}
        disabled={exporting}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 text-white/70 text-xs font-medium"
        title="Exportar para PowerPoint"
      >
        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        <span>PPT</span>
      </button>
    </div>
  );
}
