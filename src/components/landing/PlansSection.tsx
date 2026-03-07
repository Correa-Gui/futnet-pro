import { CheckCircle } from "lucide-react";
import { Section, SectionLabel, SectionTitle } from "./Section";
import { CTAButton } from "./CTAButton";
import type { LandingSettings } from "./types";

export function PlansSection({ settings }: { settings: LandingSettings }) {
  const classPlans = [
    { name: "2x por semana", price: "149", period: "/mês", features: ["2 aulas semanais", "Turma do seu nível", "Acesso ao app", "Aula experimental grátis"], popular: false },
    { name: "3x por semana", price: "199", period: "/mês", features: ["3 aulas semanais", "Turma do seu nível", "Acesso ao app", "Aula experimental grátis", "Prioridade de horário"], popular: true },
    { name: "Livre", price: "279", period: "/mês", features: ["Aulas ilimitadas", "Qualquer turma e horário", "Acesso ao app", "Prioridade de horário", "Eventos exclusivos"], popular: false },
  ];
  const rentalPlans = [
    { name: "Avulso", price: "80", period: "/hora", features: ["1 hora de quadra", "Até 8 jogadores", "Reserva online"], popular: false },
    { name: "Pacote 5h", price: "350", period: "/5h", features: ["5 horas de quadra", "Válido por 30 dias", "Reserva online", "10% de desconto"], popular: true },
    { name: "Pacote 10h", price: "600", period: "/10h", features: ["10 horas de quadra", "Válido por 60 dias", "Reserva online", "25% de desconto", "Horário preferencial"], popular: false },
  ];
  const plans = settings.business_mode === "rentals" ? rentalPlans : classPlans;

  return (
    <Section id="planos" className="py-20 px-6 bg-background">
      <div className="max-w-[1100px] mx-auto text-center mb-12">
        <SectionLabel>Planos</SectionLabel>
        <SectionTitle>
          Escolha o Plano <span className="text-secondary">Ideal Para Você</span>
        </SectionTitle>
        <p className="text-base text-muted-foreground max-w-[500px] mx-auto">
          {settings.business_mode === "rentals"
            ? "Reserve sua quadra de forma rápida e prática."
            : "Todos os planos incluem aula experimental gratuita. Sem fidelidade, cancele quando quiser."}
        </p>
      </div>
      <div className="max-w-[1000px] mx-auto grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
        {plans.map((p, i) => (
          <div
            key={i}
            className={`p-8 rounded-2xl relative transition-transform ${
              p.popular
                ? "bg-foreground text-white"
                : "bg-card border border-border text-foreground"
            }`}
          >
            {p.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-secondary to-orange-600 text-white px-4 py-1 rounded-full text-[13px] font-bold">
                Popular
              </span>
            )}
            <p className="text-lg font-semibold mb-2">{p.name}</p>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-sm font-medium">R$</span>
              <span className="font-heading text-5xl font-extrabold">{p.price}</span>
              <span className={`text-sm ${p.popular ? "text-white/60" : "text-muted-foreground"}`}>
                {p.period}
              </span>
            </div>
            <div className="flex flex-col gap-2.5 mb-7">
              {p.features.map((f, fi) => (
                <div key={fi} className="flex items-center gap-2 text-sm">
                  <CheckCircle size={16} className={p.popular ? "text-secondary/70" : "text-secondary"} />
                  {f}
                </div>
              ))}
            </div>
            <CTAButton
              text="Começar Agora"
              dark={!p.popular}
              className="w-full justify-center"
              href={settings.primary_cta_url}
            />
          </div>
        ))}
      </div>
    </Section>
  );
}
