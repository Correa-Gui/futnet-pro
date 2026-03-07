import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { CTAButton } from "./CTAButton";
import { cn } from "@/lib/utils";
import type { LandingSettings } from "./types";

export function Nav({ settings }: { settings: LandingSettings }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Sobre", href: "#sobre" },
    { label: "Benefícios", href: "#beneficios" },
    { label: "Como Funciona", href: "#como-funciona" },
    { label: "Planos", href: "#planos" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-6 py-3 transition-all",
        scrolled ? "bg-foreground/95 backdrop-blur-xl" : "bg-transparent"
      )}
    >
      <div className="max-w-[1200px] mx-auto flex justify-between items-center">
        <a href="#hero" className="flex items-center gap-2.5 no-underline">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-secondary to-orange-600 flex items-center justify-center text-white font-brand text-xl font-bold">
            FV
          </div>
          <span className="text-white font-heading text-lg font-bold">FutVôlei Arena</span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-white/70 no-underline text-sm font-medium hover:text-white transition-colors"
            >
              {l.label}
            </a>
          ))}
          <CTAButton text="Aula Grátis" className="!px-5 !py-2.5 !text-sm" href={settings.primary_cta_url} />
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden bg-transparent border-none cursor-pointer p-1"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={24} className="text-white" /> : <Menu size={24} className="text-white" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="flex md:hidden flex-col gap-4 py-5 items-center">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="text-white/80 no-underline text-base font-medium"
            >
              {l.label}
            </a>
          ))}
          <CTAButton text="Aula Grátis" className="!px-5 !py-2.5 !text-sm" href={settings.primary_cta_url} />
        </div>
      )}
    </nav>
  );
}
