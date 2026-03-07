import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CTAButtonProps {
  text?: string;
  large?: boolean;
  dark?: boolean;
  className?: string;
  href?: string;
}

export function CTAButton({
  text = "Agende Sua Aula Grátis",
  large = false,
  dark = false,
  className = "",
  href = "/cadastro",
}: CTAButtonProps) {
  return (
    <a
      href={href}
      className={cn(
        "cta-pulse inline-flex items-center gap-2.5 rounded-xl font-bold text-white no-underline transition-all font-body",
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
