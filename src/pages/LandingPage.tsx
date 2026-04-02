import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Instagram,
  MapPin,
  Menu,
  MessageCircle,
  Sparkles,
  Star,
  Trophy,
  Users,
  X,
  Youtube,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ClassesSection } from "@/components/landing/ClassesSection";
import { CourtBookingSection } from "@/components/landing/CourtBookingSection";
import { TrialFormSection } from "@/components/landing/TrialFormSection";
import { useLandingData } from "@/components/landing/useLandingData";
import {
  getDefaultCtaTarget,
  getWhatsAppLink,
  landingImages,
  supportsClasses,
  supportsRentals,
} from "@/components/landing/brand";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function formatHours(hours: { open_hour: number; close_hour: number } | null) {
  if (!hours) return "Atendimento via WhatsApp";
  return `${String(hours.open_hour).padStart(2, "0")}h às ${String(hours.close_hour).padStart(2, "0")}h`;
}

function formatOpenDays(openDays: number[] | undefined) {
  if (!openDays?.length) return "Agenda sob consulta";
  return openDays
    .slice()
    .sort((a, b) => a - b)
    .map((day) => DAY_LABELS[day] || "")
    .filter(Boolean)
    .join(" • ");
}

function LandingButton({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const external = href.startsWith("http");

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={cn(
        "inline-flex items-center justify-center gap-3 rounded-md px-6 py-4 text-[11px] font-bold uppercase tracking-[0.24em] no-underline transition-all duration-300 hover:-translate-y-0.5",
        variant === "primary"
          ? "bg-gradient-to-br from-[#ffb693] to-[#ff6b00] text-[#351000] shadow-[0_20px_40px_rgba(255,107,0,0.22)]"
          : "border border-white/12 bg-white/[0.05] text-white kinetic-glass hover:border-white/20 hover:bg-white/[0.08]",
        className
      )}
    >
      <span>{children}</span>
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-sm", variant === "primary" ? "bg-black/10" : "bg-white/[0.08]")}>
        <ArrowUpRight className="h-4 w-4" />
      </span>
    </a>
  );
}

function ServiceCard({
  image,
  label,
  title,
  description,
  href,
  action,
}: {
  image: string;
  label: string;
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <article className="group relative flex min-h-[420px] items-end overflow-hidden rounded-[10px] bg-[#1a1a1a] sm:min-h-[520px]">
      <img src={image} alt={title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(19,19,19,0.08)_0%,rgba(19,19,19,0.62)_55%,rgba(19,19,19,0.94)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(70,234,237,0.14),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(255,107,0,0.2),transparent_22%)]" />

      <div className="relative z-10 w-full p-7 sm:p-10">
        <span className="mb-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#46eaed]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#46eaed] kinetic-teal-glow" />
          {label}
        </span>
        <h3 className="font-landing-headline text-[2rem] font-bold uppercase leading-[0.92] tracking-[-0.04em] text-white sm:text-[2.8rem]">
          {title}
        </h3>
        <p className="mt-4 max-w-[34rem] font-landing-body text-sm leading-7 text-white/68 sm:text-base">
          {description}
        </p>
        <a
          href={href}
          className="mt-7 inline-flex items-center gap-3 border border-white/18 px-5 py-3 font-landing-headline text-[11px] font-bold uppercase tracking-[0.24em] text-white no-underline transition-all duration-300 hover:bg-white hover:text-black"
        >
          {action}
        </a>
      </div>
    </article>
  );
}

