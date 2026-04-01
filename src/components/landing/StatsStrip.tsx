import { Clock3, ShieldCheck, Star, Trophy } from "lucide-react";
import type { LandingSettings } from "./types";
import { supportsClasses, supportsRentals } from "./brand";

export function StatsStrip({ settings }: { settings: LandingSettings }) {
  const hasClasses = supportsClasses(settings.business_mode);
  const hasRentals = supportsRentals(settings.business_mode);

  const stats = hasClasses && hasRentals
    ? [
        { value: "+500", label: "alunos e jogadores", icon: Trophy },
        { value: "4.9", label: "média de avaliação", icon: Star },
        { value: "2", label: "quadras lado a lado", icon: ShieldCheck },
        { value: "7/7", label: "janela operacional", icon: Clock3 },
      ]
    : hasRentals
      ? [
          { value: "2", label: "quadras premium", icon: ShieldCheck },
          { value: "30", label: "dias para agendar", icon: Clock3 },
          { value: "R$80", label: "valor base por hora", icon: Trophy },
          { value: "4.9", label: "experiência aprovada", icon: Star },
        ]
      : [
          { value: "+500", label: "alunos ativos", icon: Trophy },
          { value: "4", label: "níveis de evolução", icon: ShieldCheck },
          { value: "4.9", label: "nota média", icon: Star },
          { value: "60", label: "minutos por sessão", icon: Clock3 },
        ];

  return (
    <section className="relative z-[1] px-6 py-6 sm:py-8">
      <div className="landing-panel mx-auto grid max-w-[1320px] gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:p-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[22px] border border-white/8 bg-black/20 px-5 py-5 transition-all duration-300 hover:-translate-y-1 hover:border-white/14 hover:bg-white/[0.05]"
          >
            <div className="flex items-center justify-between">
              <p className="font-brand text-[3rem] leading-none tracking-[0.12em] text-white">
                {stat.value}
              </p>
              <div className="rounded-full border border-white/10 bg-white/[0.05] p-2.5 text-secondary">
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/52">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
