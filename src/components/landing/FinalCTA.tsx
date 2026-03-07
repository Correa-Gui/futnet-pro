import { motion } from "framer-motion";
import { CheckCircle, Phone } from "lucide-react";
import { SectionLabel } from "./Section";
import { CTAButton } from "./CTAButton";
import type { LandingSettings } from "./types";

export function FinalCTA({ settings }: { settings: LandingSettings }) {
  const waLink = settings.whatsapp_number ? `https://wa.me/${settings.whatsapp_number}` : "#";

  return (
    <section className="relative py-24 px-6 bg-foreground overflow-hidden text-center">
      <div className="absolute -top-24 -right-24 w-[400px] h-[400px] rounded-full bg-secondary/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-[300px] h-[300px] rounded-full bg-primary/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative z-10 max-w-[700px] mx-auto"
      >
        <SectionLabel light>Vem pra quadra</SectionLabel>
        <h2 className="font-brand text-[clamp(40px,8vw,72px)] leading-none text-white mb-5 tracking-wider">
          PRONTO PARA{" "}
          <span className="bg-gradient-to-br from-secondary to-secondary/70 bg-clip-text text-transparent">
            JOGAR?
          </span>
        </h2>
        <p className="text-lg text-white/70 leading-relaxed mb-8">
          {settings.business_mode === "rentals"
            ? "Reserve sua quadra agora e garanta o melhor horário para você e seus amigos."
            : "Sua jornada no futevôlei começa com uma decisão simples. Agende sua aula experimental gratuita."}
        </p>
        <div className="flex gap-4 justify-center flex-wrap mb-8">
          {(settings.business_mode === "rentals"
            ? ["Reserva online", "Quadras profissionais", "Preço justo"]
            : ["Aula grátis", "Sem compromisso", "Cancele quando quiser"]
          ).map((item, idx) => (
            <span key={idx} className="flex items-center gap-1.5 text-white/60 text-sm">
              <CheckCircle size={16} className="text-secondary" />
              {item}
            </span>
          ))}
        </div>
        <div className="flex gap-4 justify-center flex-wrap">
          <CTAButton text={settings.primary_cta_text} large href={settings.primary_cta_url} />
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-7 py-[18px] bg-white/10 border border-white/20 rounded-xl text-white text-base font-semibold no-underline"
          >
            <Phone size={18} /> WhatsApp
          </a>
        </div>
      </motion.div>
    </section>
  );
}
