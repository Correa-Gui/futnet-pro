import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { Section, SectionLabel, SectionTitle } from "./Section";
import { supabase } from "@/integrations/supabase/client";
import type { LandingSettings } from "./types";
import { PlansSection } from "./PlansSection";
import { CTAButton } from "./CTAButton";

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

  if (settings.business_mode === "rentals") {
    return <PlansSection settings={settings} />;
  }

  if (plans.length === 0) {
    return <PlansSection settings={settings} />;
  }

  const midIndex = Math.floor(plans.length / 2);

  return (
    <Section id="planos" className="px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-10 grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div className="max-w-[34rem]">
            <SectionLabel light>Planos dinâmicos</SectionLabel>
            <SectionTitle light className="max-w-[12ch]">
              ESTRUTURA DE PREÇOS COM MAIS PRESENÇA E MENOS RUÍDO VISUAL.
            </SectionTitle>
          </div>
          <p className="max-w-[34rem] text-sm leading-8 text-white/66 sm:text-base">
            Quando houver planos cadastrados no banco, a seção assume o catálogo real sem perder a
            linguagem premium da landing.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          {plans.map((plan, index) => {
            const popular = index === midIndex && plans.length > 1;
            const features = [
              `${plan.classes_per_week}x por semana`,
              "Turma do seu nível",
              "Acesso a uma experiência guiada",
              ...(plan.description ? [plan.description] : []),
            ];

            return (
              <article
                key={plan.id}
                className={popular
                  ? "landing-panel relative overflow-hidden border-secondary/30 bg-[linear-gradient(180deg,rgba(249,115,22,0.14)_0%,rgba(255,255,255,0.04)_32%,rgba(255,255,255,0.03)_100%)] p-7 sm:p-8"
                  : "landing-panel relative overflow-hidden p-7 sm:p-8"}
              >
                {popular ? (
                  <span className="absolute right-5 top-5 rounded-full border border-secondary/30 bg-secondary px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white">
                    Recomendado
                  </span>
                ) : null}

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/46">
                    {plan.name}
                  </p>
                  <p className="mt-4 max-w-[13ch] font-heading text-[2rem] font-extrabold leading-[0.98] tracking-[-0.04em] text-white">
                    {plan.description || "Plano com foco em recorrência e evolução."}
                  </p>
                </div>

                <div className="mt-8 flex items-end gap-2">
                  <span className="text-sm font-semibold uppercase tracking-[0.16em] text-white/46">R$</span>
                  <span className="font-brand text-[4.4rem] leading-none tracking-[0.08em] text-white">
                    {Number(plan.monthly_price).toFixed(0)}
                  </span>
                  <span className="pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/46">
                    /mês
                  </span>
                </div>

                <div className="mt-8 flex flex-col gap-3">
                  {features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-sm leading-7 text-white/72">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-secondary" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <CTAButton
                    text="Agendar experiência"
                    href="#aula-teste"
                    className="w-full justify-between"
                    dark={!popular}
                  />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
