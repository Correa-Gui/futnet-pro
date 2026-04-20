import { useEffect, useState } from "react";
import {
  ArrowRight,
  Beer,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock3,
  MapPin,
  Menu,
  MessageCircle,
  Play,
  Share2,
  ShowerHead,
  Sun,
  Users,
  Waves,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CourtBookingSection } from "@/components/landing/CourtBookingSection";
import { TrialFormSection } from "@/components/landing/TrialFormSection";
import { DayUseBookingSection } from "@/components/landing/DayUseBookingSection";
import { useLandingData } from "@/components/landing/useLandingData";
import {
  getWhatsAppLink,
  landingImages,
  supportsClasses,
  supportsRentals,
} from "@/components/landing/brand";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function formatHours(hours: { open_hour: number; close_hour: number } | null) {
  if (!hours) return "Sob consulta";
  return `${String(hours.open_hour).padStart(2, "0")}h–${String(hours.close_hour).padStart(2, "0")}h`;
}
function formatOpenDays(days: number[] | undefined) {
  if (!days?.length) return "Agenda sob consulta";
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_LABELS[d] || "")
    .filter(Boolean)
    .join(" · ");
}

// ─── PRIMITIVES ──────────────────────────────────────────────────────────────

function NavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="text-sm font-medium text-[#6B5740] no-underline transition-colors hover:text-[#1A1208]"
    >
      {children}
    </a>
  );
}

