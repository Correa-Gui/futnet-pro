import { motion } from "framer-motion";
import { ArrowRight, GraduationCap, Calendar, CheckCircle } from "lucide-react";
import { Section, SectionLabel, SectionTitle } from "./Section";

const classPerks = [
  "Turmas para todos os níveis",
  "Professores certificados",
  "Primeira aula gratuita",
  "Acompanhamento personalizado",
];

const rentalPerks = [
  "Duas quadras profissionais",
  "Reserva online em minutos",
  "Horários flexíveis",
  "Iluminação completa à noite",
];

function ServiceCard({
  icon: Icon,
  label,
  title,
  description,
  perks,
  ctaText,
  ctaTarget,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  title: string;
  description: string;
  perks: string[];
  ctaText: string;
  ctaTarget: string;
  accent: "primary" | "secondary";
}) {
  const isPrimary = accent === "secondary";

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(ctaTarget)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className={`relative flex flex-col rounded-2xl border overflow-hidden transition-shadow hover:shadow-xl ${
        isPrimary
          ? "bg-secondary/5 border-secondary/20"
          : "bg-primary/5 border-primary/20"
      }`}
    >
      {/* Top accent bar */}
      <div
        className={`h-1.5 w-full ${
          isPrimary ? "bg-gradient-to-r from-secondary to-orange-500" : "bg-gradient-to-r from-primary to-primary/60"
        }`}
      />

      <div className="flex flex-col flex-1 p-8 gap-6">
        {/* Icon + Label */}
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isPrimary ? "bg-secondary/15" : "bg-primary/10"
            }`}
          >
            <Icon
              className={`h-6 w-6 ${isPrimary ? "text-secondary" : "text-primary"}`}
            />
          </div>
          <span
            className={`text-xs font-bold uppercase tracking-widest ${
              isPrimary ? "text-secondary" : "text-primary"
            }`}
          >
            {label}
          </span>
        </div>

        {/* Title + Description */}
        <div>
          <h3 className="font-heading text-2xl font-extrabold text-foreground leading-tight mb-2">
            {title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        </div>

        {/* Perks */}
        <ul className="flex flex-col gap-2.5">
          {perks.map((perk) => (
            <li key={perk} className="flex items-center gap-2.5 text-sm text-foreground">
              <CheckCircle
                className={`h-4 w-4 shrink-0 ${isPrimary ? "text-secondary" : "text-primary"}`}
              />
              {perk}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-auto pt-2">
          <a
            href={`#${ctaTarget}`}
            onClick={handleClick}
            className={`inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all hover:shadow-md ${
              isPrimary
                ? "bg-gradient-to-br from-secondary to-orange-600 text-white"
                : "bg-foreground text-background"
            }`}
          >
            {ctaText}
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </motion.div>
  );
}

export function ServicesSection() {
  return (
    <Section id="servicos" className="py-20 px-6 bg-background">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <SectionLabel>O que oferecemos</SectionLabel>
          <SectionTitle>
            Dois serviços,{" "}
            <span className="text-secondary">uma experiência</span>
          </SectionTitle>
          <p className="text-muted-foreground max-w-xl mx-auto text-base">
            Seja para aprender futevôlei com quem entende ou para reunir os
            amigos numa quadra profissional — aqui você encontra as duas opções.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <ServiceCard
            icon={GraduationCap}
            label="Aulas"
            title="Aprenda Futevôlei"
            description="Turmas estruturadas com professores certificados para iniciantes e avançados. Evolua no seu ritmo com acompanhamento de verdade."
            perks={classPerks}
            ctaText="Quero minha aula grátis"
            ctaTarget="aula-teste"
            accent="secondary"
          />
          <ServiceCard
            icon={Calendar}
            label="Aluguel"
            title="Reserve uma Quadra"
            description="Duas quadras profissionais disponíveis para reserva online. Você escolhe a quadra, a data e o horário — em poucos cliques."
            perks={rentalPerks}
            ctaText="Ver disponibilidade"
            ctaTarget="reservar-quadra"
            accent="primary"
          />
        </div>
      </div>
    </Section>
  );
}
