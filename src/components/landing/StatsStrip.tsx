import { Users, Target, Star, MapPin } from "lucide-react";

export function StatsStrip() {
  const stats = [
    { value: "500+", label: "Alunos ativos", icon: Users },
    { value: "15+", label: "Professores", icon: Target },
    { value: "4.9", label: "Nota no Google", icon: Star },
    { value: "3", label: "Quadras", icon: MapPin },
  ];

  return (
    <div className="bg-card border-b border-border py-10 px-6">
      <div className="max-w-[1000px] mx-auto grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-6">
        {stats.map((s, i) => (
          <div
            key={i}
            className="stat-card flex items-center gap-4 px-5 py-4 rounded-xl transition-all cursor-default"
          >
            <s.icon size={24} className="text-secondary" />
            <div>
              <div className="font-heading text-[28px] font-extrabold text-foreground">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
