import { useState, useEffect } from "react";
import { CheckCircle } from "lucide-react";
import { Section, SectionLabel, SectionTitle } from "./Section";
import { supabase } from "@/integrations/supabase/client";
import type { LandingSettings } from "./types";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  classes_per_week: number;
  monthly_price: number;
  is_active: boolean;
}

export function DynamicPlansSection({ settings }: { settings: LandingSettings }) {
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    supabase
      .from("plans")
      .select("id, name, description, classes_per_week, monthly_price, is_active")
      .eq("is_active", true)
      .order("monthly_price")
      .then(({ data }) => {
        if (data) setPlans(data);
      });
  }, []);

  // Fallback to static if no plans in DB
  if (plans.length === 0) {
    // Render nothing - the old static PlansSection can be used as fallback
    return null;
  }

  const midIndex = Math.floor(plans.length / 2);

  const scrollToTrial = () => {
    document.getElementById("aula-teste")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <Section id="planos" className="py-20 px-6 bg-background">
      <div className="max-w-[1100px] mx-auto text-center mb-12">
        <SectionLabel>Planos</SectionLabel>
        <SectionTitle>
          Escolha o Plano <span className="text-secondary">Ideal Para Você</span>
        </SectionTitle>
        <p className="text-base text-muted-foreground max-w-[500px] mx-auto">
          Todos os planos incluem aula experimental gratuita. Sem fidelidade, cancele quando quiser.
        </p>
      </div>
      <div className="max-w-[1000px] mx-auto grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
        {plans.map((p, i) => {
          const popular = i === midIndex && plans.length > 1;
          const price = Number(p.monthly_price);
          const priceStr = price.toFixed(0);
          const features = [
            `${p.classes_per_week}x por semana`,
            "Turma do seu nível",
            "Acesso ao app",
            "Aula experimental grátis",
            ...(p.description ? [p.description] : []),
          ];

          return (
            <div
              key={p.id}
              className={`p-8 rounded-2xl relative transition-transform ${
                popular
                  ? "bg-foreground text-white"
                  : "bg-card border border-border text-foreground"
              }`}
            >
              {popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-secondary to-orange-600 text-white px-4 py-1 rounded-full text-[13px] font-bold">
                  Popular
                </span>
              )}
              <p className="text-lg font-semibold mb-2">{p.name}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-sm font-medium">R$</span>
                <span className="font-heading text-5xl font-extrabold">{priceStr}</span>
                <span className={`text-sm ${popular ? "text-white/60" : "text-muted-foreground"}`}>
                  /mês
                </span>
              </div>
              <div className="flex flex-col gap-2.5 mb-7">
                {features.map((f, fi) => (
                  <div key={fi} className="flex items-center gap-2 text-sm">
                    <CheckCircle size={16} className={popular ? "text-secondary/70" : "text-secondary"} />
                    {f}
                  </div>
                ))}
              </div>
              <button
                onClick={scrollToTrial}
                className={`w-full py-3.5 rounded-xl font-bold text-base transition-all ${
                  popular
                    ? "bg-gradient-to-br from-secondary to-orange-600 text-white"
                    : "bg-foreground text-white"
                }`}
              >
                Começar Agora
              </button>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
