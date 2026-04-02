import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Clock3,
  Instagram,
  MapPin,
  Menu,
  MessageCircle,
  Star,
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
    <article className="group relative flex h-[600px] items-end overflow-hidden bg-zinc-900">
      <img
        src={image}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/60 to-transparent opacity-90" />

      <div className="relative z-10 w-full p-10 sm:p-12">
        <span className="mb-4 block font-landing-headline text-[11px] font-bold uppercase tracking-[0.3em] text-[#46eaed]">
          {label}
        </span>
        <h3 className="font-landing-headline text-4xl font-black uppercase leading-none tracking-tight text-white sm:text-5xl">
          {title}
        </h3>
        <p className="mt-5 max-w-md font-landing-body text-sm leading-7 text-zinc-400">
          {description}
        </p>
        <a
          href={href}
          className="mt-8 inline-flex items-center gap-3 border border-white/20 px-8 py-3 font-landing-headline text-[11px] font-bold uppercase tracking-widest text-white no-underline transition-colors hover:bg-white hover:text-black"
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0d0d] text-white">
        Carregando...
      </div>
    );
  }

  const hero =
    hasClasses && hasRentals
      ? {
          top: "ONDE O TREINO",
          middle: "ENCONTRA A",
          accent: "AREIA CERTA",
          desc: "Turmas por nível, reserva de quadra em poucos toques e uma experiência pensada para quem leva a areia a sério.",
        }
      : hasClasses
        ? {
            top: "ONDE A EVOLUÇÃO",
            middle: "ENCONTRA O",
            accent: "MÉTODO CERTO",
            desc: "Aulas por nível, professores atentos e um fluxo claro para transformar interesse em primeira aula.",
          }
        : {
            top: "ONDE O JOGO",
            middle: "ENCONTRA A",
            accent: "QUADRA PERFEITA",
            desc: "Escolha quadra, data e horário em um fluxo direto, com estrutura premium e menos atrito para reservar.",
          };

  const about =
    hasClasses && hasRentals
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
            text: "Aqui a aula não parece improviso. Cada turma tem nível definido, progressão clara e um professor que acompanha de perto.",
            quote: "Do iniciante ao competitivo — existe um caminho aqui para cada fase da sua evolução.",
          }
        : {
            top: "ESTRUTURA CERTA",
            accent: "PARA QUEM QUER",
            bottom: "JOGAR SÉRIO",
            text: "Areia tratada, iluminação LED e reserva online sem burocracia. Estrutura premium para quem respeita o jogo.",
            quote: "Quando a agenda é clara e a marca transmite confiança, a decisão acontece mais rápido.",
          };

  const secondaryAction =
    hasClasses && hasRentals
      ? { label: "Reservar quadra", href: "#reservar-quadra" }
      : hasClasses
        ? { label: "Ver turmas", href: "#turmas" }
        : { label: "Falar no WhatsApp", href: whatsappLink !== "#" ? whatsappLink : "#contato" };

  const statusTitle =
    hasClasses && hasRentals
      ? "Aulas e reservas abertas"
      : hasClasses
        ? "Turmas abertas"
        : "Reservas abertas";

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
      ? [
          {
            image: getImage("about", landingImages.servicesClasses),
            label: "Alta Performance",
            title: "Aulas de Futevôlei",
            description:
              "Do iniciante ao aluno competitivo. Metodologia exclusiva focada em biomecânica, leitura de jogo e explosão muscular.",
            href: "#turmas",
            action: "Ver turmas",
          },
        ]
      : []),
    ...(hasRentals
      ? [
          {
            image: getImage("gallery", landingImages.servicesRentals),
            label: "Exclusividade",
            title: "Aluguel de Quadras",
            description:
              "Areia tratada, iluminação LED premium e estrutura completa de vestiário e lounge para o seu jogo.",
            href: "#reservar-quadra",
            action: "Reservar horário",
          },
        ]
      : []),
  ];

  if (cards.length === 1) {
    cards.push({
      image: landingImages.galleryLifestyle,
      label: "Experiência de arena",
      title: "Estrutura que sustenta a rotina",
      description:
        "Mais que areia e rede: presença de marca, sensação de cuidado e ambiente pronto para treino, jogo e comunidade.",
      href: whatsappLink !== "#" ? whatsappLink : ctaHref,
      action: whatsappLink !== "#" ? "Falar no WhatsApp" : "Entrar em contato",
    });
  }

  const gallery = [
    {
      image: getImage("gallery", landingImages.galleryLead),
      alt: "Treino noturno",
      label: "Treino em alta intensidade",
      className: "md:col-span-2 md:row-span-2",
    },
    {
      image: landingImages.galleryNight,
      alt: "Arena iluminada",
      label: "Arena iluminada",
      className: "md:col-span-1 md:row-span-1",
    },
    {
      image: landingImages.galleryCrowd,
      alt: "Clima de jogo",
      label: "Clima de jogo",
      className: "md:col-span-1 md:row-span-1",
    },
    {
      image: landingImages.galleryMotion,
      alt: "Movimento e explosão",
      label: "Movimento e explosão",
      className: "md:col-span-1 md:row-span-2",
    },
  ];

  const testimonials = [
    {
      quote: "A estrutura da arena é incrível. Areia de qualidade, iluminação perfeita à noite e professores que realmente acompanham sua evolução.",
      name: "Mateus S.",
      role: "Aluno avançado",
      accent: "teal",
    },
    {
      quote: "Comecei sem saber jogar e em dois meses já estava na turma intermediária. O método faz toda a diferença.",
      name: "Ana Lima",
      role: "Aluna recorrente",
      accent: "orange",
    },
    {
      quote: "Reservei a quadra em menos de dois minutos. Facilidade total e qualidade na estrutura — virei cliente fixo.",
      name: "Carlos M.",
      role: "Jogador regular",
      accent: "teal",
    },
  ];

  const socialLinks = [
    settings.whatsapp_number ? { href: whatsappLink, label: "WhatsApp", icon: MessageCircle } : null,
    settings.instagram_url ? { href: settings.instagram_url, label: "Instagram", icon: Instagram } : null,
    settings.youtube_url ? { href: settings.youtube_url, label: "YouTube", icon: Youtube } : null,
  ].filter(Boolean) as { href: string; label: string; icon: typeof MessageCircle }[];

  return (
    <div className="relative overflow-x-hidden bg-[#0d0d0d] text-white" style={{ fontFamily: "'Manrope', sans-serif" }}>

      {/* ── NAV ── */}
      <nav
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled ? "bg-[#0d0d0d]/80 backdrop-blur-xl shadow-lg shadow-orange-500/5" : "bg-transparent"
        )}
      >
        <div className="flex items-center justify-between px-8 py-4 max-w-full mx-auto">
          <a
            href="#hero"
            className="font-landing-headline text-2xl font-black italic tracking-tight text-white no-underline"
          >
            FutVôlei Arena
          </a>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link, i) => (
              <a
                key={link.label}
                href={link.href}
                className={cn(
                  "font-landing-headline text-sm font-bold uppercase tracking-tight no-underline transition-colors",
                  i === 0
                    ? "text-[#ffb693] border-b-2 border-[#ffb693]"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {link.label}
              </a>
            ))}
          </div>

          <a
            href={ctaHref}
            className="hidden md:inline-flex bg-[#46eaed] text-[#003738] px-6 py-2 font-landing-headline font-bold uppercase text-xs tracking-widest hover:scale-105 transition-transform no-underline"
          >
            {hasClasses ? "Agendar Aula" : "Reservar"}
          </a>

          <button
            type="button"
            className="md:hidden rounded border border-white/10 bg-white/5 p-2 text-white"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="mx-4 mb-4 flex flex-col gap-4 rounded border border-white/10 bg-[#111]/95 px-5 py-5 backdrop-blur-xl md:hidden">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="font-landing-headline text-sm font-bold uppercase tracking-widest text-white/80 no-underline"
              >
                {link.label}
              </a>
            ))}
            <a
              href={ctaHref}
              className="bg-[#46eaed] text-[#003738] px-6 py-3 text-center font-landing-headline font-bold uppercase text-xs tracking-widest no-underline"
            >
              {primaryText}
            </a>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section id="hero" className="relative flex min-h-screen items-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Arena de futevôlei"
            className="h-full w-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d0d0d] via-[#0d0d0d]/80 to-transparent" />
        </div>

        <div className="relative z-10 px-8 md:px-20 max-w-5xl">
          <h1
            className="font-landing-headline text-[clamp(3.5rem,10vw,7rem)] font-black leading-none tracking-tight mb-8"
            style={{ textShadow: "0 0 20px rgba(255,182,147,0.4)" }}
          >
            FUTVÔLEI ARENA:
            <br />
            {hero.top}
            <br />
            {hero.middle}
            <br />
            <span className="text-[#ffb693] italic">{hero.accent}</span>
          </h1>

          <p className="font-landing-body text-lg md:text-xl text-zinc-300 max-w-2xl mb-10 border-l-4 border-[#46eaed] pl-6">
            {hero.desc}
          </p>

          <div className="flex flex-wrap gap-5 mb-8">
            <a
              href={ctaHref}
              className="inline-flex items-center gap-3 bg-gradient-to-br from-[#ffb693] to-[#ff6b00] text-[#351000] px-10 py-4 font-landing-headline font-black uppercase tracking-widest rounded-md hover:scale-105 transition-transform no-underline"
            >
              {primaryText}
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <a
              href={secondaryAction.href}
              className="inline-flex items-center gap-3 border border-white/20 bg-white/5 text-white px-8 py-4 font-landing-headline font-bold uppercase text-xs tracking-widest backdrop-blur-xl hover:border-white/40 transition-colors no-underline"
            >
              {secondaryAction.label}
            </a>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="inline-flex items-center gap-3 border border-white/10 bg-white/5 px-5 py-3 font-landing-body text-[11px] uppercase tracking-widest text-white/70 backdrop-blur-xl">
              <Clock3 className="h-4 w-4 text-[#46eaed]" />
              {formatHours(businessHours)}
            </div>
            <div className="inline-flex items-center gap-3 border border-white/10 bg-white/5 px-5 py-3 font-landing-body text-[11px] uppercase tracking-widest text-white/70 backdrop-blur-xl">
              <Users className="h-4 w-4 text-[#46eaed]" />
              {statusTitle}
            </div>
            <div className="inline-flex items-center gap-3 border border-white/10 bg-white/5 px-5 py-3 font-landing-body text-[11px] uppercase tracking-widest text-white/70 backdrop-blur-xl">
              <MapPin className="h-4 w-4 text-[#46eaed]" />
              {formatOpenDays(businessHours?.open_days)}
            </div>
          </div>
        </div>
      </section>

      {/* ── SERVIÇOS ── */}
      <section id="servicos" className="py-32 px-8 md:px-20 bg-[#0d0d0d]">
        <div className="flex flex-col md:flex-row gap-10 items-end mb-20">
          <h2 className="font-landing-headline text-5xl font-bold uppercase tracking-tight shrink-0 text-white">
            Nossos Serviços
          </h2>
          <div className="h-px bg-white/10 w-full mb-1" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {cards.map((card) => (
            <ServiceCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      {/* ── SOBRE ── */}
      <section id="sobre" className="py-32 bg-[#111111] overflow-hidden">
        <div className="max-w-7xl mx-auto px-8 md:px-20 grid grid-cols-1 md:grid-cols-12 gap-16 items-center">
          <div className="md:col-span-7 relative">
            <div className="absolute -top-12 -left-12 w-64 h-64 bg-[#ffb693]/10 blur-[100px]" />
            <h2 className="font-landing-headline text-[clamp(3rem,8vw,5.5rem)] font-black uppercase leading-none tracking-tight mb-12 relative z-10">
              {about.top}
              <br />
              <span className="text-[#46eaed]">{about.accent}</span>
              <br />
              {about.bottom}
            </h2>
            <div className="space-y-8 relative z-10">
              <p className="font-landing-body text-lg leading-relaxed text-zinc-300 max-w-xl">
                {about.text}
              </p>
              <p className="font-landing-body text-lg leading-relaxed text-zinc-300 italic border-l-2 border-[#ffb693] pl-6 max-w-xl">
                "{about.quote}"
              </p>
            </div>
          </div>

          <div className="md:col-span-5 relative">
            <div
              className="w-full aspect-[4/5] overflow-hidden"
              style={{ clipPath: "polygon(0 0, 100% 5%, 100% 100%, 0 95%)" }}
            >
              <img
                src={aboutImage}
                alt="Atleta na arena"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-6 -left-8 flex items-center gap-4 border border-white/10 bg-[#393939]/40 p-5 backdrop-blur-xl rounded-xl">
              <div className="h-3 w-3 rounded-full bg-[#46eaed]" style={{ boxShadow: "0 0 18px rgba(70,234,237,0.6)" }} />
              <div>
                <p className="font-landing-body text-[10px] uppercase tracking-widest text-zinc-400">Status Agora</p>
                <p className="font-landing-headline font-bold text-white uppercase">{statusTitle}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── GALERIA ── */}
      <section id="galeria" className="py-32 px-8 md:px-20 bg-[#0d0d0d]">
        <div className="grid grid-cols-1 md:grid-cols-4 grid-rows-2 gap-4 h-auto md:h-[800px]">
          {gallery.map((tile) => (
            <article
              key={tile.label}
              className={cn("group relative min-h-[260px] overflow-hidden bg-zinc-900", tile.className)}
            >
              <img
                src={tile.image}
                alt={tile.alt}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d]/80 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="font-landing-headline text-sm font-bold uppercase tracking-widest text-white">
                  {tile.label}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── DEPOIMENTOS ── */}
      <section className="py-32 bg-[#080808]">
        <div className="max-w-7xl mx-auto px-8 md:px-20">
          <h2 className="font-landing-headline text-4xl font-black uppercase tracking-tight mb-16 text-center text-white">
            Elite Feedback
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => (
              <article
                key={t.name}
                className={cn(
                  "p-10 border-t-4 bg-[#161616]",
                  t.accent === "teal" ? "border-[#46eaed]" : "border-[#ffb693]"
                )}
              >
                <div
                  className={cn(
                    "flex gap-1 mb-6",
                    t.accent === "teal" ? "text-[#46eaed]" : "text-[#ffb693]"
                  )}
                >
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="font-landing-body text-lg italic text-zinc-300 mb-8">"{t.quote}"</p>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 font-landing-headline text-sm font-bold uppercase text-white/80">
                    FV
                  </div>
                  <div>
                    <p className="font-landing-headline font-bold text-sm uppercase text-white">{t.name}</p>
                    <p className="font-landing-body text-[10px] uppercase tracking-widest text-zinc-500">{t.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEÇÕES DINÂMICAS ── */}
      {hasClasses && <ClassesSection onSelectClass={setPreselectedClassId} />}
      {hasClasses && <TrialFormSection settings={settings} preselectedClassId={preselectedClassId} />}
      {hasRentals && <CourtBookingSection />}

      {/* ── FOOTER ── */}
      <footer id="contato" className="bg-zinc-900">
        {/* CTA email */}
        <div className="max-w-7xl mx-auto px-12 py-24 flex flex-col md:flex-row items-center justify-between border-b border-white/5 gap-12">
          <div className="text-center md:text-left">
            <h2 className="font-landing-headline text-5xl font-black uppercase tracking-tight mb-4 text-white">
              PRONTO PARA O JOGO?
            </h2>
            <p className="font-landing-body text-sm uppercase tracking-[0.2em] text-zinc-500">
              Sua primeira aula experimental é por nossa conta.
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-6 w-full md:w-auto">
            <input
              type="email"
              placeholder="SEU MELHOR E-MAIL"
              className="bg-[#353534] border-b-2 border-transparent focus:border-[#46eaed] outline-none px-6 py-4 text-white font-landing-headline text-sm w-full md:w-80 transition-colors"
            />
            <a
              href={ctaHref}
              className="bg-[#ffb693] text-[#351000] px-12 py-4 font-landing-headline font-black uppercase tracking-widest hover:bg-[#ff6b00] transition-colors shrink-0 text-center no-underline"
            >
              {primaryText}
            </a>
          </div>
        </div>

        {/* Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-12 py-16 max-w-7xl mx-auto">
          <div className="flex flex-col gap-6">
            <p className="font-landing-headline text-xl font-bold text-[#ff6b00]">FutVôlei Arena</p>
            <p className="font-landing-body text-xs tracking-widest uppercase text-zinc-500 max-w-xs">
              A arena ideal para quem leva o futevôlei a sério. Aulas com método, quadras premium e uma comunidade que cresce junto.
            </p>
            {socialLinks.length > 0 && (
              <div className="flex gap-4">
                {socialLinks.map(({ href, label, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center border border-white/10 bg-white/5 text-zinc-500 transition hover:text-[#46eaed] hover:border-[#46eaed]/30"
                    aria-label={label}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col gap-4">
              <h4 className="font-landing-headline font-bold text-sm uppercase text-white">Menu</h4>
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="font-landing-body text-xs tracking-widest uppercase text-zinc-500 hover:text-[#46eaed] transition-colors no-underline"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="font-landing-headline font-bold text-sm uppercase text-white">Operação</h4>
              <div className="flex items-start gap-2 font-landing-body text-xs text-zinc-500">
                <Clock3 className="h-3.5 w-3.5 mt-0.5 text-[#46eaed] shrink-0" />
                <div>
                  <p>{formatHours(businessHours)}</p>
                  <p className="text-zinc-600">{formatOpenDays(businessHours?.open_days)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 font-landing-body text-xs text-zinc-500">
                <MapPin className="h-3.5 w-3.5 mt-0.5 text-[#46eaed] shrink-0" />
                <p>Endereço via WhatsApp</p>
              </div>
              {settings.whatsapp_number && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-landing-body text-xs text-[#46eaed] no-underline hover:text-white transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Falar no WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="px-12 py-8 bg-black text-center">
          <p className="font-landing-body text-xs tracking-widest uppercase text-zinc-700">
            © {new Date().getFullYear()} FutVôlei Arena. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
