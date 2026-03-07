import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

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
    // Default: scroll to #aula-teste
    if (!href || href === "/cadastro") {
      e.preventDefault();
      document.getElementById("aula-teste")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <a
      href={href || "#aula-teste"}
      onClick={handleClick}
      className={cn(
        "cta-pulse inline-flex items-center gap-2.5 rounded-xl font-bold text-white no-underline transition-all font-body cursor-pointer",
        large ? "px-9 py-[18px] text-lg" : "px-7 py-3.5 text-base",
        dark ? "bg-foreground" : "bg-gradient-to-br from-secondary to-orange-600",
        className
      )}
    >
      {text}
      <ArrowRight size={large ? 20 : 18} />
    </a>
  );
}