function CTAPrimary({
  href,
  children,
  className,
  onClick,
}: {
  href?: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl bg-[#F97316] px-6 py-3.5 text-sm font-bold text-white no-underline transition-all hover:bg-[#EA6C0A] hover:shadow-[0_8px_24px_rgba(249,115,22,0.3)] active:scale-95",
    className
  );
  if (onClick) return <button onClick={onClick} className={cls}>{children}</button>;
  const ext = href?.startsWith("http");
  return (
    <a href={href} target={ext ? "_blank" : undefined} rel={ext ? "noopener noreferrer" : undefined} className={cls}>
      {children}
    </a>
  );
}

function CTAGhost({
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
        "inline-flex items-center justify-center gap-2 rounded-xl border border-[#DDD0B8] px-6 py-3.5 text-sm font-medium text-[#6B5740] no-underline transition-all hover:border-[#C2A880] hover:text-[#1A1208]",
        className
      )}
    >
      {children}
    </a>
  );
}

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#0EA5E9]/25 bg-[#0EA5E9]/8 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0369A1]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#0EA5E9]" />
      {children}
    </span>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { settings, loaded, getImage, businessHours, dayUsePrice, courtsCount, galleryImages } = useLandingData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const hasClasses = supportsClasses(settings.business_mode);
  const hasRentals = supportsRentals(settings.business_mode);
  const heroImage = settings.hero_image_url || getImage("hero", landingImages.hero);
  const whatsappLink = getWhatsAppLink(settings.whatsapp_number, "Olá! Quero mais informações sobre a Arena Hub.");
  const trialLink = "#aula-teste";
  const courtLink = "#reservar-quadra";
  const dayUseLink = "#day-use";

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF7] text-[#9B8770] text-sm">
        Carregando…
      </div>
    );
  }

  const navLinks = [
    { label: "Serviços", href: "#servicos" },
    { label: "O Espaço", href: "#espaco" },
    { label: "Como funciona", href: "#como-funciona" },
    ...(hasClasses ? [{ label: "Aula Experimental", href: trialLink }] : []),
    ...(hasRentals ? [{ label: "Reservar Quadra", href: courtLink }] : []),
    { label: "Contato", href: "#contato" },
  ];

  // Dynamic courts count stat — only show if we have courts
  const stats = courtsCount > 0 ? [{ value: String(courtsCount), label: "Quadras" }] : [];

  // Day use price display
  const dayUsePriceDisplay = dayUsePrice
    ? `A partir de R$ ${parseFloat(dayUsePrice.replace(/[^\d.,]/g, "").replace(",", ".")).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`
    : "A partir de R$ 120";

  const services = [
    {
      id: "aluguel",
      tag: "Aluguel de quadra",
      icon: Waves,
      headline: "Reserve sua quadra e jogue quando quiser.",
      description:
        "Areia premium, iluminação LED e bolas disponíveis. Bloqueie o horário online em minutos e apareça pra jogar.",
      perks: [
        "Quadra exclusiva por 1 hora",
        "Areia tratada e nivelada",
        "Iluminação LED até as 22h",
        "Bolas disponíveis no local",
      ],
      price: "A partir de R$ 80",
      unit: "/hora",
      cta: "Reservar agora",
      href: courtLink,
      image: getImage("gallery", landingImages.servicesRentals),
      accent: "#F97316",
    },
    {
      id: "dayuse",
      tag: "Day Use",
      icon: Sun,
      headline: "Passe o dia inteiro na arena. Jogue, descanse, repita.",
      description:
        "Acesso ilimitado às quadras por um dia inteiro. Bar, vestiário premium e área de convivência incluídos. Ideal para grupos e confraternizações.",
      perks: [
        "Acesso ilimitado às quadras",
        "Bar e área de lazer incluídos",
        "Vestiário com chuveiro",
        "Estacionamento gratuito",
      ],
      price: dayUsePriceDisplay,
      unit: "/pessoa",
      cta: "Reservar Day Use",
      href: dayUseLink,
      image: landingImages.galleryLifestyle,
      accent: "#0EA5E9",
    },
    ...(hasClasses
      ? [
          {
            id: "trial",
            tag: "Aula experimental",
            icon: Zap,
            headline: "Sua primeira aula é grátis. Venha sentir a areia.",
            description:
              "Uma hora com professor, avaliação de nível e acesso completo à arena. Sem compromisso — só você, a bola e a areia.",
            perks: [
              "1h com professor certificado",
              "Avaliação de nível incluída",
              "Material e bolas fornecidos",
              "100% gratuito, sem compromisso",
            ],
            price: "Grátis",
            unit: "",
            cta: "Agendar aula grátis",
            href: trialLink,
            image: getImage("about", landingImages.servicesClasses),
            accent: "#0D9488",
          },
        ]
      : []),
  ];

  // Gallery images: use system_config gallery_images if available, else fallback
  const defaultGallerySpots = [
    { url: getImage("gallery", landingImages.galleryLead), label: "Quadras premium" },
    { url: "https://images.unsplash.com/photo-1470338745628-171cf53de3a8?auto=format&fit=crop&w=900&q=80", label: "Bar e petiscos" },
    { url: landingImages.galleryNight, label: "Arena iluminada" },
    { url: landingImages.galleryCrowd, label: "Área social" },
  ];
  const venueSpots = galleryImages.length > 0 ? galleryImages : defaultGallerySpots;

  const amenities = [
    { icon: Beer, label: "Bar completo" },
    { icon: ShowerHead, label: "Vestiário premium" },
    { icon: Zap, label: "Iluminação LED" },
    { icon: Waves, label: "Areia tratada" },
    { icon: MapPin, label: "Estacionamento" },
    { icon: Users, label: "Área de convivência" },
  ];

  const steps = [
    {
      service: "Aluguel de quadra",
      accent: "#F97316",
      href: courtLink,
      cta: "Ir para reserva",
      flow: [
        { n: "01", title: "Escolha a quadra", desc: "Veja as quadras disponíveis e selecione a que prefere." },
        { n: "02", title: "Defina data e horário", desc: "Calendário com disponibilidade em tempo real." },
        { n: "03", title: "Confirme seus dados", desc: "Nome e WhatsApp. Confirmação automática e imediata." },
      ],
    },
    {
      service: "Day Use",
      accent: "#0EA5E9",
      href: dayUseLink,
      cta: "Reservar Day Use",
      flow: [
        { n: "01", title: "Escolha a data", desc: "Selecione o dia em que quer vir." },
        { n: "02", title: "Quantidade de pessoas", desc: "Informe quantas pessoas virão aproveitar." },
        { n: "03", title: "Confirme e apareça", desc: "Preencha nome e WhatsApp. Reserva confirmada na hora." },
      ],
    },
    ...(hasClasses
      ? [
          {
            service: "Aula experimental",
            accent: "#0D9488",
            href: trialLink,
            cta: "Agendar aula",
            flow: [
              { n: "01", title: "Preencha o formulário", desc: "Nome, contato e seu nível: Aprendiz, Iniciante ou Principiante." },
              { n: "02", title: "Receba a confirmação", desc: "Nossa equipe entra em contato para confirmar o horário." },
              { n: "03", title: "Apareça e jogue", desc: "Chegue 10 min antes. Professor e material aguardam você." },
            ],
          },
        ]
      : []),
  ];

  const socialLinks = [
    settings.whatsapp_number ? { href: whatsappLink, label: "WhatsApp", icon: MessageCircle } : null,
    settings.instagram_url ? { href: settings.instagram_url, label: "Instagram", icon: Share2 } : null,
    settings.youtube_url ? { href: settings.youtube_url, label: "YouTube", icon: Play } : null,
  ].filter(Boolean) as { href: string; label: string; icon: typeof MessageCircle }[];

  return (
    <div className="relative overflow-x-hidden bg-[#FAFAF7] font-landing-body text-[#1A1208]">

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "bg-white/95 backdrop-blur-xl border-b border-[#E8DECE]" : "bg-transparent"
      )}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
          <a href="#hero" className="text-lg font-extrabold uppercase tracking-tight text-[#1A1208] no-underline">
            Arena <span className="text-[#F97316]">Hub</span>
          </a>

          <div className="hidden items-center gap-7 lg:flex">
            {navLinks.map((l) => <NavLink key={l.label} href={l.href}>{l.label}</NavLink>)}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            {whatsappLink !== "#" && (
              <CTAGhost href={whatsappLink} className="text-xs px-4 py-2.5">
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </CTAGhost>
            )}
            {hasClasses && (
              <CTAPrimary href={trialLink} className="text-xs px-4 py-2.5">
                Aula grátis
              </CTAPrimary>
            )}
            {hasRentals && !hasClasses && (
              <CTAPrimary href={courtLink} className="text-xs px-4 py-2.5">
                Reservar
              </CTAPrimary>
            )}
          </div>

          <button
            type="button"
            className="rounded-lg border border-[#DDD0B8] bg-[#FAF7F2] p-2 text-[#6B5740] lg:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="mx-4 mb-4 rounded-2xl border border-[#E8DECE] bg-white p-5 shadow-[0_8px_32px_rgba(90,60,20,0.10)] lg:hidden">
            <div className="flex flex-col gap-4">
              {navLinks.map((l) => (
                <NavLink key={l.label} href={l.href} onClick={() => setMenuOpen(false)}>
                  {l.label}
                </NavLink>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-[#E8DECE] pt-4">
                {hasClasses && <CTAPrimary href={trialLink} className="justify-center">Aula grátis</CTAPrimary>}
                {hasRentals && <CTAGhost href={courtLink} className="justify-center">Reservar quadra</CTAGhost>}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section id="hero" className="relative min-h-[100svh] overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <img src={heroImage} alt="Arena de futevôlei" className="h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAFAF7] via-[#FAFAF7]/88 to-[#FAFAF7]/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#FAFAF7] via-transparent to-transparent" />
        </div>

        <div className="relative z-10 mx-auto grid min-h-[100svh] max-w-7xl grid-cols-1 items-center gap-10 px-6 pt-24 pb-16 lg:grid-cols-[1fr_360px] lg:gap-16 lg:pt-0">
          {/* LEFT — headline */}
          <div>
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-[#22C55E]" style={{ boxShadow: "0 0 8px #22C55E" }} />
              <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6B5740]">
                {formatOpenDays(businessHours?.open_days)} · {formatHours(businessHours)}
              </span>
            </div>

            <h1 className="font-landing-headline text-[clamp(3rem,8vw,5.5rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.03em] text-[#1A1208]">
              A arena<br />
              <span className="text-[#F97316]">do futevôlei</span><br />
              de verdade.
            </h1>

            <p className="mt-6 max-w-lg text-base leading-relaxed text-[#6B5740]">
              Quadras premium, bar, vestiário completo e uma comunidade de atletas. Reserve sua quadra, venha no day use ou experimente uma aula grátis.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {hasRentals && (
                <CTAPrimary href={courtLink}>
                  Reservar quadra
                  <ArrowRight className="h-4 w-4" />
                </CTAPrimary>
              )}
              {hasClasses && (
                <CTAGhost href={trialLink}>
                  Aula experimental grátis
                </CTAGhost>
              )}
            </div>

            {stats.length > 0 && (
              <div className="mt-12 grid grid-cols-1 gap-6 border-t border-[#E8DECE] pt-8 max-w-xs">
                {stats.map((s) => (
                  <div key={s.label}>
                    <p className="text-2xl font-extrabold text-[#1A1208]">{s.value}</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wider text-[#9B8770]">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — service pods */}
          <div className="flex flex-col gap-3">
            {services.map((sv) => (
              <a
                key={sv.id}
                href={sv.href}
                className="group relative flex items-center gap-5 overflow-hidden rounded-2xl border border-[#E8DECE] bg-white p-5 no-underline shadow-[0_2px_12px_rgba(90,60,20,0.06)] transition-all hover:border-[#DDD0B8] hover:shadow-[0_6px_24px_rgba(90,60,20,0.10)]"
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${sv.accent}12`, border: `1px solid ${sv.accent}28` }}
                >
                  <sv.icon className="h-5 w-5" style={{ color: sv.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: sv.accent }}>
                    {sv.tag}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-[#1A1208]">{sv.price}<span className="text-xs font-normal text-[#9B8770]">{sv.unit}</span></p>
                  <p className="mt-0.5 text-xs text-[#9B8770] line-clamp-1">{sv.cta}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#C5B8A0] transition group-hover:text-[#F97316] group-hover:translate-x-0.5" />
              </a>
            ))}

            <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#E8DECE] bg-[#FAF7F2] px-4 py-3 text-xs text-[#6B5740]">
              <MapPin className="h-3.5 w-3.5 text-[#0EA5E9]" />
              {formatOpenDays(businessHours?.open_days)} · {formatHours(businessHours)}
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <a
          href="#servicos"
          className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-[#B8A888] transition hover:text-[#6B5740] no-underline"
        >
          <span className="text-[10px] uppercase tracking-widest">Ver mais</span>
          <ChevronDown className="h-4 w-4 animate-bounce" />
        </a>
      </section>

      {/* ── SERVIÇOS ─────────────────────────────────────────────── */}
      <section id="servicos" className="bg-[#FAFAF7] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14">
            <SectionTag>O que oferecemos</SectionTag>
            <h2 className="font-landing-headline mt-2 text-3xl font-extrabold uppercase tracking-tight text-[#1A1208] sm:text-4xl">
              Escolha como jogar
            </h2>
          </div>

          <div className="flex flex-col gap-8">
            {services.map((sv, i) => (
              <article
                key={sv.id}
                className={cn(
                  "group grid overflow-hidden rounded-3xl border border-[#E8DECE] bg-white shadow-[0_2px_16px_rgba(90,60,20,0.06)] lg:grid-cols-2",
                  i % 2 === 1 && "lg:[&>div:first-child]:order-2 lg:[&>div:last-child]:order-1"
                )}
              >
                {/* Image */}
                <div className="relative min-h-[280px] overflow-hidden">
                  <img
                    src={sv.image}
                    alt={sv.tag}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <span
                    className="absolute left-5 top-5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest backdrop-blur-sm"
                    style={{ borderColor: `${sv.accent}50`, background: `${sv.accent}18`, color: sv.accent === "#0EA5E9" ? "#0369A1" : sv.accent === "#0D9488" ? "#0F766E" : sv.accent }}
                  >
                    {sv.tag}
                  </span>
                </div>

                {/* Content */}
                <div className="flex flex-col justify-between p-8 sm:p-10">
                  <div>
                    <h3 className="font-landing-headline text-xl font-extrabold uppercase leading-tight tracking-tight text-[#1A1208] sm:text-2xl">
                      {sv.headline}
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-[#6B5740]">{sv.description}</p>

                    <ul className="mt-6 flex flex-col gap-2.5">
                      {sv.perks.map((p) => (
                        <li key={p} className="flex items-center gap-3 text-sm text-[#6B5740]">
                          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: sv.accent }} />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9B8770]">Valor</p>
                      <p className="mt-1 text-2xl font-extrabold text-[#1A1208]">
                        {sv.price}
                        <span className="ml-1 text-sm font-normal text-[#9B8770]">{sv.unit}</span>
                      </p>
                    </div>
                    <CTAPrimary
                      href={sv.href}
                      className="shrink-0"
                      style={{ backgroundColor: sv.accent !== "#F97316" ? sv.accent : undefined } as React.CSSProperties}
                    >
                      {sv.cta}
                      <ArrowRight className="h-4 w-4" />
                    </CTAPrimary>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── O ESPAÇO ─────────────────────────────────────────────── */}
      <section id="espaco" className="bg-[#F3EDE3] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 grid gap-6 lg:grid-cols-2 lg:items-end">
            <div>
              <SectionTag>O espaço</SectionTag>
              <h2 className="font-landing-headline mt-2 text-3xl font-extrabold uppercase tracking-tight text-[#1A1208] sm:text-4xl">
                Mais que uma quadra.<br />
                <span className="text-[#0EA5E9]">Um lugar para ficar.</span>
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-[#6B5740] lg:max-w-md">
              Arena completa com bar, vestiário premium, iluminação LED e área de convivência. Você sabe exatamente onde está pisando antes de chegar.
            </p>
          </div>

          {/* Photo grid */}
          <div className="grid gap-3 md:grid-cols-4 md:grid-rows-2 md:h-[600px]">
            {venueSpots.map((spot, i) => {
              const cls = i === 0
                ? "md:col-span-2 md:row-span-2"
                : i === venueSpots.length - 1 && venueSpots.length === 4
                  ? "md:col-span-2"
                  : "";
              return (
                <article
                  key={spot.label}
                  className={cn(
                    "group relative min-h-[200px] overflow-hidden rounded-2xl bg-[#E8DECE]",
                    cls
                  )}
                >
                  <img
                    src={spot.url}
                    alt={spot.label}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <span className="absolute bottom-4 left-4 rounded-full border border-white/30 bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                    {spot.label}
                  </span>
                </article>
              );
            })}
          </div>

          {/* Amenities */}
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {amenities.map((a) => (
              <div
                key={a.label}
                className="flex flex-col items-center gap-3 rounded-2xl border border-[#E8DECE] bg-white px-4 py-5 text-center shadow-[0_1px_6px_rgba(90,60,20,0.05)]"
              >
                <a.icon className="h-5 w-5 text-[#0EA5E9]" />
                <span className="text-xs font-semibold text-[#6B5740]">{a.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMO FUNCIONA ────────────────────────────────────────── */}
      <section id="como-funciona" className="bg-[#FAFAF7] py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14">
            <SectionTag>Simples e rápido</SectionTag>
            <h2 className="font-landing-headline mt-2 text-3xl font-extrabold uppercase tracking-tight text-[#1A1208] sm:text-4xl">
              Como funciona
            </h2>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            {steps.map((s) => (
              <div key={s.service} className="rounded-3xl border border-[#E8DECE] bg-white p-8 shadow-[0_2px_12px_rgba(90,60,20,0.06)]">
                <p
                  className="text-xs font-bold uppercase tracking-[0.2em]"
                  style={{ color: s.accent }}
                >
                  {s.service}
                </p>

                <div className="mt-6 flex flex-col gap-6">
                  {s.flow.map((step, idx) => (
                    <div key={step.n} className="flex gap-4">
                      <div className="relative flex flex-col items-center">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                          style={{ background: `${s.accent}12`, border: `1px solid ${s.accent}30`, color: s.accent }}
                        >
                          {step.n}
                        </div>
                        {idx < s.flow.length - 1 && (
                          <div className="mt-2 h-full w-px bg-[#E8DECE]" />
                        )}
                      </div>
                      <div className="pb-6">
                        <p className="font-semibold text-[#1A1208]">{step.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-[#6B5740]">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <a
                  href={s.href}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold no-underline transition-all hover:opacity-80"
                  style={{
                    borderColor: `${s.accent}30`,
                    backgroundColor: `${s.accent}8`,
                    color: s.accent,
                  }}
                >
                  {s.cta}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DAY USE ──────────────────────────────────────────────── */}
      {hasRentals && <DayUseBookingSection dayUsePrice={dayUsePrice} />}

      {/* ── AULA EXPERIMENTAL ────────────────────────────────────── */}
      {hasClasses && <TrialFormSection settings={settings} />}

      {/* ── AGENDAMENTO DE QUADRAS ────────────────────────────────── */}
      {hasRentals && (
        <>
          <div className="relative overflow-hidden border-y border-[#E8DECE] bg-[#F3EDE3]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#F97316]/6 via-transparent to-[#0EA5E9]/4" />
            <div className="relative mx-auto max-w-7xl px-6 py-16 sm:py-20">
              <div className="flex flex-wrap items-end justify-between gap-8">
                <div>
                  <SectionTag>Serviço independente</SectionTag>
                  <h2 className="font-landing-headline mt-2 text-3xl font-extrabold uppercase tracking-tight text-[#1A1208] sm:text-5xl">
                    Agendamento<br className="hidden sm:block" />
                    {" "}<span className="text-[#F97316]">de quadras.</span>
                  </h2>
                  <p className="mt-4 max-w-lg text-sm leading-relaxed text-[#6B5740]">
                    Areia premium, iluminação LED e disponibilidade em tempo real. Reserve seu horário em minutos — confirmação automática e imediata.
                  </p>
                </div>
                <CTAPrimary href={courtLink} className="shrink-0">
                  Ver horários disponíveis
                  <ArrowRight className="h-4 w-4" />
                </CTAPrimary>
              </div>
            </div>
          </div>
          <CourtBookingSection />
        </>
      )}

      {/* ── FOOTER CTA ───────────────────────────────────────────── */}
      <div className="bg-[#FAFAF7] px-6 py-20">
        <div className="mx-auto max-w-4xl rounded-3xl border border-[#E8DECE] bg-white p-10 text-center shadow-[0_4px_32px_rgba(90,60,20,0.08)] sm:p-14">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#F97316]/10 px-3 py-1 text-xs font-semibold text-[#C2550A]">
            <Zap className="h-3 w-3" />
            Primeira aula gratuita
          </span>
          <h2 className="font-landing-headline mt-5 text-3xl font-extrabold uppercase tracking-tight text-[#1A1208] sm:text-4xl">
            Pronto para entrar<br />na quadra?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-[#6B5740]">
            Reserve agora, venha no day use ou agende sua aula grátis. Sem enrolação.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {hasRentals && (
              <CTAPrimary href={courtLink} className="text-sm">
                Reservar quadra
                <ArrowRight className="h-4 w-4" />
              </CTAPrimary>
            )}
            <CTAGhost href={dayUseLink} className="text-sm">
              Reservar Day Use
            </CTAGhost>
            {hasClasses && (
              <CTAGhost href={trialLink} className="text-sm">
                Aula grátis
              </CTAGhost>
            )}
          </div>
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer id="contato" className="border-t border-[#E8DECE] bg-[#F0EAE0]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 sm:grid-cols-3">
          <div>
            <p className="text-lg font-extrabold uppercase tracking-tight text-[#1A1208]">
              Arena <span className="text-[#F97316]">Hub</span>
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#9B8770]">
              Quadras premium, bar completo e aulas com método. A arena feita para quem leva o futevôlei a sério.
            </p>
            {socialLinks.length > 0 && (
              <div className="mt-5 flex gap-2">
                {socialLinks.map(({ href, label, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DDD0B8] bg-white text-[#9B8770] transition hover:text-[#F97316]"
                    aria-label={label}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#B8A888]">Serviços</p>
            <div className="flex flex-col gap-3">
              {hasRentals && (
                <a href={courtLink} className="text-sm text-[#6B5740] no-underline hover:text-[#1A1208]">Aluguel de quadra</a>
              )}
              <a href={dayUseLink} className="text-sm text-[#6B5740] no-underline hover:text-[#1A1208]">Day Use</a>
              {hasClasses && (
                <a href={trialLink} className="text-sm text-[#6B5740] no-underline hover:text-[#1A1208]">Aula experimental</a>
              )}
              <a href="#espaco" className="text-sm text-[#6B5740] no-underline hover:text-[#1A1208]">O espaço</a>
            </div>
          </div>

          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-[#B8A888]">Contato</p>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm text-[#6B5740]">
                <Clock3 className="h-4 w-4 text-[#0EA5E9]" />
                {formatHours(businessHours)}
              </div>
              <div className="flex items-center gap-2 text-sm text-[#6B5740]">
                <Calendar className="h-4 w-4 text-[#0EA5E9]" />
                {formatOpenDays(businessHours?.open_days)}
              </div>
              {settings.whatsapp_number && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[#0369A1] no-underline hover:text-[#1A1208]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Falar no WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-[#E8DECE] px-6 py-5 text-center">
          <p className="text-xs text-[#B8A888]">
            © {new Date().getFullYear()} Arena Hub. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
