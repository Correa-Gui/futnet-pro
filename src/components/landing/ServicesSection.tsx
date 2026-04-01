import { motion } from "framer-motion";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Section, SectionLabel, SectionTitle } from "./Section";
import type { LandingSettings } from "./types";
import { landingImages, supportsClasses, supportsRentals } from "./brand";

function ServiceSpotlight({
  image,
  label,
  title,
  description,
  bullets,
  href,
}: {
  image: string;
  label: string;
  title: string;
  description: string;
  bullets: string[];
  href: string;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45 }}
      className="landing-panel group relative min-h-[520px] overflow-hidden"
    >
      <img
        src={image}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,7,8,0.18)_0%,rgba(7,7,8,0.68)_58%,rgba(7,7,8,0.9)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.22),transparent_20%)]" />

      <div className="relative z-10 flex h-full flex-col justify-between p-7 sm:p-8">
        <div>
          <span className="landing-eyebrow">{label}</span>
        </div>

        <div>
          <h3 className="max-w-[10ch] font-heading text-[clamp(2rem,4vw,3.6rem)] font-extrabold leading-[0.95] tracking-[-0.05em] text-white">
            {title}
          </h3>
          <p className="mt-4 max-w-[30rem] text-sm leading-7 text-white/70 sm:text-[0.95rem]">
            {description}
          </p>

          <div className="mt-6 flex flex-col gap-3">
            {bullets.map((bullet) => (
              <div key={bullet} className="flex items-center gap-3 text-sm text-white/72">
                <CheckCircle2 className="h-4 w-4 text-secondary" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>

          <a
            href={href}
            className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.05] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white no-underline transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08]"
          >
            Acessar caminho
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/18 text-secondary">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </a>
        </div>
      </div>
    </motion.article>
  );
}

export function ServicesSection({
  settings,
  getImage,
}: {
  settings: LandingSettings;
  getImage: (k: string, f: string) => string;
}) {
  const hasClasses = supportsClasses(settings.business_mode);
  const hasRentals = supportsRentals(settings.business_mode);

  const cards = [
    ...(hasClasses
      ? [
          {
            image: getImage("about", landingImages.servicesClasses),
            label: "Aulas guiadas",
            title: "Treino com método, leitura de nível e energia de time.",
            description:
              "Não é só entrar na areia. É evoluir com intenção, em turmas que fazem sentido para a sua fase e com uma experiência que transmite valor.",
            bullets: ["Aula experimental integrada ao fluxo da página", "Turmas por nível", "Percepção de marca premium"],
            href: "#aula-teste",
          },
        ]
      : []),
    ...(hasRentals
      ? [
          {
            image: getImage("gallery", landingImages.servicesRentals),
            label: "Reserva de quadra",
            title: "Escolha o horário e mantenha o jogo em movimento.",
            description:
              "O caminho para reservar foi pensado para parecer produto premium: rápido, claro e com sensação de tecnologia, não formulário improvisado.",
            bullets: ["Passo a passo leve", "Disponibilidade clara", "Confirmação pronta para WhatsApp"],
            href: "#reservar-quadra",
          },
        ]
      : []),
  ];

  return (
    <Section id="servicos" className="px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[40rem]">
            <SectionLabel light>Pontos de entrada</SectionLabel>
            <SectionTitle light className="max-w-[12ch]">
              DOIS CAMINHOS DE CONVERSÃO. A MESMA SENSAÇÃO DE MARCA.
            </SectionTitle>
          </div>
          <p className="max-w-[34rem] text-sm leading-8 text-white/66 sm:text-base">
            Cada caminho foi tratado como produto próprio, com linguagem visual consistente e CTA
            claro para quem quer agendar aula experimental ou reservar quadra.
          </p>
        </div>

        <div className={`grid gap-5 ${cards.length > 1 ? "xl:grid-cols-2" : ""}`}>
          {cards.map((card) => (
            <ServiceSpotlight key={card.title} {...card} />
          ))}
        </div>
      </div>
    </Section>
  );
}
