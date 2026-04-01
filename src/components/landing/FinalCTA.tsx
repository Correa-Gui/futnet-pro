import { motion } from "framer-motion";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { SectionLabel } from "./Section";
import { CTAButton } from "./CTAButton";
import type { LandingSettings } from "./types";
import { getDefaultCtaTarget, supportsClasses, supportsRentals } from "./brand";

export function FinalCTA({ settings }: { settings: LandingSettings }) {
  const hasClasses = supportsClasses(settings.business_mode);
  const hasRentals = supportsRentals(settings.business_mode);

  const bullets = hasClasses && hasRentals
    ? ["Aula experimental", "Reserva rápida", "Percepção de marca forte"]
    : hasRentals
      ? ["Quadra pronta", "Fluxo simples", "Confirmação rápida"]
      : ["Turma certa", "Método claro", "Experiência premium"];

  return (
    <section className="relative px-6 py-20 sm:py-24">
      <div className="absolute left-1/2 top-0 h-px w-[1320px] max-w-[calc(100%-3rem)] -translate-x-1/2 bg-white/8" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="landing-panel relative mx-auto grid max-w-[1320px] gap-8 overflow-hidden p-8 sm:p-10 lg:grid-cols-[1fr_320px]"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_18%)]" />

        <div className="relative z-10">
          <SectionLabel light>Fechamento da narrativa</SectionLabel>
          <h2 className="max-w-[12ch] font-brand text-[clamp(3.6rem,11vw,7rem)] leading-[0.84] tracking-[0.04em] text-white">
            ENTRE FORTE. FIQUE NA ROTINA.
          </h2>
          <p className="mt-6 max-w-[40rem] text-sm leading-8 text-white/68 sm:text-base">
            O CTA final fecha a página com postura de campanha: headline dominante, reforço de valor
            e ação clara para manter o impulso até o clique.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <CTAButton
              text={settings.primary_cta_text || "Agendar Aula Experimental"}
              large
              href={`#${getDefaultCtaTarget(settings.business_mode)}`}
            />
            {hasClasses && hasRentals ? (
              <a
                href="#reservar-quadra"
                className="group inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.05] px-7 py-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-white no-underline transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08]"
              >
                Reservar Quadra
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 transition-transform group-hover:translate-x-0.5">
                  <ArrowUpRight size={15} />
                </span>
              </a>
            ) : null}
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-3">
          {bullets.map((bullet) => (
            <div key={bullet} className="rounded-[22px] border border-white/8 bg-white/[0.04] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/14 text-secondary">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold uppercase tracking-[0.16em] text-white/68">
                  {bullet}
                </span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
