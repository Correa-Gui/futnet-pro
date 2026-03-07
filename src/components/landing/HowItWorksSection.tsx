import { Section, SectionLabel, SectionTitle } from "./Section";
import { CTAButton } from "./CTAButton";
import type { LandingSettings } from "./types";

export function HowItWorksSection({ settings }: { settings: LandingSettings }) {
  const classSteps = [
    { num: "01", title: "Escolha seu horário", desc: "Veja as turmas disponíveis, filtre por nível e reserve.", img: "https://images.unsplash.com/photo-1434596922112-19c563067271?w=400&q=80" },
    { num: "02", title: "Venha para sua aula", desc: "Chegue na quadra, conheça seu professor e viva a experiência.", img: "https://images.unsplash.com/photo-1580477667995-2b94f01c9516?w=400&q=80" },
    { num: "03", title: "Escolha seu plano", desc: "Se curtir, escolha o plano ideal. Simples assim.", img: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80" },
  ];
  const rentalSteps = [
    { num: "01", title: "Escolha a quadra e horário", desc: "Veja disponibilidade em tempo real e reserve online.", img: "https://images.unsplash.com/photo-1434596922112-19c563067271?w=400&q=80" },
    { num: "02", title: "Confirme o pagamento", desc: "Pague via Pix de forma rápida e segura.", img: "https://images.unsplash.com/photo-1580477667995-2b94f01c9516?w=400&q=80" },
    { num: "03", title: "Jogue!", desc: "Chegue no horário marcado e aproveite sua quadra.", img: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80" },
  ];
  const steps = settings.business_mode === "rentals" ? rentalSteps : classSteps;

  return (
    <Section id="como-funciona" className="py-20 px-6 bg-background">
      <div className="max-w-[1100px] mx-auto text-center mb-12">
        <SectionLabel>Como funciona</SectionLabel>
        <SectionTitle>Três Passos Para Começar</SectionTitle>
      </div>
      <div className="max-w-[900px] mx-auto flex flex-col gap-8">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`flex gap-6 items-center flex-wrap ${i % 2 === 1 ? "flex-row-reverse" : ""}`}
          >
            <div className="flex-[1_1_200px] rounded-2xl overflow-hidden aspect-[16/10]">
              <img src={s.img} alt={s.title} className="object-cover w-full h-full" />
            </div>
            <div className="flex-[1_1_300px]">
              <span className="font-brand text-5xl text-secondary/20 leading-none">{s.num}</span>
              <h3 className="font-heading text-[22px] font-bold text-foreground mb-2">{s.title}</h3>
              <p className="text-[15px] text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="text-center mt-12">
        <CTAButton text={settings.primary_cta_text} />
      </div>
    </Section>
  );
}
