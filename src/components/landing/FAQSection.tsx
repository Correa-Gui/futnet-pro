import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Section, SectionLabel, SectionTitle } from "./Section";
import { cn } from "@/lib/utils";
import type { LandingSettings } from "./types";

export function FAQSection({ settings }: { settings: LandingSettings }) {
  const [open, setOpen] = useState<number | null>(0);

  const classFaqs = [
    { q: "Preciso ter experiência para começar?", a: "Não. O filtro de nível e o desenho das turmas ajudam a encaixar iniciantes sem atrito." },
    { q: "A aula experimental tem custo?", a: "Não. A entrada acontece com uma experiência inicial sem compromisso para reduzir barreira de decisão." },
    { q: "O que preciso levar para a primeira aula?", a: "Roupa confortável, água e disposição. O resto da experiência já foi preparado para te receber bem." },
    { q: "Como funciona a continuidade depois da aula teste?", a: "Se fizer sentido para você, a equipe orienta a melhor turma e o plano com mais aderência à sua rotina." },
    { q: "Qual é a duração média da aula?", a: "As sessões trabalham em janelas de cerca de uma hora, com ritmo intenso e leitura clara de evolução." },
  ];
  const rentalFaqs = [
    { q: "Como faço para reservar uma quadra?", a: "Você escolhe a quadra, data e horário no fluxo da landing e finaliza o pedido com contato direto para confirmação." },
    { q: "Qual é o valor da hora?", a: "O valor-base atual começa em R$80 por hora, com pacotes que melhoram custo e recorrência." },
    { q: "Posso cancelar uma reserva?", a: "Sim, desde que dentro da janela operacional definida pela arena, para preservar a agenda e a experiência de todos." },
    { q: "A quadra inclui estrutura de jogo?", a: "A experiência foi pensada para chegar e jogar, com estrutura pronta para uso." },
    { q: "Com quanto tempo posso reservar?", a: "A agenda foi desenhada para aceitar reservas com antecedência e dar previsibilidade à sua rotina." },
  ];
  const faqs = settings.business_mode === "rentals" ? rentalFaqs : classFaqs;

  return (
    <Section id="faq" className="px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-10 max-w-[42rem]">
          <SectionLabel light>Dúvidas frequentes</SectionLabel>
          <SectionTitle light className="max-w-[12ch]">
            RESPOSTAS LIMPAS, SEM CARA DE BLOCO INSTITUCIONAL.
          </SectionTitle>
          <p className="max-w-[34rem] text-sm leading-8 text-white/66 sm:text-base">
            O FAQ segue o mesmo tom da landing: direto, elegante e com informação suficiente para
            remover fricção antes do próximo clique.
          </p>
        </div>

        <div className="grid gap-3">
          {faqs.map((faq, index) => (
            <article
              key={faq.q}
              className={cn(
                "landing-panel overflow-hidden transition-all duration-300",
                open === index ? "border-secondary/25 bg-white/[0.06]" : ""
              )}
            >
              <button
                onClick={() => setOpen(open === index ? null : index)}
                className="flex w-full items-center justify-between gap-4 px-6 py-6 text-left"
                aria-expanded={open === index}
              >
                <div className="flex items-center gap-4">
                  <span className="font-brand text-[1.8rem] leading-none tracking-[0.14em] text-white/18">
                    0{index + 1}
                  </span>
                  <span className="max-w-[34rem] font-heading text-[1.2rem] font-bold leading-[1.08] tracking-[-0.03em] text-white">
                    {faq.q}
                  </span>
                </div>
                <ChevronDown
                  size={18}
                  className={cn(
                    "shrink-0 text-white/55 transition-transform duration-300",
                    open === index && "rotate-180"
                  )}
                />
              </button>
              <div
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: open === index ? 220 : 0 }}
              >
                <p className="px-6 pb-6 pl-[5.5rem] text-sm leading-8 text-white/64">
                  {faq.a}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
