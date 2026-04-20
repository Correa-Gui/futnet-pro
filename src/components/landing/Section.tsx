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
    <motion.section ref={ref} id={id} className={cn("relative z-[1]", className)}>
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

export function SectionLabel({ children }: { children: React.ReactNode; light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#0EA5E9]/25 bg-[#0EA5E9]/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] mb-4 font-body text-[#0369A1]">
      {children}
    </span>
  );
}

export function SectionTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  light?: boolean;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "font-landing-headline text-[clamp(2.1rem,4.8vw,4.6rem)] font-extrabold leading-[0.95] tracking-[-0.05em] mb-5 text-[#1A1208]",
        className
      )}
    >
      {children}
    </h2>
  );
}
