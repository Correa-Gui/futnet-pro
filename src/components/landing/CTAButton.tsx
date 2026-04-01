import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { scrollToSection } from "./brand";

interface CTAButtonProps {
  text?: string;
  large?: boolean;
  dark?: boolean;
  className?: string;
  href?: string;
  onClick?: () => void;
}

export function CTAButton({
  text = "Agende Sua Aula Grátis",
  large = false,
  dark = false,
  className = "",
  href,
  onClick,
}: CTAButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
      return;
    }

    if (href?.startsWith("#")) {
      e.preventDefault();
      scrollToSection(href.slice(1));
      return;
    }

    if (!href || href === "/cadastro") {
      const defaultTarget = document.getElementById("aula-teste")
        ? "aula-teste"
        : document.getElementById("reservar-quadra")
          ? "reservar-quadra"
          : "";

      if (defaultTarget) {
        e.preventDefault();
        scrollToSection(defaultTarget);
      }
    }
  };

  return (
    <a
      href={href || "#aula-teste"}
      onClick={handleClick}
      className={cn(
        "group inline-flex items-center justify-center gap-3 rounded-full border font-body font-semibold uppercase tracking-[0.18em] text-white no-underline transition-all duration-300 cursor-pointer hover:-translate-y-0.5",
        large ? "px-7 py-4 text-[12px]" : "px-6 py-3 text-[11px]",
        dark
          ? "border-white/12 bg-white/[0.05] hover:border-white/20 hover:bg-white/[0.08]"
          : "border-secondary/40 bg-gradient-to-r from-secondary via-orange-500 to-orange-600 shadow-[0_18px_40px_rgba(249,115,22,0.24)] hover:shadow-[0_22px_56px_rgba(249,115,22,0.32)]",
        className
      )}
    >
      <span>{text}</span>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/15 transition-transform duration-300 group-hover:translate-x-0.5">
        <ArrowRight size={large ? 16 : 14} />
      </span>
    </a>
  );
}
