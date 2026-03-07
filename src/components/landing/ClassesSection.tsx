import { useState, useEffect } from "react";
import { Users, MapPin, Clock } from "lucide-react";
import { Section, SectionLabel, SectionTitle } from "./Section";
import { supabase } from "@/integrations/supabase/client";
import { formatDaysOfWeek, formatLevelLabel } from "@/lib/whatsapp";

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

  const scrollToForm = (id: string) => {
    onSelectClass?.(id);
    document.getElementById("aula-teste")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Section id="turmas" className="py-20 px-6 bg-background">
      <div className="max-w-[1100px] mx-auto text-center mb-12">
        <SectionLabel>Turmas</SectionLabel>
        <SectionTitle>
          Nossas <span className="text-secondary">Turmas Disponíveis</span>
        </SectionTitle>
        <p className="text-base text-muted-foreground max-w-[500px] mx-auto">
          Encontre a turma ideal para o seu nível e horário.
        </p>
      </div>
      <div className="max-w-[1000px] mx-auto grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
        {classes.map((c) => {
          const vagas = c.max_students - c.enrolled_count;
          return (
            <div
              key={c.id}
              className="p-6 rounded-2xl bg-card border border-border transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-lg font-bold text-foreground">{c.name}</h3>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-secondary/10 text-secondary">
                  {formatLevelLabel(c.level)}
                </span>
              </div>
              <div className="flex flex-col gap-2 mb-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  {formatDaysOfWeek(c.day_of_week)} • {c.start_time.slice(0, 5)}-{c.end_time.slice(0, 5)}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} />
                  {c.court_name}
                </div>
                <div className="flex items-center gap-2">
                  <Users size={14} />
                  <span className={vagas <= 2 ? "text-red-500 font-semibold" : ""}>
                    {vagas > 0 ? `${vagas} vaga${vagas > 1 ? "s" : ""} restante${vagas > 1 ? "s" : ""}` : "Turma lotada"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => scrollToForm(c.id)}
                disabled={vagas <= 0}
                className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-br from-secondary to-orange-600 text-white transition-all hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Quero Experimentar
              </button>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
