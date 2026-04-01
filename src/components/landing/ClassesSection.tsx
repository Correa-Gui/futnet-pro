import { useState, useEffect } from "react";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Section, SectionLabel, SectionTitle } from "./Section";
import { supabase } from "@/integrations/supabase/client";
import { formatDaysOfWeek, formatLevelLabel } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { scrollToSection } from "./brand";

interface ClassWithDetails {
  id: string;
  name: string;
  level: string;
  day_of_week: number[];
  start_time: string;
  end_time: string;
  max_students: number;
  court_name: string;
  enrolled_count: number;
}

export function ClassesSection({ onSelectClass }: { onSelectClass?: (id: string) => void }) {
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [activeLevel, setActiveLevel] = useState("all");

  useEffect(() => {
    async function load() {
      const { data: classData } = await supabase
        .from("classes")
        .select("id, name, level, day_of_week, start_time, end_time, max_students, court_id")
        .eq("status", "active");

      if (!classData || classData.length === 0) return;

      const courtIds = [...new Set(classData.map((c) => c.court_id))];
      const classIds = classData.map((c) => c.id);

      const [courtsRes, enrollRes] = await Promise.all([
        supabase.from("courts").select("id, name").in("id", courtIds),
        supabase.from("enrollments").select("class_id").eq("status", "active").in("class_id", classIds),
      ]);

      const courtMap = Object.fromEntries((courtsRes.data || []).map((c) => [c.id, c.name]));
      const enrollCount: Record<string, number> = {};
      (enrollRes.data || []).forEach((e) => {
        enrollCount[e.class_id] = (enrollCount[e.class_id] || 0) + 1;
      });

      setClasses(
        classData.map((c) => ({
          id: c.id,
          name: c.name,
          level: c.level,
          day_of_week: c.day_of_week,
          start_time: c.start_time,
          end_time: c.end_time,
          max_students: c.max_students,
          court_name: courtMap[c.court_id] || "Quadra",
          enrolled_count: enrollCount[c.id] || 0,
        }))
      );
    }

    load();
  }, []);

  if (classes.length === 0) return null;

  const levels = [
    { value: "all", label: "Todas" },
    ...Array.from(new Set(classes.map((c) => c.level))).map((level) => ({
      value: level,
      label: formatLevelLabel(level),
    })),
  ];

  const filteredClasses = activeLevel === "all"
    ? classes
    : classes.filter((item) => item.level === activeLevel);

  const scrollToForm = (id: string) => {
    onSelectClass?.(id);
    scrollToSection("aula-teste");
  };

  return (
    <Section id="turmas" className="px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-[1320px]">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div className="max-w-[34rem]">
            <SectionLabel light>Turmas em destaque</SectionLabel>
            <SectionTitle light className="max-w-[12ch]">
              ESCOLHA O NÍVEL. SINTA A EVOLUÇÃO ANTES MESMO DO PRIMEIRO TREINO.
            </SectionTitle>
          </div>
          <div className="landing-panel-soft p-6">
            <p className="text-sm leading-8 text-white/66 sm:text-base">
              O bloco de turmas deixou de ser uma grade burocrática. Agora ele funciona como vitrine
              de oferta: filtro visível, leitura rápida de agenda e CTA direto para a aula teste.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {levels.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setActiveLevel(level.value)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition-all",
                    activeLevel === level.value
                      ? "border-secondary/30 bg-secondary text-white"
                      : "border-white/10 bg-white/[0.03] text-white/64 hover:border-white/18 hover:bg-white/[0.06] hover:text-white"
                  )}
                >
                  {level.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-5 xl:grid-cols-3">
          {filteredClasses.map((c) => {
            const vagas = c.max_students - c.enrolled_count;
            const fillPercentage = Math.max(
              0,
              Math.min(100, (c.enrolled_count / Math.max(1, c.max_students)) * 100)
            );

            return (
              <article
                key={c.id}
                className="landing-panel flex h-full flex-col p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/14"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="inline-flex rounded-full border border-secondary/25 bg-secondary/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-secondary/90">
                      {formatLevelLabel(c.level)}
                    </span>
                    <h3 className="mt-4 max-w-[13ch] font-heading text-[1.8rem] font-extrabold leading-[0.98] tracking-[-0.04em] text-white">
                      {c.name}
                    </h3>
                  </div>
                  <span className="font-brand text-[2.2rem] leading-none tracking-[0.14em] text-white/14">
                    {String(c.max_students).padStart(2, "0")}
                  </span>
                </div>

                <div className="mt-8 flex flex-col gap-3 text-sm text-white/68">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-secondary" />
                    <span>
                      {formatDaysOfWeek(c.day_of_week)} · {c.start_time.slice(0, 5)}-{c.end_time.slice(0, 5)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-secondary" />
                    <span>{c.court_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-secondary" />
                    <span>
                      {vagas > 0
                        ? `${vagas} vaga${vagas > 1 ? "s" : ""} restante${vagas > 1 ? "s" : ""}`
                        : "Turma lotada"}
                    </span>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.18em] text-white/46">
                    <span>Ocupação</span>
                    <span>{c.enrolled_count}/{c.max_students}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-secondary to-orange-500"
                      style={{ width: `${fillPercentage}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={() => scrollToForm(c.id)}
                  disabled={vagas <= 0}
                  className="mt-8 inline-flex items-center justify-center rounded-full border border-secondary/35 bg-gradient-to-r from-secondary to-orange-600 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(249,115,22,0.25)] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Quero experimentar
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
