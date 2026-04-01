import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { CTAButton } from "./CTAButton";
import { cn } from "@/lib/utils";
import type { LandingSettings } from "./types";
import {
  getDefaultCtaTarget,
  scrollToSection,
  supportsClasses,
  supportsRentals,
} from "./brand";

export function Nav({ settings }: { settings: LandingSettings }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const hasClasses = supportsClasses(settings.business_mode);
  const hasRentals = supportsRentals(settings.business_mode);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Experiência", href: "#beneficios" },
    ...(hasClasses ? [{ label: "Turmas", href: "#turmas" }] : []),
    ...(hasRentals ? [{ label: "Quadras", href: "#reservar-quadra" }] : []),
    { label: "Planos", href: "#planos" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 py-4 transition-all duration-300 sm:px-6",
        scrolled ? "bg-[#060708]/85 backdrop-blur-2xl" : "bg-transparent"
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[1320px] items-center justify-between gap-6 rounded-full border px-4 py-2.5 transition-all duration-300 sm:px-6",
          scrolled ? "border-white/10 bg-white/[0.04]" : "border-white/10 bg-black/20 backdrop-blur-md"
        )}
      >
        <a href="#hero" className="flex items-center gap-3 no-underline">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary via-orange-500 to-orange-600 text-xl font-brand text-white shadow-[0_14px_32px_rgba(249,115,22,0.28)]">
            FV
          </div>
          <div className="hidden min-[420px]:block">
            <span className="block font-brand text-[1.4rem] leading-none tracking-[0.18em] text-white">
              FutVôlei
            </span>
            <span className="block text-[10px] uppercase tracking-[0.36em] text-white/45">
              Arena Premium
            </span>
          </div>
        </a>

        <div className="hidden items-center gap-7 lg:flex">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/62 no-underline transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          {hasRentals && hasClasses ? (
            <a
              href="#reservar-quadra"
              className="rounded-full border border-white/10 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/72 no-underline transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
            >
              Reservar Quadra
            </a>
          ) : null}
          <CTAButton
            text={settings.primary_cta_text || "Agendar Aula Experimental"}
            href={`#${getDefaultCtaTarget(settings.business_mode)}`}
            className="!px-5 !py-3"
          />
        </div>

        <button
          className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-white lg:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
        >
          {menuOpen ? <X size={24} className="text-white" /> : <Menu size={24} className="text-white" />}
        </button>
      </div>

      {menuOpen && (
        <div className="mx-auto mt-3 flex max-w-[1320px] flex-col gap-4 rounded-[28px] border border-white/10 bg-[#07090d]/95 px-6 py-6 backdrop-blur-2xl lg:hidden">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="text-sm font-semibold uppercase tracking-[0.2em] text-white/78 no-underline"
            >
              {l.label}
            </a>
          ))}
          {hasRentals && hasClasses ? (
            <a
              href="#reservar-quadra"
              onClick={() => setMenuOpen(false)}
              className="rounded-full border border-white/10 px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white/72 no-underline"
            >
              Reservar Quadra
            </a>
          ) : null}
          <CTAButton
            text={settings.primary_cta_text || "Agendar Aula Experimental"}
            className="w-full"
            onClick={() => {
              setMenuOpen(false);
              scrollToSection(getDefaultCtaTarget(settings.business_mode));
            }}
          />
        </div>
      )}
    </nav>
  );
}
