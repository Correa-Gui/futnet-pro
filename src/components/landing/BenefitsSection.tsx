import {
  ArrowUpRight,
  Dumbbell,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  Trophy,
  Users,
} from "lucide-react";
import { motion } from "framer-motion";
import { Section, SectionLabel, SectionTitle } from "./Section";
import type { LandingSettings } from "./types";

export function BenefitsSection({ settings }: { settings: LandingSettings }) {
  const isRentals = settings.business_mode === "rentals";

  const items = isRentals
    ? [
        {
          title: "Reserva sem fricção",
          description: "Fluxo simples para escolher quadra, data e horário sem ruído operacional.",
          icon: TimerReset,
          accent: "col-span-12 lg:col-span-5",
        },
        {
          title: "Estrutura que sustenta seu jogo",
          description: "Areia regular, iluminação forte e experiência enxuta do primeiro clique até a chegada.",
          icon: ShieldCheck,
          accent: "col-span-12 lg:col-span-7",
        },
        {
          title: "Janela ampla",
          description: "Horários pensados para treino cedo, pós-trabalho e agenda social.",
          icon: Sparkles,
          accent: "col-span-12 md:col-span-6 lg:col-span-4",
        },
        {
          title: "Valor percebido alto",
          description: "Atmosfera premium sem parecer burocrática ou engessada.",
          icon: Trophy,
          accent: "col-span-12 md:col-span-6 lg:col-span-4",
        },
        {
          title: "Quadra pronta para pertencer à sua rotina",
          description: "O espaço vira extensão da sua disciplina, da sua turma e da sua frequência.",
          icon: Users,
          accent: "col-span-12 lg:col-span-4",
        },
      ]
    : [
        {
          title: "Método visível",
          description: "Treino com progressão real, leitura de nível e sensação de evolução desde a primeira semana.",
          icon: Target,
          accent: "col-span-12 lg:col-span-5",
        },
        {
          title: "Comunidade forte",
          description: "Você não entra em uma aula perdida. Entra em um ecossistema com energia, identidade e recorrência.",
          icon: Users,
          accent: "col-span-12 lg:col-span-7",
        },
        {
          title: "Professores que elevam o padrão",
          description: "Feedback atento e ritmo de treino que respeita seu nível sem tirar intensidade.",
          icon: ShieldCheck,
          accent: "col-span-12 md:col-span-6 lg:col-span-4",
        },
        {
          title: "Condicionamento e presença",
          description: "Força, agilidade, coordenação e estética atlética andando juntos.",
          icon: Dumbbell,
          accent: "col-span-12 md:col-span-6 lg:col-span-4",
        },
        {
          title: "Rotina com cara de clube premium",
          description: "O treino deixa de ser obrigação e vira parte do seu lifestyle esportivo.",
          icon: Trophy,
          accent: "col-span-12 lg:col-span-4",
        },
      ];

  return (
    <Section id="beneficios" className="px-6 py-20 sm:py-24">
      <div className="mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-end">
        <div className="max-w-[34rem]">
          <SectionLabel light>Por que a marca segura atenção</SectionLabel>
          <SectionTitle light className="max-w-[12ch]">
            EXPERIÊNCIA COM CARA DE CAMPANHA. ENTREGA COM CARA DE CLUBE.
          </SectionTitle>
          <p className="text-base leading-8 text-white/68">
            Em vez de uma landing com seções genéricas, a narrativa foi montada para parecer marca
            esportiva contemporânea: contraste forte, composição irregular e clareza comercial.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              "Hierarquia visual dominante para headline, prova social e CTA.",
              "Ritmo de leitura alternando blocos densos, respiros e imagens de alto impacto.",
            ].map((text) => (
              <div key={text} className="landing-panel-soft p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/12 text-secondary">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
                <p className="text-sm leading-7 text-white/68">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {items.map((item, index) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
              className={`${item.accent} landing-panel flex min-h-[220px] flex-col justify-between p-6`}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/12 text-secondary">
                  <item.icon className="h-5 w-5" />
                </div>
                <span className="font-brand text-[2rem] leading-none tracking-[0.18em] text-white/18">
                  0{index + 1}
                </span>
              </div>

              <div className="mt-12">
                <h3 className="max-w-[16ch] font-heading text-[1.55rem] font-extrabold leading-[1.02] tracking-[-0.03em] text-white">
                  {item.title}
                </h3>
                <p className="mt-4 max-w-[32rem] text-sm leading-7 text-white/64">
                  {item.description}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </Section>
  );
}
