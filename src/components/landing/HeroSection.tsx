import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowDown,
  ArrowUpRight,
  CalendarClock,
  ChevronDown,
  Sparkles,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { CTAButton } from "./CTAButton";
import type { LandingSettings } from "./types";
import {
  getDefaultCtaTarget,
  landingImages,
  supportsClasses,
  supportsRentals,
} from "./brand";

interface HeroSectionProps {
  settings: LandingSettings;
  getImage: (k: string, f: string) => string;
}

export function HeroSection({ settings, getImage }: HeroSectionProps) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 800], [0, 180]);
  const opacity = useTransform(scrollY, [0, 320], [1, 0.75]);
  const hasClasses = supportsClasses(settings.business_mode);
  const hasRentals = supportsRentals(settings.business_mode);
  const heroImg = settings.hero_image_url || getImage("hero", landingImages.hero);

  const heroContent = hasClasses && hasRentals
    ? {
        eyebrow: "Treino, quadra e lifestyle em uma só arena",
        title: ["A ARENA ONDE", "FUTEVÔLEI VIRA", "ESTILO DE VIDA."],
        description:
          "Aulas por nível, reserva de quadra em poucos toques e uma atmosfera que mistura performance, comunidade e presença de marca.",
        support: "Do primeiro treino ao jogo com a turma, tudo foi desenhado para gerar desejo de voltar.",
      }
    : hasRentals
      ? {
          eyebrow: "Reserva rápida para quem joga sério",
          title: ["QUADRA PRONTA.", "RITMO ALTO.", "ZERO ATRITO."],
          description:
            "Escolha a quadra, selecione horário e confirme a reserva em uma experiência rápida, premium e objetiva.",
          support: "Estrutura de alto padrão para treinos intensos, jogos entre amigos e agenda sem ruído.",
        }
      : {
          eyebrow: "Método, energia e comunidade na areia",
          title: ["TREINE COM", "MÉTODO.", "APAREÇA FORTE."],
          description:
            "Turmas para diferentes níveis, professores atentos e uma experiência que parece clube premium, não aula genérica.",
          support: "Você entende rápido o que oferecemos, sente valor na marca e encontra o próximo passo sem hesitar.",
        };

  const stats = hasClasses && hasRentals
    ? [
        { value: "4.9", label: "avaliação média" },
        { value: "+500", label: "alunos e jogadores" },
        { value: "7/7", label: "arena ativa" },
      ]
    : hasRentals
      ? [
          { value: "2", label: "quadras premium" },
          { value: "30d", label: "agenda antecipada" },
          { value: "06-22", label: "janela operacional" },
        ]
      : [
          { value: "+500", label: "alunos ativos" },
          { value: "4", label: "níveis de evolução" },
          { value: "4.9", label: "nota no Google" },
        ];

  const highlights = hasClasses && hasRentals
    ? ["Aulas por nível", "Reserva rápida", "Atmosfera de clube"]
    : hasRentals
      ? ["Horários estratégicos", "Confirmação simples", "Estrutura pronta para jogar"]
      : ["Aula experimental", "Progressão técnica", "Comunidade que puxa seu nível"];

  return (
    <section id="hero" className="relative isolate flex min-h-screen items-end overflow-hidden">
      <motion.div className="absolute inset-0" style={{ y }}>
        <img
          src={heroImg}
          alt="Arena esportiva premium"
          className="h-full w-full object-cover"
        />
      </motion.div>

      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,5,5,0.92)_0%,rgba(5,5,5,0.72)_42%,rgba(5,5,5,0.35)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.28),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_18%)]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#050505] to-transparent" />

      <motion.div
        className="relative z-10 mx-auto grid min-h-screen w-full max-w-[1320px] grid-cols-1 gap-10 px-6 pb-12 pt-32 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:items-end lg:pb-16"
        style={{ opacity }}
      >
        <div className="max-w-[760px]">
          <div className="landing-eyebrow">
            <Sparkles className="h-3.5 w-3.5 text-secondary" />
            {heroContent.eyebrow}
          </div>

          <h1 className="font-brand text-[clamp(4.2rem,14vw,10rem)] leading-[0.82] tracking-[0.03em] text-white">
            {heroContent.title.map((line, index) => (
              <span
                key={line}
                className={index === heroContent.title.length - 1 ? "text-secondary" : ""}
              >
                {line}
                <br />
              </span>
            ))}
          </h1>

          <div className="mt-8 grid max-w-[720px] gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
            <div>
              <p className="max-w-[42rem] text-[1.02rem] leading-8 text-white/74 sm:text-[1.08rem]">
                {heroContent.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <CTAButton
                  text={settings.primary_cta_text || "Agendar Aula Experimental"}
                  large
                  href={`#${getDefaultCtaTarget(settings.business_mode)}`}
                />
                {hasRentals && hasClasses ? (
                  <a
                    href="#reservar-quadra"
                    className="group inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.05] px-7 py-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-white no-underline transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    Reservar Quadra
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 transition-transform group-hover:translate-x-0.5">
                      <ArrowUpRight size={15} />
                    </span>
                  </a>
                ) : hasClasses ? (
                  <a
                    href="#turmas"
                    className="group inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.05] px-7 py-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-white no-underline transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    Ver Turmas
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 transition-transform group-hover:translate-x-0.5">
                      <ArrowUpRight size={15} />
                    </span>
                  </a>
                ) : (
                  <a
                    href="#reservar-quadra"
                    className="group inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.05] px-7 py-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-white no-underline transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    Ver Disponibilidade
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 transition-transform group-hover:translate-x-0.5">
                      <ArrowUpRight size={15} />
                    </span>
                  </a>
                )}
              </div>
            </div>

            <div className="landing-panel-soft flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between text-white/52">
                <span className="text-[10px] font-semibold uppercase tracking-[0.32em]">
                  Curadoria
                </span>
                <ArrowDown className="h-4 w-4" />
              </div>
              <p className="text-sm leading-7 text-white/72">{heroContent.support}</p>
              <div className="grid gap-3">
                {highlights.map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-white/52">
                      {item}
                    </span>
                    <div className="h-2.5 w-2.5 rounded-full bg-secondary shadow-[0_0_16px_rgba(249,115,22,0.55)]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="landing-panel hidden h-fit flex-col gap-8 p-6 lg:flex">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-white/45">
                Brand Snapshot
              </p>
              <p className="mt-2 text-sm leading-7 text-white/72">
                Uma landing com energia de campanha e clareza para converter rápido.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.05] p-3 text-secondary">
              <Trophy className="h-5 w-5" />
            </div>
          </div>

          <div className="grid gap-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[22px] border border-white/8 bg-black/20 px-5 py-4"
              >
                <p className="font-brand text-[2.75rem] leading-none tracking-[0.12em] text-white">
                  {stat.value}
                </p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/52">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-[22px] border border-secondary/20 bg-secondary/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                {hasClasses ? <Users className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-secondary/74">
                  Próximo passo
                </p>
                <p className="mt-1 text-sm text-white/72">
                  {hasClasses
                    ? "Escolha a turma e agende sua experiência."
                    : "Selecione a quadra e confirme o horário ideal."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-full flex flex-wrap items-center gap-3 pt-4">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
            <div className="flex gap-0.5 text-secondary">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="h-3.5 w-3.5 fill-current" />
              ))}
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">
              Avaliação consistente e prova social real
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2">
            <Users className="h-3.5 w-3.5 text-white/62" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">
              Comunidade que mistura performance, disciplina e lifestyle
            </span>
          </div>
        </div>
      </motion.div>

      <div className="scroll-indicator absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
        <ChevronDown size={28} className="text-white/38" />
      </div>
    </section>
  );
}
