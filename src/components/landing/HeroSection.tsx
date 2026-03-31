import { motion, useScroll, useTransform } from "framer-motion";
import { Star, Users, Trophy, Phone, ChevronDown } from "lucide-react";
import { CTAButton } from "./CTAButton";
import { cleanPhone } from "@/lib/whatsapp";
import type { LandingSettings } from "./types";

interface HeroSectionProps {
  settings: LandingSettings;
  getImage: (k: string, f: string) => string;
}

export function HeroSection({ settings, getImage }: HeroSectionProps) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, 200]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroImg = settings.hero_image_url || getImage("hero", "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1920&q=80");
  const cleanedPhone = settings.whatsapp_number ? cleanPhone(settings.whatsapp_number) : "";
  const fullPhone = cleanedPhone && !cleanedPhone.startsWith("55") ? `55${cleanedPhone}` : cleanedPhone;
  const waLink = fullPhone ? `https://wa.me/${fullPhone}` : "#";

  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      <motion.div className="absolute inset-0" style={{ y }}>
        <img src={heroImg} alt="Hero" className="object-cover w-full h-full" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-foreground/40 via-foreground/60 to-foreground/85" />

      <motion.div className="relative z-10 max-w-[800px] mx-auto px-6 pt-[120px] pb-20 text-center" style={{ opacity }}>
        <span className="inline-block px-4 py-1.5 bg-secondary/20 border border-secondary/30 rounded-full text-secondary/70 text-sm font-semibold mb-6 tracking-wide">
          A arena de futevôlei nº1 da cidade
        </span>

        <h1 className="font-brand text-[clamp(48px,10vw,88px)] leading-none text-white mb-5 tracking-wider">
          {settings.business_mode === "rentals" ? (
            <>QUADRAS PRONTAS{" "}<span className="bg-gradient-to-br from-secondary to-secondary/70 bg-clip-text text-transparent">PARA JOGAR</span></>
          ) : (
            <>AULAS · QUADRAS{" "}<span className="bg-gradient-to-br from-secondary to-secondary/70 bg-clip-text text-transparent">· FUTEVÔLEI</span></>
          )}
        </h1>

        <p className="text-[clamp(16px,2.5vw,20px)] text-white/80 max-w-[560px] mx-auto mb-9 leading-relaxed">
          Turmas para todos os níveis e quadras profissionais disponíveis para reserva. Tudo num só lugar — venha jogar.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <CTAButton text={settings.primary_cta_text} large />
          <a
            href="#reservar-quadra"
            onClick={(e) => { e.preventDefault(); document.getElementById("reservar-quadra")?.scrollIntoView({ behavior: "smooth" }); }}
            className="inline-flex items-center gap-2 px-7 py-[18px] bg-white/10 backdrop-blur-lg border border-white/20 rounded-xl text-white text-base font-semibold no-underline cursor-pointer"
          >
            <Phone size={18} /> Reservar uma Quadra
          </a>
        </div>

        <div className="flex gap-6 justify-center flex-wrap mt-12">
          {[
            { icon: <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} size={14} className="fill-secondary text-secondary" />)}</div>, text: "4.9 no Google" },
            { icon: <Users size={16} />, text: "+500 alunos ativos" },
            { icon: <Trophy size={16} />, text: "Professores certificados" },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-white/70 text-sm">
              {item.icon}
              {item.text}
            </div>
          ))}
        </div>
      </motion.div>

      <div className="scroll-indicator absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <ChevronDown size={28} className="text-white/50" />
      </div>
    </section>
  );
}
