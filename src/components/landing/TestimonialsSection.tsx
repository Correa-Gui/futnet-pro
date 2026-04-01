import { Star } from "lucide-react";
import { Section, SectionLabel, SectionTitle } from "./Section";
import type { LandingSettings } from "./types";

export function TestimonialsSection({ settings }: { settings: LandingSettings }) {
  const isRentals = settings.business_mode === "rentals";

  const reviews = isRentals
    ? [
        {
          name: "Rafael S.",
          role: "Reserva recorrente",
          text: "O processo é simples, a quadra está sempre pronta e a experiência passa uma sensação de estrutura séria.",
        },
        {
          name: "Camila R.",
          role: "Joga 2x por semana",
          text: "Parece marca premium, não improviso. Desde a reserva até a chegada, tudo flui rápido.",
        },
        {
          name: "Lucas M.",
          role: "Treino com amigos",
          text: "Finalmente uma arena com identidade e rotina estável para fechar nossos horários.",
        },
        {
          name: "Ana P.",
          role: "Cliente da noite",
          text: "A organização transmite confiança. Você entende que não está alugando qualquer quadra.",
        },
      ]
    : [
        {
          name: "Lucas M.",
          role: "Aluno há 8 meses",
          text: "Nunca tinha jogado futevôlei e em pouco tempo já sentia evolução real. A experiência inteira parece bem pensada.",
        },
        {
          name: "Camila R.",
          role: "Aluna há 1 ano",
          text: "Treinar aqui mudou minha rotina. Tem energia de clube premium e acolhimento de comunidade de verdade.",
        },
        {
          name: "Rafael S.",
          role: "Aluno intermediário",
          text: "A estrutura impressiona, mas o que prende mesmo é o método e a constância dos professores.",
        },
        {
          name: "Ana P.",
          role: "Mãe de aluno",
          text: "Meu filho ganhou disciplina, técnica e vontade de voltar. A percepção de valor é muito alta.",
        },
      ];

  const featured = reviews[0];
  const secondary = reviews.slice(1);

  return (
    <Section className="px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-10 grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div className="max-w-[34rem]">
            <SectionLabel light>Prova social</SectionLabel>
            <SectionTitle light className="max-w-[12ch]">
              CONFIANÇA NÃO VEM DE PROMESSA. VEM DE EXPERIÊNCIA PERCEBIDA.
            </SectionTitle>
          </div>
          <p className="max-w-[34rem] text-sm leading-8 text-white/66 sm:text-base">
            A seção de depoimentos saiu do padrão de cards repetidos e virou argumento de marca:
            um destaque principal e apoios menores, com leitura limpa e acabamento mais editorial.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="landing-panel flex min-h-[340px] flex-col justify-between p-7 sm:p-8">
            <div>
              <div className="mb-6 flex gap-1 text-secondary">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="max-w-[24ch] font-heading text-[clamp(2rem,4vw,3.6rem)] font-extrabold leading-[0.98] tracking-[-0.05em] text-white">
                “{featured.text}”
              </p>
            </div>

            <div className="mt-10 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
                  {featured.name}
                </p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  {featured.role}
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/58">
                Google 4.9
              </div>
            </div>
          </article>

          <div className="grid gap-5">
            {secondary.map((review) => (
              <article key={review.name} className="landing-panel-soft p-6">
                <div className="mb-4 flex gap-1 text-secondary">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="text-base leading-8 text-white/70">“{review.text}”</p>
                <div className="mt-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
                    {review.name}
                  </p>
                  <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">
                    {review.role}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
