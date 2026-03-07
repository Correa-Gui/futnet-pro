import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Section, SectionLabel, SectionTitle } from "./Section";
import { cn } from "@/lib/utils";
import type { LandingSettings } from "./types";

export function FAQSection({ settings }: { settings: LandingSettings }) {
  const [open, setOpen] = useState<number | null>(null);

  const classFaqs = [
    { q: "Preciso ter experiência para começar?", a: "Não! Temos turmas especiais para iniciantes completos." },
    { q: "Quanto custa a aula experimental?", a: "A primeira aula é 100% gratuita e sem compromisso." },
    { q: "O que preciso levar?", a: "Apenas roupa confortável e vontade de se divertir." },
    { q: "Posso cancelar a qualquer momento?", a: "Sim! Nossos planos são flexíveis e sem fidelidade." },
    { q: "Qual a duração de cada aula?", a: "As aulas têm em média 1 hora." },
    { q: "Vocês têm estacionamento?", a: "Sim, temos estacionamento gratuito." },
  ];
  const rentalFaqs = [
    { q: "Como faço para reservar uma quadra?", a: "Reserve online pelo nosso app ou entre em contato via WhatsApp." },
    { q: "Qual o valor da hora?", a: "A partir de R$80/hora. Temos pacotes com desconto." },
    { q: "Posso cancelar uma reserva?", a: "Sim, cancele até 24h antes sem custo." },
    { q: "Vocês fornecem bola e rede?", a: "Sim, tudo está incluído na reserva." },
    { q: "Quantas pessoas cabem por quadra?", a: "Até 8 jogadores por quadra." },
    { q: "Vocês têm estacionamento?", a: "Sim, temos estacionamento gratuito." },
  ];
  const faqs = settings.business_mode === "rentals" ? rentalFaqs : classFaqs;

  return (
    <Section id="faq" className="py-20 px-6 bg-card">
      <div className="max-w-[700px] mx-auto text-center mb-12">
        <SectionLabel>Dúvidas</SectionLabel>
        <SectionTitle>Perguntas Frequentes</SectionTitle>
      </div>
      <div className="max-w-[700px] mx-auto flex flex-col gap-2">
        {faqs.map((faq, i) => (
          <div
            key={i}
            className={cn(
              "rounded-xl border overflow-hidden transition-all",
              open === i
                ? "border-secondary/25 bg-background"
                : "border-border bg-card"
            )}
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex justify-between items-center px-6 py-[18px] bg-transparent border-none cursor-pointer text-base font-semibold text-foreground font-body text-left"
            >
              {faq.q}
              <ChevronDown
                size={18}
                className={cn(
                  "shrink-0 transition-transform duration-300",
                  open === i && "rotate-180"
                )}
              />
            </button>
            <div
              className="overflow-hidden transition-all duration-300"
              style={{ maxHeight: open === i ? 200 : 0 }}
            >
              <p className="px-6 pb-[18px] text-[15px] text-muted-foreground leading-relaxed">
                {faq.a}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