export default function LandingPage() {
  const { settings, loaded, getImage, businessHours } = useLandingData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [preselectedClassId, setPreselectedClassId] = useState("");

  const hasClasses = supportsClasses(settings.business_mode);
  const hasRentals = supportsRentals(settings.business_mode);
  const ctaHref = `#${getDefaultCtaTarget(settings.business_mode)}`;
  const heroImage = settings.hero_image_url || getImage("hero", landingImages.hero);
  const aboutImage = getImage("about", landingImages.servicesClasses);
  const primaryText = settings.primary_cta_text || (hasClasses ? "Agendar aula experimental" : "Reservar quadra");
  const whatsappLink = getWhatsAppLink(
    settings.whatsapp_number,
    hasClasses
      ? "Olá! Quero agendar uma aula experimental de futevôlei."
      : "Olá! Quero reservar uma quadra."
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!loaded) {
    return <div className="flex min-h-screen items-center justify-center bg-[#131313] text-white">Carregando landing page...</div>;
  }

  const hero = hasClasses && hasRentals
    ? {
        top: "ONDE O TREINO",
        middle: "ENCONTRA A",
        accent: "AREIA CERTA",
        desc: "Turmas por nível, reserva de quadra em poucos toques e uma experiência pensada para quem leva a areia a sério.",
        bullets: ["Treino guiado", "Reserva rápida", "Comunidade forte"],
        support: "Aulas e reservas abertas",
      }
    : hasClasses
      ? {
          top: "ONDE A EVOLUÇÃO",
          middle: "ENCONTRA",
          accent: "MÉTODO DE VERDADE",
          desc: "Aulas por nível, professores atentos e um fluxo claro para transformar interesse em primeira aula.",
          bullets: ["Aula experimental", "Turmas por nível", "Progressão clara"],
          support: "Turmas em destaque",
        }
      : {
          top: "ONDE O JOGO",
          middle: "ENCONTRA",
          accent: "QUADRA PRONTA",
          desc: "Escolha quadra, data e horário em um fluxo direto, com estrutura premium e menos atrito para reservar.",
          bullets: ["Agenda objetiva", "Fluxo sem ruído", "Estrutura premium"],
          support: "Reservas abertas",
        };

  const about = hasClasses && hasRentals
    ? {
        top: "O RITMO DA CIDADE",
        accent: "ENCONTRA A",
        bottom: "DISCIPLINA DA AREIA",
        text: "A FutVôlei Arena nasce para quem quer treinar com método, jogar com estrutura e sentir uma marca que respeita a rotina do atleta.",
        quote: "Cada detalhe da experiência foi pensado para gerar confiança antes mesmo do primeiro treino.",
      }
    : hasClasses
      ? {
          top: "MÉTODO FORTE,",
          accent: "ROTINA CLARA,",
          bottom: "EVOLUÇÃO VISÍVEL",
          text: "Aqui a aula não parece improviso. A comunicação mostra nível, intenção e um caminho simples para o aluno entender onde começa.",
          quote: "A página vende a experiência certa: treino organizado, energia boa e vontade de voltar.",
        }
      : {
          top: "ESTRUTURA CERTA",
          accent: "PARA QUEM QUER",
          bottom: "JOGAR SÉRIO",
          text: "Reserva boa é reserva que não atrapalha. A proposta aqui é deixar a escolha visual, rápida e forte o bastante para sustentar a percepção de valor.",
          quote: "Quando a agenda é clara e a marca transmite confiança, a decisão acontece mais rápido.",
        };

  const secondaryAction = hasClasses && hasRentals
    ? { label: "Reservar quadra", href: "#reservar-quadra" }
    : hasClasses
      ? { label: "Ver turmas", href: "#turmas" }
      : { label: "Falar no WhatsApp", href: whatsappLink !== "#" ? whatsappLink : "#contato" };

  const statusTitle = hasClasses && hasRentals ? "Aulas e reservas abertas" : hasClasses ? "Turmas abertas" : "Reservas abertas";
  const navLinks = [
    { label: "Serviços", href: "#servicos" },
    { label: "Sobre", href: "#sobre" },
    { label: "Galeria", href: "#galeria" },
    ...(hasClasses ? [{ label: "Turmas", href: "#turmas" }] : []),
    ...(hasRentals ? [{ label: "Quadras", href: "#reservar-quadra" }] : []),
    { label: "Contato", href: "#contato" },
  ];

  const cards = [
    ...(hasClasses
      ? [{
          image: getImage("about", landingImages.servicesClasses),
          label: "Evolução guiada",
          title: "Aulas de futevôlei",
          description: "Do iniciante ao aluno competitivo, com leitura de nível, turma certa e um fluxo pronto para levar direto à aula experimental.",
          href: "#turmas",
          action: "Ver turmas",
        }]
      : []),
    ...(hasRentals
      ? [{
          image: getImage("gallery", landingImages.servicesRentals),
          label: "Agenda sem atrito",
          title: "Reserva de quadras",
          description: "Escolha data, horário e confirme a solicitação em poucos passos, sem cara de sistema antigo e com mais desejo de ação.",
          href: "#reservar-quadra",
          action: "Reservar",
        }]
      : []),
  ];

  if (cards.length === 1) {
    cards.push({
      image: landingImages.galleryLifestyle,
      label: "Experiência de arena",
      title: "Estrutura que sustenta a rotina",
      description: "Mais que areia e rede: presença de marca, sensação de cuidado e ambiente pronto para treino, jogo e comunidade.",
      href: whatsappLink !== "#" ? whatsappLink : ctaHref,
      action: whatsappLink !== "#" ? "Falar no WhatsApp" : "Entrar em contato",
    });
  }

  const gallery = [
    { image: getImage("gallery", landingImages.galleryLead), alt: "Treino noturno", label: "Treino em alta intensidade", className: "md:col-span-2 md:row-span-2" },
    { image: landingImages.galleryNight, alt: "Arena iluminada", label: "Arena iluminada", className: "md:col-span-1 md:row-span-1" },
    { image: landingImages.galleryCrowd, alt: "Clima de jogo", label: "Clima de jogo", className: "md:col-span-1 md:row-span-1" },
    { image: landingImages.galleryMotion, alt: "Movimento e explosão", label: "Movimento e explosão", className: "md:col-span-1 md:row-span-2" },
  ];

  const testimonials = [
    "A estrutura da arena é incrível. Areia de qualidade, iluminação perfeita à noite e professores que realmente acompanham sua evolução.",
    "Comecei sem saber jogar e em dois meses já estava na turma intermediária. O método faz toda a diferença.",
    "Reservei a quadra em menos de dois minutos. Facilidade total e qualidade na estrutura — virei cliente fixo.",
  ];

  const socialLinks = [
    settings.whatsapp_number ? { href: whatsappLink, label: "WhatsApp", icon: MessageCircle } : null,
    settings.instagram_url ? { href: settings.instagram_url, label: "Instagram", icon: Instagram } : null,
    settings.youtube_url ? { href: settings.youtube_url, label: "YouTube", icon: Youtube } : null,
  ].filter(Boolean) as { href: string; label: string; icon: typeof MessageCircle }[];

  return (
    <div className="landing-shell relative overflow-x-hidden bg-[#131313] text-white">
      <div className="kinetic-grid absolute inset-0 opacity-[0.16]" />

      <nav className={cn("fixed inset-x-0 top-0 z-50 px-4 py-4 transition-all duration-300 sm:px-6", scrolled ? "bg-[#111111]/72 kinetic-glass" : "bg-transparent")}>
        <div className={cn("mx-auto flex max-w-[1320px] items-center justify-between gap-4 rounded-[8px] border px-4 py-3 transition-all duration-300 sm:px-6", scrolled ? "border-white/12 bg-black/35" : "border-white/10 bg-black/20")}>
          <a href="#hero" className="font-landing-headline text-xl font-bold uppercase tracking-[-0.04em] text-white no-underline sm:text-2xl">
            FutVôlei Arena
          </a>
          <div className="hidden items-center gap-7 lg:flex">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} className="font-landing-headline text-[11px] font-bold uppercase tracking-[0.22em] text-white/56 no-underline transition-colors hover:text-white">
                {link.label}
              </a>
            ))}
          </div>
          <div className="hidden lg:flex">
            <LandingButton href={ctaHref} className="px-5 py-3">{primaryText}</LandingButton>
          </div>
          <button type="button" className="rounded-[8px] border border-white/10 bg-white/[0.05] p-2 text-white lg:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen ? (
          <div className="mx-auto mt-3 flex max-w-[1320px] flex-col gap-4 rounded-[12px] border border-white/10 bg-[#111111]/92 px-5 py-5 kinetic-glass lg:hidden">
            {navLinks.map((link) => (
              <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)} className="font-landing-headline text-sm font-bold uppercase tracking-[0.18em] text-white/76 no-underline">
                {link.label}
              </a>
            ))}
            <LandingButton href={ctaHref} className="w-full">{primaryText}</LandingButton>
          </div>
        ) : null}
      </nav>

      <section id="hero" className="relative z-[1] flex min-h-screen items-center overflow-hidden pt-24">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Arena de futevôlei ao pôr do sol" className="h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(19,19,19,0.95)_0%,rgba(19,19,19,0.78)_44%,rgba(19,19,19,0.24)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,107,0,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(70,234,237,0.12),transparent_20%)]" />
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-[1320px] gap-10 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end lg:py-16">
          <div className="max-w-[760px]">
            <span className="inline-flex items-center gap-2 border border-white/12 bg-white/[0.05] px-4 py-2 font-landing-body text-[11px] font-semibold uppercase tracking-[0.28em] text-white/76 kinetic-glass">
              <Sparkles className="h-3.5 w-3.5 text-[#46eaed]" />
              A arena de futevôlei que você procurava
            </span>

            <h1 className="kinetic-text-glow mt-8 font-landing-headline text-[clamp(3.8rem,11vw,7.8rem)] font-bold uppercase leading-[0.9] tracking-[-0.06em] text-white">
              FUTVÔLEI ARENA:
              <br />
              {hero.top}
              <br />
              {hero.middle}
              <br />
              <span className="text-[#ffb693]">{hero.accent}</span>
            </h1>

            <p className="mt-6 max-w-[42rem] border-l-2 border-[#46eaed] pl-5 font-landing-body text-[1rem] leading-8 text-white/72 sm:text-[1.08rem]">
              {hero.desc}
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <LandingButton href={ctaHref}>{primaryText}</LandingButton>
              <LandingButton href={secondaryAction.href} variant="secondary">{secondaryAction.label}</LandingButton>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-3 border border-white/10 bg-white/[0.05] px-4 py-3 font-landing-body text-[11px] uppercase tracking-[0.24em] text-white/70 kinetic-glass">
                <Clock3 className="h-4 w-4 text-[#46eaed]" />
                {formatHours(businessHours)}
              </div>
              <div className="inline-flex items-center gap-3 border border-white/10 bg-white/[0.05] px-4 py-3 font-landing-body text-[11px] uppercase tracking-[0.24em] text-white/70 kinetic-glass">
                <Users className="h-4 w-4 text-[#46eaed]" />
                {statusTitle}
              </div>
            </div>
          </div>

          <div className="rounded-[12px] border border-white/10 bg-white/[0.05] p-5 kinetic-glass">
            <div className="flex items-center justify-between text-white/45">
              <span className="font-landing-body text-[10px] font-semibold uppercase tracking-[0.32em]">Snapshot</span>
              <Trophy className="h-4 w-4 text-[#ffb693]" />
            </div>
            <p className="mt-5 font-landing-body text-sm leading-7 text-white/70">
              Estrutura completa, metodologia séria e uma comunidade de atletas que evoluem juntos.
            </p>
            <div className="mt-6 grid gap-3">
              {hero.bullets.map((item) => (
                <div key={item} className="flex items-center justify-between rounded-[8px] border border-white/8 bg-white/[0.03] px-4 py-3">
                  <span className="font-landing-headline text-[11px] font-bold uppercase tracking-[0.22em] text-white/64">{item}</span>
                  <span className="h-2.5 w-2.5 rounded-full bg-[#46eaed] kinetic-teal-glow" />
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-[8px] bg-[#46eaed]/10 px-4 py-4">
              <p className="font-landing-body text-[10px] font-semibold uppercase tracking-[0.3em] text-[#46eaed]">{hero.support}</p>
              <p className="mt-2 font-landing-body text-sm leading-7 text-white/68">{formatOpenDays(businessHours?.open_days)}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="servicos" className="relative z-[1] px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end">
            <h2 className="font-landing-headline text-[2.4rem] font-bold uppercase tracking-[-0.05em] text-white sm:text-[3.4rem]">Nossos serviços</h2>
            <div className="h-px flex-1 bg-white/10 md:mb-3" />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            {cards.map((card) => <ServiceCard key={card.title} {...card} />)}
          </div>
        </div>
      </section>

      <section id="sobre" className="relative z-[1] bg-[#1a1a1a] px-6 py-20 sm:py-24">
        <div className="mx-auto grid max-w-[1320px] gap-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
          <div className="relative">
            <div className="absolute -left-8 -top-8 h-40 w-40 rounded-full bg-[#ff6b00]/12 blur-3xl" />
            <h2 className="relative z-10 font-landing-headline text-[clamp(3rem,9vw,5.5rem)] font-bold uppercase leading-[0.9] tracking-[-0.06em] text-white">
              {about.top}
              <br />
              <span className="text-[#46eaed]">{about.accent}</span>
              <br />
              {about.bottom}
            </h2>
            <div className="relative z-10 mt-8 space-y-6">
              <p className="max-w-[42rem] font-landing-body text-base leading-8 text-white/72">{about.text}</p>
              <p className="max-w-[40rem] border-l-2 border-[#ffb693] pl-5 font-landing-body text-base italic leading-8 text-white/68">
                "{about.quote}"
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Metodologia desenvolvida por profissionais",
                  "Areia tratada e iluminação LED premium",
                  "Reservas online rápidas e sem burocracia",
                  "Ambiente para atletas de todos os níveis",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 font-landing-body text-sm text-white/66">
                    <CheckCircle2 className="h-4 w-4 text-[#46eaed]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="kinetic-clip overflow-hidden rounded-[12px] bg-[#242424]">
              <img src={aboutImage} alt="Atleta na arena" className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="absolute -bottom-5 left-4 rounded-[10px] border border-white/10 bg-white/[0.06] p-5 kinetic-glass sm:left-[-1.5rem]">
              <div className="flex items-center gap-4">
                <span className="h-3 w-3 rounded-full bg-[#46eaed] kinetic-teal-glow" />
                <div>
                  <p className="font-landing-body text-[10px] uppercase tracking-[0.28em] text-white/40">Status da agenda</p>
                  <p className="mt-1 font-landing-headline text-sm font-bold uppercase tracking-[0.12em] text-white">{statusTitle}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="galeria" className="relative z-[1] px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-[1320px]">
          <div className="grid h-auto gap-4 md:h-[780px] md:grid-cols-4 md:grid-rows-2">
            {gallery.map((tile) => (
              <article key={tile.label} className={cn("group relative min-h-[260px] overflow-hidden rounded-[10px] bg-[#1a1a1a]", tile.className)}>
                <img src={tile.image} alt={tile.alt} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_28%,rgba(19,19,19,0.82)_100%)]" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="font-landing-headline text-sm font-bold uppercase tracking-[0.22em] text-white">{tile.label}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-[1] bg-[#111111] px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-[1320px]">
          <h2 className="mb-12 text-center font-landing-headline text-[2rem] font-bold uppercase tracking-[-0.05em] text-white sm:text-[2.8rem]">Elite feedback</h2>
          <div className="grid gap-6 xl:grid-cols-3">
            {testimonials.map((quote, index) => (
              <article key={quote} className="relative overflow-hidden rounded-[10px] bg-[#1b1b1b] p-8">
                <div className={cn("absolute left-0 top-0 h-1 w-20", index === 1 ? "bg-[#ffb693]" : "bg-[#46eaed]")} />
                <div className="mb-6 flex gap-1 text-[#46eaed]">
                  {Array.from({ length: 5 }).map((_, star) => <Star key={star} className="h-3.5 w-3.5 fill-current" />)}
                </div>
                <p className="font-landing-body text-[1rem] leading-7 text-white/74">"{quote}"</p>
                <div className="mt-8 flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/8 font-landing-headline text-sm font-bold uppercase text-white/82">FV</div>
                  <div>
                    <p className="font-landing-headline text-sm font-bold uppercase tracking-[0.14em] text-white">
                      {index === 0 ? "Mateus S." : index === 1 ? "Ana Lima" : "Carlos M."}
                    </p>
                    <p className="mt-1 font-landing-body text-[10px] uppercase tracking-[0.28em] text-white/38">{index === 0 ? "Aluno avançado" : index === 1 ? "Aluna recorrente" : "Jogador regular"}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {hasClasses ? <ClassesSection onSelectClass={setPreselectedClassId} /> : null}
      {hasClasses ? <TrialFormSection settings={settings} preselectedClassId={preselectedClassId} /> : null}
      {hasRentals ? <CourtBookingSection /> : null}

      <footer id="contato" className="relative z-[1] px-6 pb-8 pt-16">
        <div className="mx-auto max-w-[1320px] overflow-hidden rounded-[14px] border border-white/10 bg-black/60 kinetic-glass">
          <div className="grid gap-8 border-b border-white/8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <h2 className="font-landing-headline text-[2.2rem] font-bold uppercase leading-[0.92] tracking-[-0.05em] text-white sm:text-[3.4rem]">
                Pronto para entrar no jogo?
              </h2>
              <p className="mt-4 font-landing-body text-sm uppercase tracking-[0.22em] text-white/44 sm:text-[12px]">
                Sua primeira aula experimental é por nossa conta.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <LandingButton href={ctaHref}>{primaryText}</LandingButton>
              <LandingButton href={secondaryAction.href} variant="secondary">{secondaryAction.label}</LandingButton>
            </div>
          </div>

          <div className="grid gap-10 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.1fr_0.8fr_0.9fr]">
            <div className="space-y-6">
              <div>
                <p className="font-landing-headline text-xl font-bold uppercase tracking-[-0.04em] text-[#ffb693]">FutVôlei Arena</p>
                <p className="mt-4 max-w-[26rem] font-landing-body text-sm leading-7 text-white/58">
                  A arena ideal para quem leva o futevôlei a sério. Aulas com método, quadras premium e uma comunidade que cresce junto.
                </p>
              </div>
              {socialLinks.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {socialLinks.map(({ href, label, icon: Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-[8px] border border-white/10 bg-white/[0.04] text-white/68 transition hover:border-[#46eaed]/30 hover:bg-[#46eaed]/10 hover:text-white"
                      aria-label={label}
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-4">
              <h3 className="font-landing-headline text-sm font-bold uppercase tracking-[0.18em] text-white">Navegação</h3>
              {navLinks.map((link) => (
                <a key={link.label} href={link.href} className="font-landing-body text-sm uppercase tracking-[0.2em] text-white/46 no-underline transition hover:text-[#46eaed]">
                  {link.label}
                </a>
              ))}
            </div>

            <div className="grid gap-4">
              <h3 className="font-landing-headline text-sm font-bold uppercase tracking-[0.18em] text-white">Operação</h3>
              <div className="flex items-start gap-3 font-landing-body text-sm leading-7 text-white/62">
                <Clock3 className="mt-1 h-4 w-4 text-[#46eaed]" />
                <div>
                  <p>{formatHours(businessHours)}</p>
                  <p className="text-white/38">{formatOpenDays(businessHours?.open_days)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 font-landing-body text-sm leading-7 text-white/62">
                <MapPin className="mt-1 h-4 w-4 text-[#46eaed]" />
                <div>
                  <p>Endereço e localização disponíveis via WhatsApp</p>
                  <p className="text-white/38">Consulte nosso calendário completo</p>
                </div>
              </div>
              {settings.whatsapp_number ? (
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-landing-body text-sm text-[#46eaed] no-underline transition hover:text-white">
                  <MessageCircle className="h-4 w-4" />
                  Falar no WhatsApp
                </a>
              ) : null}
            </div>
          </div>

          <div className="border-t border-white/8 px-6 py-5 text-center sm:px-8">
            <p className="font-landing-body text-[11px] uppercase tracking-[0.22em] text-white/28">
              © {new Date().getFullYear()} FutVôlei Arena. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
