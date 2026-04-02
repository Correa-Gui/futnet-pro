import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  MapPin,
  Menu,
  MessageCircle,
  Play,
  Share2,
  Star,
  Users,
  X,
  Zap,
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
    .map((d) => DAY_LABELS[d] || "")
    .filter(Boolean)
    .join(" · ");
}

// ── PRIMITIVES ──────────────────────────────────────────────────────────────

function PrimaryButton({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ext = href.startsWith("http");
  return (
    <a
      href={href}
      target={ext ? "_blank" : undefined}
      rel={ext ? "noopener noreferrer" : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-[#F97316] px-7 py-3.5 text-sm font-semibold text-white no-underline transition-all hover:bg-[#EA6C0A] hover:shadow-[0_8px_24px_rgba(249,115,22,0.35)] active:scale-95",
        className
      )}
    >
      {children}
    </a>
  );
}

function GhostButton({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const ext = href.startsWith("http");
  return (
    <a
      href={href}
      target={ext ? "_blank" : undefined}
      rel={ext ? "noopener noreferrer" : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3.5 text-sm font-medium text-white/80 no-underline transition-all hover:border-white/40 hover:text-white",
        className
      )}
    >
      {children}
    </a>
  );
}

function ServiceCard({
  image,
  badge,
  title,
  description,
  href,
  action,
}: {
  image: string;
  badge: string;
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <article className="group relative flex min-h-[500px] flex-col justify-end overflow-hidden rounded-2xl bg-[#141414]">
      <img
        src={image}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

      <div className="relative z-10 p-8 sm:p-10">
        <span className="mb-3 inline-block rounded-full border border-[#2DD4BF]/30 bg-[#2DD4BF]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#2DD4BF]">
          {badge}
        </span>
        <h3 className="mt-1 font-semibold text-2xl text-white leading-snug">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-white/60 max-w-sm">{description}</p>
        <a
          href={href}
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white no-underline opacity-70 transition-opacity hover:opacity-100"
        >
          {action}
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}

// ── PAGE ─────────────────────────────────────────────────────────────────────

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
  const primaryText = settings.primary_cta_text || (hasClasses ? "Agendar aula grátis" : "Reservar quadra");
  const whatsappLink = getWhatsAppLink(
    settings.whatsapp_number,
    hasClasses
      ? "Olá! Quero agendar uma aula experimental de futevôlei."
      : "Olá! Quero reservar uma quadra."
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-white/50 text-sm">
        Carregando…
      </div>
    );
  }

  // ── Textos por modo ──
  const heroHeadline =
    hasClasses && hasRentals
      ? { line1: "Treino e jogo", line2: "na mesma arena." }
      : hasClasses
        ? { line1: "Evolua no futevôlei", line2: "com método." }
        : { line1: "Quadra premium,", line2: "agenda sem atrito." };

  const heroSub =
    hasClasses && hasRentals
      ? "Turmas por nível, reserva de quadra em poucos toques e uma experiência feita para quem leva a areia a sério."
      : hasClasses
        ? "Aulas por nível com professores atentos. Do iniciante ao competitivo, existe um caminho claro para a sua evolução."
        : "Escolha quadra, data e horário de forma direta. Estrutura premium e menos fricção para você jogar mais.";

  const aboutHeadline =
    hasClasses && hasRentals
      ? { top: "Uma arena que respeita", accent: "quem treina de verdade." }
      : hasClasses
        ? { top: "Método que gera", accent: "evolução visível." }
        : { top: "Estrutura pensada", accent: "para quem joga sério." };

  const aboutText =
    hasClasses && hasRentals
      ? "Nascemos para quem quer treinar com método e jogar com estrutura. Cada detalhe foi pensado para respeitar a rotina do atleta."
      : hasClasses
        ? "Aqui a aula não parece improviso. Turmas por nível, progressão clara e um professor que acompanha de perto cada aluno."
        : "Areia tratada, iluminação LED e reserva online sem burocracia. Estrutura completa para você focar no que importa: o jogo.";

  const aboutQuote =
    "Cada detalhe da experiência foi pensado para gerar confiança antes mesmo do primeiro treino.";

  const statusTitle =
    hasClasses && hasRentals ? "Aulas e reservas abertas" : hasClasses ? "Turmas abertas" : "Reservas abertas";

  const secondaryAction =
    hasClasses && hasRentals
      ? { label: "Ver horários", href: "#turmas" }
      : hasClasses
        ? { label: "Ver turmas", href: "#turmas" }
        : { label: "Falar no WhatsApp", href: whatsappLink !== "#" ? whatsappLink : "#contato" };

  const navLinks = [
    { label: "Serviços", href: "#servicos" },
    { label: "Sobre", href: "#sobre" },
    ...(hasClasses ? [{ label: "Turmas", href: "#turmas" }] : []),
    ...(hasRentals ? [{ label: "Quadras", href: "#reservar-quadra" }] : []),
    { label: "Contato", href: "#contato" },
  ];

  const cards = [
    ...(hasClasses
      ? [
          {
            image: getImage("about", landingImages.servicesClasses),
            badge: "Aulas",
            title: "Futevôlei para todos os níveis",
            description:
              "Metodologia exclusiva, turmas organizadas por nível e professores que acompanham sua evolução do início ao fim.",
            href: "#turmas",
            action: "Ver turmas disponíveis",
          },
        ]
      : []),
    ...(hasRentals
      ? [
          {
            image: getImage("gallery", landingImages.servicesRentals),
            badge: "Reservas",
            title: "Quadras com estrutura completa",
            description:
              "Areia tratada, iluminação LED premium e vestiário completo. Reserve em minutos e venha jogar.",
            href: "#reservar-quadra",
            action: "Reservar uma quadra",
          },
        ]
      : []),
  ];

  if (cards.length === 1) {
    cards.push({
      image: landingImages.galleryLifestyle,
      badge: "Comunidade",
      title: "Um ambiente que motiva",
      description:
        "Mais que areia e rede: uma comunidade ativa de atletas, ambiente acolhedor e uma marca que respeita quem joga.",
      href: whatsappLink !== "#" ? whatsappLink : ctaHref,
      action: "Falar no WhatsApp",
    });
  }

  const stats = [
    { value: "500+", label: "Alunos ativos" },
    { value: "4.9★", label: "Avaliação média" },
    { value: hasRentals ? "8" : "5", label: "Quadras disponíveis" },
    { value: "6 anos", label: "De experiência" },
  ];

  const gallery = [
    { image: getImage("gallery", landingImages.galleryLead), alt: "Treino noturno", label: "Treino noturno", cls: "md:col-span-2 md:row-span-2" },
    { image: landingImages.galleryNight, alt: "Arena iluminada", label: "Arena iluminada", cls: "" },
    { image: landingImages.galleryCrowd, alt: "Clima de jogo", label: "Clima de jogo", cls: "" },
    { image: landingImages.galleryMotion, alt: "Em movimento", label: "Em movimento", cls: "md:row-span-2" },
  ];

  const testimonials = [
    { quote: "A estrutura é incrível. Areia de qualidade, iluminação perfeita à noite e professores que realmente acompanham sua evolução.", name: "Mateus S.", role: "Aluno avançado" },
    { quote: "Comecei sem saber jogar e em dois meses já estava na turma intermediária. O método faz toda a diferença.", name: "Ana Lima", role: "Aluna recorrente" },
    { quote: "Reservei a quadra em menos de dois minutos. Facilidade total e qualidade na estrutura — virei cliente fixo.", name: "Carlos M.", role: "Jogador regular" },
  ];

  const socialLinks = [
    settings.whatsapp_number ? { href: whatsappLink, label: "WhatsApp", icon: MessageCircle } : null,
    settings.instagram_url ? { href: settings.instagram_url, label: "Instagram", icon: Share2 } : null,
    settings.youtube_url ? { href: settings.youtube_url, label: "YouTube", icon: Play } : null,
  ].filter(Boolean) as { href: string; label: string; icon: typeof MessageCircle }[];

  return (
    <div className="relative overflow-x-hidden bg-[#0A0A0A]" style={{ fontFamily: "'Inter', 'DM Sans', sans-serif", color: "#F0F0F0" }}>

      {/* ── NAV ───────────────────────────────────────────────── */}
      <nav className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "bg-[#0A0A0A]/90 backdrop-blur-xl shadow-sm shadow-black/50" : "bg-transparent"
      )}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <a href="#hero" className="text-lg font-bold text-white no-underline tracking-tight">
            FutVôlei Arena
          </a>

          <div className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-white/55 no-underline transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          <PrimaryButton href={ctaHref} className="hidden md:inline-flex text-xs px-5 py-2.5">
            {hasClasses ? "Aula grátis" : "Reservar"}
          </PrimaryButton>

          <button
            type="button"
            className="rounded-lg border border-white/10 bg-white/5 p-2 text-white md:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="mx-4 mb-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-[#111]/95 p-5 backdrop-blur-xl md:hidden">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-1 text-sm font-medium text-white/70 no-underline"
              >
                {link.label}
              </a>
            ))}
            <PrimaryButton href={ctaHref} className="mt-2 justify-center">
              {primaryText}
            </PrimaryButton>
          </div>
        )}
      </nav>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section id="hero" className="relative flex min-h-[100svh] items-end overflow-hidden pb-16 pt-28 sm:items-center sm:pb-0">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Arena de futevôlei"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/75 to-[#0A0A0A]/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/60 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-6">
          <div className="max-w-xl">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#2DD4BF]/25 bg-[#2DD4BF]/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#2DD4BF]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2DD4BF]" />
              {statusTitle}
            </span>

            <h1 className="text-[clamp(2.8rem,7vw,5rem)] font-bold leading-[1.05] tracking-tight text-white">
              {heroHeadline.line1}
              <br />
              <span className="text-[#F97316]">{heroHeadline.line2}</span>
            </h1>

            <p className="mt-5 max-w-md text-base leading-relaxed text-white/65">
              {heroSub}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <PrimaryButton href={ctaHref}>
                {primaryText}
                <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
              <GhostButton href={secondaryAction.href}>
                {secondaryAction.label}
              </GhostButton>
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-xs text-white/45">
                <Clock3 className="h-3.5 w-3.5 text-[#2DD4BF]" />
                {formatHours(businessHours)}
              </div>
              <div className="flex items-center gap-2 text-xs text-white/45">
                <MapPin className="h-3.5 w-3.5 text-[#2DD4BF]" />
                {formatOpenDays(businessHours?.open_days)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────── */}
      <div className="border-y border-white/[0.06] bg-[#0F0F0F]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-white/[0.06] md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center py-8 px-4 text-center">
              <span className="text-2xl font-bold text-white">{s.value}</span>
              <span className="mt-1 text-xs font-medium uppercase tracking-widest text-white/40">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SERVIÇOS ──────────────────────────────────────────── */}
      <section id="servicos" className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#F97316]">Nossos serviços</p>
          <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">O que oferecemos</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {cards.map((card) => (
            <ServiceCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      {/* ── SOBRE ─────────────────────────────────────────────── */}
      <section id="sobre" className="bg-[#0F0F0F] py-20 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
          {/* texto */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#F97316]">Sobre a arena</p>
            <h2 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-4xl">
              {aboutHeadline.top}
              <br />
              <span className="text-[#2DD4BF]">{aboutHeadline.accent}</span>
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-white/60 max-w-lg">{aboutText}</p>
            <blockquote className="mt-6 border-l-2 border-[#F97316] pl-5 text-sm italic text-white/50">
              "{aboutQuote}"
            </blockquote>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Metodologia desenvolvida por profissionais",
                "Areia tratada e iluminação LED premium",
                "Reservas online rápidas e sem burocracia",
                "Ambiente para atletas de todos os níveis",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2DD4BF]" />
                  <span className="text-sm text-white/60">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <PrimaryButton href={ctaHref}>
                {primaryText}
                <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
            </div>
          </div>

          {/* imagem */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl">
              <img
                src={aboutImage}
                alt="Atleta na arena"
                className="h-full w-full object-cover"
                style={{ maxHeight: "520px" }}
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 flex items-center gap-3 rounded-xl border border-white/10 bg-[#141414]/90 px-5 py-4 backdrop-blur-lg">
              <span className="flex h-2.5 w-2.5 rounded-full bg-[#2DD4BF]" style={{ boxShadow: "0 0 10px #2DD4BF" }} />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/40">Status</p>
                <p className="text-sm font-semibold text-white">{statusTitle}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── GALERIA ───────────────────────────────────────────── */}
      <section id="galeria" className="py-20 sm:py-28 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#F97316]">Galeria</p>
            <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">A arena em ação</h2>
          </div>
          <div className="grid h-auto gap-3 md:h-[680px] md:grid-cols-4 md:grid-rows-2">
            {gallery.map((tile) => (
              <article
                key={tile.label}
                className={cn("group relative min-h-[220px] overflow-hidden rounded-xl bg-[#141414]", tile.cls)}
              >
                <img
                  src={tile.image}
                  alt={tile.alt}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <p className="absolute bottom-4 left-4 text-xs font-semibold uppercase tracking-wider text-white/70">
                  {tile.label}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ───────────────────────────────────────── */}
      <section className="bg-[#0F0F0F] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-[#F97316]">Depoimentos</p>
            <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">O que dizem nossos alunos</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {testimonials.map((t) => (
              <article
                key={t.name}
                className="flex flex-col rounded-2xl border border-white/[0.07] bg-[#141414] p-7"
              >
                <div className="flex gap-0.5 text-[#F97316]">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="mt-5 flex-1 text-sm leading-relaxed text-white/60">"{t.quote}"</p>
                <div className="mt-6 flex items-center gap-3 border-t border-white/[0.06] pt-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F97316]/15 text-xs font-bold text-[#F97316]">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-[11px] text-white/35">{t.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEÇÕES DINÂMICAS ──────────────────────────────────── */}
      {hasClasses && <ClassesSection onSelectClass={setPreselectedClassId} />}
      {hasClasses && <TrialFormSection settings={settings} preselectedClassId={preselectedClassId} />}
      {hasRentals && <CourtBookingSection />}

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer id="contato" className="border-t border-white/[0.06] bg-[#080808]">
        {/* CTA */}
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="rounded-2xl bg-gradient-to-br from-[#F97316]/15 via-transparent to-[#2DD4BF]/10 border border-white/[0.06] p-10 sm:p-14 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#F97316]/10 px-3 py-1 text-xs font-semibold text-[#F97316]">
                <Zap className="h-3 w-3" />
                Primeira aula gratuita
              </div>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Pronto para jogar?</h2>
              <p className="mt-2 text-sm text-white/50">Comece agora. Sem compromisso.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <PrimaryButton href={ctaHref} className="justify-center text-sm">
                {primaryText}
                <ArrowRight className="h-4 w-4" />
              </PrimaryButton>
              {whatsappLink !== "#" && (
                <GhostButton href={whatsappLink} className="justify-center text-sm">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </GhostButton>
              )}
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="mx-auto grid max-w-6xl gap-10 px-6 pb-16 sm:grid-cols-3">
          <div>
            <p className="font-bold text-white">FutVôlei Arena</p>
            <p className="mt-3 text-sm leading-relaxed text-white/40 max-w-xs">
              A arena ideal para quem leva o futevôlei a sério. Aulas com método, quadras premium e uma comunidade que cresce junto.
            </p>
            {socialLinks.length > 0 && (
              <div className="mt-5 flex gap-3">
                {socialLinks.map(({ href, label, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/40 transition hover:border-[#2DD4BF]/30 hover:text-[#2DD4BF]"
                    aria-label={label}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">Navegação</p>
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-white/45 no-underline transition hover:text-white"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">Contato</p>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-white/45">
                <Clock3 className="h-4 w-4 text-[#2DD4BF]" />
                {formatHours(businessHours)}
              </div>
              <div className="flex items-center gap-2 text-sm text-white/45">
                <Users className="h-4 w-4 text-[#2DD4BF]" />
                {formatOpenDays(businessHours?.open_days)}
              </div>
              {settings.whatsapp_number && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[#2DD4BF] no-underline transition hover:text-white"
                >
                  <MessageCircle className="h-4 w-4" />
                  Falar no WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.05] px-6 py-6 text-center">
          <p className="text-xs text-white/20">
            © {new Date().getFullYear()} FutVôlei Arena. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
