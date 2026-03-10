import { ReactNode } from 'react';

interface SlideLayoutProps {
  children: ReactNode;
  variant?: 'dark' | 'light' | 'gradient' | 'accent';
}

export default function SlideLayout({ children, variant = 'dark' }: SlideLayoutProps) {
  const bgClasses: Record<string, string> = {
    dark: 'bg-[hsl(213,45%,10%)] text-white',
    light: 'bg-[hsl(36,33%,97%)] text-[hsl(213,40%,10%)]',
    gradient: 'bg-gradient-to-br from-[hsl(201,80%,20%)] via-[hsl(213,45%,12%)] to-[hsl(25,70%,20%)] text-white',
    accent: 'bg-gradient-to-br from-[hsl(25,95%,45%)] to-[hsl(25,95%,60%)] text-white',
  };

  return (
    <div className={`slide-content w-[1920px] h-[1080px] relative overflow-hidden ${bgClasses[variant]}`}>
      {/* Corner branding */}
      <div className="absolute top-12 left-16 flex items-center gap-3 z-10">
        <div className="w-10 h-10 rounded-lg bg-[hsl(25,95%,53%)] flex items-center justify-center">
          <span className="text-white font-bold text-sm" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.08em' }}>FV</span>
        </div>
        <span className="text-sm font-medium opacity-60" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '0.12em' }}>
          FUTNET PRO
        </span>
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col px-16 py-28">
        {children}
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-[hsl(25,95%,53%)] opacity-[0.04] blur-[100px]" />
      <div className="absolute top-0 left-1/2 w-[400px] h-[400px] rounded-full bg-[hsl(201,80%,50%)] opacity-[0.03] blur-[80px]" />
    </div>
  );
}
