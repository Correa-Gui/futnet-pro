import { CheckCircle2 } from "lucide-react";
import { Section, SectionLabel, SectionTitle } from "./Section";
import { CTAButton } from "./CTAButton";
import type { LandingSettings } from "./types";

export function PlansSection({ settings }: { settings: LandingSettings }) {
  const isRentals = settings.business_mode === "rentals";

  const plans = isRentals
    ? [
        {
          name: "Avulso",
          price: "80",
          period: "/hora",
          headline: "Entre rápido, jogue forte.",
          features: ["1 hora de quadra", "Até 8 jogadores", "Reserva simples"],
          popular: false,
        },
        {
          name: "Pacote 5h",
          price: "350",
          period: "/5h",
          headline: "Ritmo recorrente com custo melhor.",
          features: ["5 horas válidas por 30 dias", "Prioridade de agenda", "10% de economia"],
          popular: true,
        },
        {
          name: "Pacote 10h",
          price: "600",
          period: "/10h",
          headline: "Para quem quer rotina fixa de jogo.",
          features: ["10 horas válidas por 60 dias", "Melhor custo/hora", "Faixa horária preferencial"],
          popular: false,
        },
      ]
    : [
        {
          name: "2x por semana",
          price: "149",
          period: "/mês",
          headline: "Entrada forte e consistente.",
          features: ["2 aulas semanais", "Turma alinhada ao seu nível", "Aula experimental inclusa"],
          popular: false,
        },
        {
          name: "3x por semana",
          price: "199",
          period: "/mês",
          headline: "Plano para acelerar evolução.",
          features: ["3 aulas semanais", "Prioridade de agenda", "Acompanhamento mais intenso"],
          popular: true,
        },
        {
          name: "Livre",
          price: "279",
          period: "/mês",
          headline: "Frequência máxima para quem vive o jogo.",
          features: ["Aulas ilimitadas", "Flexibilidade total de turma", "Acesso a ativações exclusivas"],
          popular: false,
        },
      ];

  const ctaHref = isRentals ? "#reservar-quadra" : "#aula-teste";

  return (
    <Section id="planos" className="px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-10 grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div className="max-w-[34rem]">
            <SectionLabel light>Oferta premium</SectionLabel>
            <SectionTitle light className="max-w-[12ch]">
              PREÇO COM LEITURA CLARA. VALOR COM PERCEPÇÃO ALTA.
            </SectionTitle>
          </div>
          <p className="max-w-[34rem] text-sm leading-8 text-white/66 sm:text-base">
            A precificação ganhou presença editorial, comparação direta e destaque real para a
            opção mais estratégica, evitando aparência de tabela genérica.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={plan.popular
                ? "landing-panel relative overflow-hidden border-secondary/30 bg-[linear-gradient(180deg,rgba(249,115,22,0.14)_0%,rgba(255,255,255,0.04)_32%,rgba(255,255,255,0.03)_100%)] p-7 sm:p-8"
                : "landing-panel relative overflow-hidden p-7 sm:p-8"}
            >
              {plan.popular ? (
                <span className="absolute right-5 top-5 rounded-full border border-secondary/30 bg-secondary px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white">
                  Recomendado
                </span>
              ) : null}

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/46">
                  {plan.name}
                </p>
                <p className="mt-4 max-w-[13ch] font-heading text-[2rem] font-extrabold leading-[0.98] tracking-[-0.04em] text-white">
                  {plan.headline}
                </p>
              </div>

              <div className="mt-8 flex items-end gap-2">
                <span className="text-sm font-semibold uppercase tracking-[0.16em] text-white/46">R$</span>
                <span className="font-brand text-[4.4rem] leading-none tracking-[0.08em] text-white">
                  {plan.price}
                </span>
                <span className="pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/46">
                  {plan.period}
                </span>
              </div>

              <div className="mt-8 flex flex-col gap-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 text-sm leading-7 text-white/72">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-secondary" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <CTAButton
                  text={isRentals ? "Reservar agora" : "Agendar experiência"}
                  href={ctaHref}
                  className="w-full justify-between"
                  dark={!plan.popular}
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
