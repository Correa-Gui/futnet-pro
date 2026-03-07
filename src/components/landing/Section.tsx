import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/utils";

export function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.section ref={ref} id={id} className={cn("relative", className)}>
      <div
        className="transition-all duration-700 ease-out"
        style={{
          opacity: isInView ? 1 : 0,
          transform: isInView ? "translateY(0)" : "translateY(40px)",
        }}
      >
        {children}
      </div>
    </motion.section>
  );
}

export function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest mb-3 font-body",
        light ? "text-secondary/70" : "text-secondary"
      )}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  children,
  light = false,
  className = "",
}: {
  children: React.ReactNode;
  light?: boolean;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "font-heading text-[clamp(28px,5vw,44px)] font-extrabold leading-[1.15] mb-5",
        light ? "text-white" : "text-foreground",
        className
      )}
    >
      {children}
    </h2>
  );
}
