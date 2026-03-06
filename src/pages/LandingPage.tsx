import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import {
  Star, CheckCircle, Users, MapPin, Trophy, Heart, Target, ArrowRight,
  Phone, Sun, Dumbbell, ChevronDown, Instagram, Youtube, Menu, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const COLORS = {
  sand: "#F5E6C8", sandLight: "#FDF6EC", ocean: "#0C4A6E", oceanLight: "#0369A1",
  sunset: "#F97316", sunsetDark: "#EA580C", sunsetLight: "#FDBA74",
  white: "#FFFFFF", dark: "#0F172A", gray: "#64748B", grayLight: "#F1F5F9",
};

interface LandingSettings {
  business_mode: string;
  hero_image_url: string | null;
  whatsapp_number: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  primary_cta_text: string;
  primary_cta_url: string;
}

interface SectionConfig {
  section_key: string;
  is_visible: boolean;
  title: string | null;
  subtitle: string | null;
  content: any;
  image_url: string | null;
  display_order: number;
}

const DEFAULT_SETTINGS: LandingSettings = {
  business_mode: "both", hero_image_url: null, whatsapp_number: "5511999999999",
  instagram_url: null, youtube_url: null, primary_cta_text: "Agende Sua Aula Grátis", primary_cta_url: "/cadastro",
};

function useLandingData() {
  const [settings, setSettings] = useState<LandingSettings>(DEFAULT_SETTINGS);
  const [sections, setSections] = useState<Record<string, SectionConfig>>({});
  const [businessHours, setBusinessHours] = useState<{ open_days: number[]; open_hour: number; close_hour: number } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("landing_page_settings").select("*").limit(1).single(),
      supabase.from("landing_page_config").select("*").order("display_order"),
      supabase.from("system_config").select("value").eq("key", "business_hours").maybeSingle(),
    ]).then(([settingsRes, sectionsRes, hoursRes]) => {
      if (settingsRes.data) setSettings(settingsRes.data as unknown as LandingSettings);
      if (sectionsRes.data) {
        const map: Record<string, SectionConfig> = {};
        (sectionsRes.data as unknown as SectionConfig[]).forEach((s) => { map[s.section_key] = s; });
        setSections(map);
      }
      if (hoursRes.data?.value) {
        try { setBusinessHours(JSON.parse(hoursRes.data.value)); } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const isVisible = useCallback((key: string) => {
    return sections[key]?.is_visible !== false;
  }, [sections]);

  const getImage = useCallback((key: string, fallback: string) => {
    return sections[key]?.image_url || fallback;
  }, [sections]);

  return { settings, sections, loaded, isVisible, getImage, businessHours };
}

// --- Utility Components ---

function Section({ children, className = "", id, style = {} }: { children: React.ReactNode; className?: string; id?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section ref={ref} id={id} className={className} style={{ position: "relative", ...style }}>
      <div style={{ opacity: isInView ? 1 : 0, transform: isInView ? "translateY(0)" : "translateY(40px)", transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}>
        {children}
      </div>
    </motion.section>
  );
}

function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 2, color: light ? COLORS.sunsetLight : COLORS.sunset, marginBottom: 12, fontFamily: "'DM Sans', sans-serif" }}>
      {children}
    </span>
  );
}

function SectionTitle({ children, light = false, style = {} }: { children: React.ReactNode; light?: boolean; style?: React.CSSProperties }) {
  return (
    <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 800, lineHeight: 1.15, color: light ? COLORS.white : COLORS.dark, marginBottom: 20, ...style }}>
      {children}
    </h2>
  );
}

function CTAButton({ text = "Agende Sua Aula Grátis", large = false, dark = false, style = {}, href = "/cadastro" }: { text?: string; large?: boolean; dark?: boolean; style?: React.CSSProperties; href?: string }) {
  return (
    <a href={href} className="cta-pulse" style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: large ? "18px 36px" : "14px 28px", background: dark ? COLORS.dark : `linear-gradient(135deg, ${COLORS.sunset}, ${COLORS.sunsetDark})`, color: COLORS.white, borderRadius: 12, fontSize: large ? 18 : 16, fontWeight: 700, textDecoration: "none", border: "none", cursor: "pointer", transition: "all 0.3s", fontFamily: "'DM Sans', sans-serif", ...style }}>
      {text}
      <ArrowRight size={large ? 20 : 18} />
    </a>
  );
}

// --- Sections ---

function HeroSection({ settings, getImage }: { settings: LandingSettings; getImage: (k: string, f: string) => string }) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, 200]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroImg = settings.hero_image_url || getImage("hero", "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1920&q=80");
  const waLink = settings.whatsapp_number ? `https://wa.me/${settings.whatsapp_number}` : "#";

  return (
    <section id="hero" style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
      <motion.div style={{ position: "absolute", inset: 0, y }}>
        <img src={heroImg} alt="Hero" style={{ objectFit: "cover", width: "100%", height: "100%" }} />
      </motion.div>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(15,23,42,0.4) 0%, rgba(15,23,42,0.6) 50%, rgba(15,23,42,0.85) 100%)" }} />
      <motion.div style={{ position: "relative", zIndex: 10, maxWidth: 800, margin: "0 auto", padding: "120px 24px 80px", textAlign: "center", opacity }}>
        <span style={{ display: "inline-block", padding: "6px 16px", background: "rgba(249,115,22,0.2)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 100, color: COLORS.sunsetLight, fontSize: 14, fontWeight: 600, marginBottom: 24, letterSpacing: 1 }}>
          A arena de futevôlei nº1 da cidade
        </span>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(48px, 10vw, 88px)", lineHeight: 1, color: COLORS.white, marginBottom: 20, letterSpacing: 2 }}>
          SUA PRIMEIRA{" "}
          <span style={{ background: `linear-gradient(135deg, ${COLORS.sunset}, ${COLORS.sunsetLight})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AULA É GRÁTIS</span>
        </h1>
        <p style={{ fontSize: "clamp(16px, 2.5vw, 20px)", color: "rgba(255,255,255,0.8)", maxWidth: 560, margin: "0 auto 36px", lineHeight: 1.6 }}>
          {settings.business_mode === "rentals"
            ? "Quadras profissionais para você e seus amigos. Reserve online e jogue quando quiser."
            : "Turmas para todos os níveis, professores certificados e a melhor estrutura da região. Venha descobrir o esporte que vai mudar sua rotina."}
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <CTAButton text={settings.primary_cta_text} large href={settings.primary_cta_url} />
          <a href={waLink} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "18px 28px", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, color: COLORS.white, fontSize: 16, fontWeight: 600, textDecoration: "none" }}>
            <Phone size={18} /> Fale no WhatsApp
          </a>
        </div>
        <div style={{ display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap", marginTop: 48 }}>
          {[
            { icon: <div style={{ display: "flex", gap: 2 }}>{[...Array(5)].map((_, i) => <Star key={i} size={14} fill={COLORS.sunset} color={COLORS.sunset} />)}</div>, text: "4.9 no Google" },
            { icon: <Users size={16} />, text: "+500 alunos ativos" },
            { icon: <Trophy size={16} />, text: "Professores certificados" },
          ].map((item, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
              {item.icon}
              {item.text}
            </div>
          ))}
        </div>
      </motion.div>
      <div className="scroll-indicator" style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
        <ChevronDown size={28} color="rgba(255,255,255,0.5)" />
      </div>
    </section>
  );
}

function StatsStrip() {
  const stats = [
    { value: "500+", label: "Alunos ativos", icon: Users },
    { value: "15+", label: "Professores", icon: Target },
    { value: "4.9", label: "Nota no Google", icon: Star },
    { value: "3", label: "Quadras", icon: MapPin },
  ];
  return (
    <div style={{ background: COLORS.white, borderBottom: `1px solid ${COLORS.grayLight}`, padding: "40px 24px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 24 }}>
        {stats.map((s, i) => (
          <div key={i} className="stat-card" style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderRadius: 12, transition: "all 0.3s", cursor: "default" }}>
            <s.icon size={24} color={COLORS.sunset} />
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 800, color: COLORS.dark }}>{s.value}</div>
              <div style={{ fontSize: 14, color: COLORS.gray }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AboutSection({ getImage }: { getImage: (k: string, f: string) => string }) {
  return (
    <Section id="sobre" style={{ padding: "80px 24px", background: COLORS.white }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 48, alignItems: "center" }}>
        <div style={{ borderRadius: 20, overflow: "hidden", aspectRatio: "4/3" }}>
          <img src={getImage("about", "https://images.unsplash.com/photo-1593786459953-62f5e5e23c16?w=800&q=80")} alt="Arena de futevôlei" style={{ objectFit: "cover", width: "100%", height: "100%" }} />
        </div>
        <div>
          <SectionLabel>Sobre nós</SectionLabel>
          <SectionTitle>Mais que uma quadra. <span style={{ color: COLORS.sunset }}>Uma comunidade.</span></SectionTitle>
          <p style={{ fontSize: 16, color: COLORS.gray, lineHeight: 1.7, marginBottom: 24 }}>
            Nascemos da paixão pelo futevôlei e do desejo de criar um espaço onde qualquer pessoa — do iniciante ao competidor — pudesse evoluir de verdade.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {["Quadras com areia de qualidade profissional", "Turmas separadas por nível de habilidade", "Método progressivo com feedback constante", "Horários flexíveis de manhã à noite"].map((item, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, color: COLORS.dark }}>
                <CheckCircle size={18} color={COLORS.sunset} />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function GallerySection({ getImage }: { getImage: (k: string, f: string) => string }) {
  const images = [
    { src: "https://images.unsplash.com/photo-1593786459953-62f5e5e23c16?w=600&q=80", span: 2, label: "Aulas em grupo" },
    { src: "https://images.unsplash.com/photo-1591343395082-e120087004b4?w=600&q=80", span: 1, label: "Técnica individual" },
    { src: "https://images.unsplash.com/photo-1507034589631-9433cc6bc453?w=600&q=80", span: 1, label: "Competições" },
    { src: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&q=80", span: 2, label: "Nossa comunidade" },
  ];
  return (
    <Section style={{ padding: "80px 24px", background: COLORS.sandLight }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center", marginBottom: 48 }}>
        <SectionLabel>Galeria</SectionLabel>
        <SectionTitle>Veja Nossa Estrutura em Ação</SectionTitle>
      </div>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {images.map((img, i) => (
          <div key={i} style={{ gridColumn: `span ${img.span}`, borderRadius: 16, overflow: "hidden", position: "relative", aspectRatio: img.span === 2 ? "2/1" : "1/1" }}>
            <img src={img.src} alt={img.label} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 16px 12px", background: "linear-gradient(transparent, rgba(0,0,0,0.6))", color: COLORS.white, fontSize: 14, fontWeight: 600 }}>
              {img.label}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function BenefitsSection({ settings }: { settings: LandingSettings }) {
  const classeBenefits = [
    { icon: Heart, title: "Saúde & Condicionamento", desc: "Queime até 600 calorias por aula treinando na areia com diversão.", color: "#EF4444" },
    { icon: Users, title: "Comunidade Vibrante", desc: "Faça amigos, participe de eventos e encontre motivação no grupo.", color: "#3B82F6" },
    { icon: Target, title: "Evolução Técnica Real", desc: "Método progressivo do básico ao avançado, com feedback constante.", color: "#10B981" },
    { icon: Sun, title: "Bem-Estar Mental", desc: "Treinar ao ar livre reduz estresse e melhora o humor.", color: "#F59E0B" },
    { icon: Trophy, title: "Competições Internas", desc: "Teste suas habilidades em campeonatos entre alunos.", color: "#8B5CF6" },
    { icon: Dumbbell, title: "Preparo Completo", desc: "Trabalhe pernas, core, agilidade e reflexo em cada sessão.", color: COLORS.sunset },
  ];
  const rentalBenefits = [
    { icon: MapPin, title: "Quadras Profissionais", desc: "Areia de qualidade, redes oficiais e iluminação noturna.", color: "#EF4444" },
    { icon: Users, title: "Jogue com Amigos", desc: "Reserve para sua turma e aproveite com liberdade total.", color: "#3B82F6" },
    { icon: Target, title: "Reserva Online Fácil", desc: "Escolha data, horário e quadra direto pelo app.", color: "#10B981" },
    { icon: Sun, title: "Horários Flexíveis", desc: "Quadras disponíveis de manhã à noite, todos os dias.", color: "#F59E0B" },
    { icon: Trophy, title: "Preço Justo", desc: "Valores acessíveis por hora, sem mensalidade.", color: "#8B5CF6" },
    { icon: Dumbbell, title: "Estrutura Completa", desc: "Estacionamento, vestiários e área de convivência.", color: COLORS.sunset },
  ];
  const benefits = settings.business_mode === "rentals" ? rentalBenefits : classeBenefits;

  return (
    <Section id="beneficios" style={{ padding: "80px 24px", background: COLORS.white }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center", marginBottom: 48 }}>
        <SectionLabel>Benefícios</SectionLabel>
        <SectionTitle>
          {settings.business_mode === "rentals"
            ? <>Por Que <span style={{ color: COLORS.sunset }}>Alugar Com a Gente</span></>
            : <>O Que Você Ganha <span style={{ color: COLORS.sunset }}>Treinando Com a Gente</span></>}
        </SectionTitle>
      </div>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        {benefits.map((b, i) => (
          <div key={i} style={{ display: "flex", gap: 16, padding: 24, borderRadius: 16, background: COLORS.white, border: `1px solid ${COLORS.grayLight}`, transition: "all 0.3s", cursor: "default" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 32px rgba(0,0,0,0.08)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: `${b.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <b.icon size={22} color={b.color} />
            </div>
            <div>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, color: COLORS.dark, marginBottom: 4 }}>{b.title}</h3>
              <p style={{ fontSize: 14, color: COLORS.gray, lineHeight: 1.5 }}>{b.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function HowItWorksSection({ settings, getImage }: { settings: LandingSettings; getImage: (k: string, f: string) => string }) {
  const classSteps = [
    { num: "01", title: "Escolha seu horário", desc: "Veja as turmas disponíveis, filtre por nível e reserve.", img: "https://images.unsplash.com/photo-1434596922112-19c563067271?w=400&q=80" },
    { num: "02", title: "Venha para sua aula", desc: "Chegue na quadra, conheça seu professor e viva a experiência.", img: "https://images.unsplash.com/photo-1580477667995-2b94f01c9516?w=400&q=80" },
    { num: "03", title: "Escolha seu plano", desc: "Se curtir, escolha o plano ideal. Simples assim.", img: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80" },
  ];
  const rentalSteps = [
    { num: "01", title: "Escolha a quadra e horário", desc: "Veja disponibilidade em tempo real e reserve online.", img: "https://images.unsplash.com/photo-1434596922112-19c563067271?w=400&q=80" },
    { num: "02", title: "Confirme o pagamento", desc: "Pague via Pix de forma rápida e segura.", img: "https://images.unsplash.com/photo-1580477667995-2b94f01c9516?w=400&q=80" },
    { num: "03", title: "Jogue!", desc: "Chegue no horário marcado e aproveite sua quadra.", img: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80" },
  ];
  const steps = settings.business_mode === "rentals" ? rentalSteps : classSteps;

  return (
    <Section id="como-funciona" style={{ padding: "80px 24px", background: COLORS.sandLight }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center", marginBottom: 48 }}>
        <SectionLabel>Como funciona</SectionLabel>
        <SectionTitle>Três Passos Para Começar</SectionTitle>
      </div>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 32 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 24, alignItems: "center", flexDirection: i % 2 === 1 ? "row-reverse" : "row", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px", borderRadius: 16, overflow: "hidden", aspectRatio: "16/10" }}>
              <img src={s.img} alt={s.title} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
            </div>
            <div style={{ flex: "1 1 300px" }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 48, color: `${COLORS.sunset}30`, lineHeight: 1 }}>{s.num}</span>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.dark, marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: 15, color: COLORS.gray, lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 48 }}><CTAButton text={settings.primary_cta_text} href={settings.primary_cta_url} /></div>
    </Section>
  );
}

function TestimonialsSection() {
  const reviews = [
    { name: "Lucas M.", role: "Aluno há 8 meses", text: "Nunca tinha jogado futevôlei e em 2 meses já estava jogando com amigos. Os professores são incríveis!", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80" },
    { name: "Camila R.", role: "Aluna há 1 ano", text: "A melhor decisão que tomei! Emagreci, fiz amigos e aprendi um esporte que amo.", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" },
    { name: "Rafael S.", role: "Aluno há 6 meses", text: "Estrutura de primeira. Quadras profissionais, horários que cabem na minha rotina.", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80" },
    { name: "Ana P.", role: "Mãe de aluno", text: "Meu filho de 14 anos adora! Desenvolveu disciplina e trabalho em equipe.", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80" },
  ];
  return (
    <Section style={{ padding: "80px 24px", background: COLORS.white }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center", marginBottom: 48 }}>
        <SectionLabel>Depoimentos</SectionLabel>
        <SectionTitle>O Que Nossos Alunos Dizem</SectionTitle>
      </div>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
        {reviews.map((r, i) => (
          <div key={i} style={{ padding: 24, borderRadius: 16, border: `1px solid ${COLORS.grayLight}`, background: COLORS.white }}>
            <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
              {[...Array(5)].map((_, j) => <Star key={j} size={16} fill={COLORS.sunset} color={COLORS.sunset} />)}
            </div>
            <p style={{ fontSize: 15, color: COLORS.dark, lineHeight: 1.6, marginBottom: 16, fontStyle: "italic" }}>"{r.text}"</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img src={r.avatar} alt={r.name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: COLORS.dark }}>{r.name}</p>
                <p style={{ fontSize: 13, color: COLORS.gray }}>{r.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function PlansSection({ settings }: { settings: LandingSettings }) {
  const classPlans = [
    { name: "2x por semana", price: "149", period: "/mês", features: ["2 aulas semanais", "Turma do seu nível", "Acesso ao app", "Aula experimental grátis"], popular: false },
    { name: "3x por semana", price: "199", period: "/mês", features: ["3 aulas semanais", "Turma do seu nível", "Acesso ao app", "Aula experimental grátis", "Prioridade de horário"], popular: true },
    { name: "Livre", price: "279", period: "/mês", features: ["Aulas ilimitadas", "Qualquer turma e horário", "Acesso ao app", "Prioridade de horário", "Eventos exclusivos"], popular: false },
  ];
  const rentalPlans = [
    { name: "Avulso", price: "80", period: "/hora", features: ["1 hora de quadra", "Até 8 jogadores", "Reserva online"], popular: false },
    { name: "Pacote 5h", price: "350", period: "/5h", features: ["5 horas de quadra", "Válido por 30 dias", "Reserva online", "10% de desconto"], popular: true },
    { name: "Pacote 10h", price: "600", period: "/10h", features: ["10 horas de quadra", "Válido por 60 dias", "Reserva online", "25% de desconto", "Horário preferencial"], popular: false },
  ];
  const plans = settings.business_mode === "rentals" ? rentalPlans : classPlans;

  return (
    <Section id="planos" style={{ padding: "80px 24px", background: COLORS.sandLight }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center", marginBottom: 48 }}>
        <SectionLabel>Planos</SectionLabel>
        <SectionTitle>Escolha o Plano <span style={{ color: COLORS.sunset }}>Ideal Para Você</span></SectionTitle>
        <p style={{ fontSize: 16, color: COLORS.gray, maxWidth: 500, margin: "0 auto" }}>
          {settings.business_mode === "rentals"
            ? "Reserve sua quadra de forma rápida e prática."
            : "Todos os planos incluem aula experimental gratuita. Sem fidelidade, cancele quando quiser."}
        </p>
      </div>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
        {plans.map((p, i) => (
          <div key={i} style={{ padding: 32, borderRadius: 20, background: p.popular ? COLORS.dark : COLORS.white, border: p.popular ? "none" : `1px solid ${COLORS.grayLight}`, position: "relative", color: p.popular ? COLORS.white : COLORS.dark, transition: "transform 0.3s" }}>
            {p.popular && <span style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: `linear-gradient(135deg, ${COLORS.sunset}, ${COLORS.sunsetDark})`, color: COLORS.white, padding: "4px 16px", borderRadius: 100, fontSize: 13, fontWeight: 700 }}>Popular</span>}
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{p.name}</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 24 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>R$</span>
              <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 48, fontWeight: 800 }}>{p.price}</span>
              <span style={{ fontSize: 14, color: p.popular ? "rgba(255,255,255,0.6)" : COLORS.gray }}>{p.period}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {p.features.map((f, fi) => (
                <div key={fi} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                  <CheckCircle size={16} color={p.popular ? COLORS.sunsetLight : COLORS.sunset} />
                  {f}
                </div>
              ))}
            </div>
            <CTAButton text="Começar Agora" dark={!p.popular} style={{ width: "100%", justifyContent: "center" }} href={settings.primary_cta_url} />
          </div>
        ))}
      </div>
    </Section>
  );
}

function FAQSection({ settings }: { settings: LandingSettings }) {
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
    <Section id="faq" style={{ padding: "80px 24px", background: COLORS.white }}>
      <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", marginBottom: 48 }}>
        <SectionLabel>Dúvidas</SectionLabel>
        <SectionTitle>Perguntas Frequentes</SectionTitle>
      </div>
      <div style={{ maxWidth: 700, margin: "0 auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {faqs.map((faq, i) => (
          <div key={i} style={{ borderRadius: 12, border: `1px solid ${open === i ? COLORS.sunset + "40" : COLORS.grayLight}`, background: open === i ? COLORS.sandLight : COLORS.white, overflow: "hidden", transition: "all 0.3s" }}>
            <button onClick={() => setOpen(open === i ? null : i)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", background: "none", border: "none", cursor: "pointer", fontSize: 16, fontWeight: 600, color: COLORS.dark, fontFamily: "'DM Sans', sans-serif", textAlign: "left" }}>
              {faq.q}
              <ChevronDown size={18} style={{ transform: open === i ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.3s", flexShrink: 0 }} />
            </button>
            <div style={{ maxHeight: open === i ? 200 : 0, overflow: "hidden", transition: "max-height 0.3s ease" }}>
              <p style={{ padding: "0 24px 18px", fontSize: 15, color: COLORS.gray, lineHeight: 1.6 }}>{faq.a}</p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function FinalCTA({ settings }: { settings: LandingSettings }) {
  const waLink = settings.whatsapp_number ? `https://wa.me/${settings.whatsapp_number}` : "#";
  return (
    <section style={{ position: "relative", padding: "100px 24px", background: COLORS.dark, overflow: "hidden", textAlign: "center" }}>
      <div style={{ position: "absolute", top: -100, right: -100, width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${COLORS.sunset}20, transparent 70%)` }} />
      <div style={{ position: "absolute", bottom: -100, left: -100, width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${COLORS.oceanLight}20, transparent 70%)` }} />
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} style={{ position: "relative", zIndex: 10, maxWidth: 700, margin: "0 auto" }}>
        <SectionLabel light>Vem pra quadra</SectionLabel>
        <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(40px, 8vw, 72px)", lineHeight: 1, color: COLORS.white, marginBottom: 20, letterSpacing: 2 }}>
          PRONTO PARA{" "}
          <span style={{ background: `linear-gradient(135deg, ${COLORS.sunset}, ${COLORS.sunsetLight})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>JOGAR?</span>
        </h2>
        <p style={{ fontSize: 18, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginBottom: 32 }}>
          {settings.business_mode === "rentals"
            ? "Reserve sua quadra agora e garanta o melhor horário para você e seus amigos."
            : "Sua jornada no futevôlei começa com uma decisão simples. Agende sua aula experimental gratuita."}
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 32 }}>
          {(settings.business_mode === "rentals"
            ? ["Reserva online", "Quadras profissionais", "Preço justo"]
            : ["Aula grátis", "Sem compromisso", "Cancele quando quiser"]
          ).map((item, idx) => (
            <span key={idx} style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
              <CheckCircle size={16} color={COLORS.sunset} />
              {item}
            </span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <CTAButton text={settings.primary_cta_text} large href={settings.primary_cta_url} />
          <a href={waLink} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "18px 28px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, color: COLORS.white, fontSize: 16, fontWeight: 600, textDecoration: "none" }}>
            <Phone size={18} /> WhatsApp
          </a>
        </div>
      </motion.div>
    </section>
  );
}

function Nav({ settings }: { settings: LandingSettings }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const links = [
    { label: "Sobre", href: "#sobre" },
    { label: "Benefícios", href: "#beneficios" },
    { label: "Como Funciona", href: "#como-funciona" },
    { label: "Planos", href: "#planos" },
    { label: "FAQ", href: "#faq" },
  ];
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, padding: "12px 24px", background: scrolled ? "rgba(15,23,42,0.95)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", transition: "all 0.3s" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href="#hero" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${COLORS.sunset}, ${COLORS.sunsetDark})`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.white, fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, fontWeight: 700 }}>FV</div>
          <span style={{ color: COLORS.white, fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700 }}>FutVôlei Arena</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }} className="hide-mobile">
          {links.map((l) => (
            <a key={l.label} href={l.href} style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: 14, fontWeight: 500, transition: "color 0.2s" }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = COLORS.white)}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.7)")}>
              {l.label}
            </a>
          ))}
          <CTAButton text="Aula Grátis" style={{ padding: "10px 20px", fontSize: 14 }} href={settings.primary_cta_url} />
        </div>
        <button className="show-mobile" onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "none" }}>
          {menuOpen ? <X size={24} color={COLORS.white} /> : <Menu size={24} color={COLORS.white} />}
        </button>
      </div>
      {menuOpen && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "20px 0", alignItems: "center" }}>
          {links.map((l) => (
            <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: 16, fontWeight: 500 }}>{l.label}</a>
          ))}
          <CTAButton text="Aula Grátis" style={{ padding: "10px 20px", fontSize: 14 }} href={settings.primary_cta_url} />
        </div>
      )}
    </nav>
  );
}

function Footer({ settings }: { settings: LandingSettings }) {
  const waLink = settings.whatsapp_number ? `https://wa.me/${settings.whatsapp_number}` : "#";
  return (
    <footer style={{ background: COLORS.dark, borderTop: "1px solid rgba(255,255,255,0.08)", padding: "60px 24px 24px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 40, marginBottom: 40 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${COLORS.sunset}, ${COLORS.sunsetDark})`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.white, fontFamily: "'Bebas Neue', sans-serif", fontSize: 16 }}>FV</div>
            <span style={{ color: COLORS.white, fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700 }}>FutVôlei Arena</span>
          </div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, lineHeight: 1.6 }}>A melhor arena de futevôlei da cidade.</p>
        </div>
        <div>
          <p style={{ color: COLORS.white, fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Links</p>
          {["Sobre", "Benefícios", "Planos", "FAQ"].map((l) => (
            <a key={l} href={`#${l.toLowerCase().replace("í", "i")}`} style={{ display: "block", color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 14, marginBottom: 10, transition: "color 0.2s" }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.color = COLORS.white)}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.5)")}>
              {l}
            </a>
          ))}
        </div>
        <div>
          <p style={{ color: COLORS.white, fontWeight: 600, marginBottom: 16, fontSize: 15 }}>Contato</p>
          <a href={waLink} style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none", fontSize: 14, marginBottom: 16, display: "block" }}>WhatsApp</a>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { Icon: Instagram, url: settings.instagram_url },
              { Icon: Youtube, url: settings.youtube_url },
            ].map(({ Icon, url }, i) => (
              <a key={i} href={url || "#"} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.white, transition: "all 0.3s", background: "transparent" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = COLORS.sunset; (e.currentTarget as HTMLAnchorElement).style.borderColor = COLORS.sunset; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.15)"; }}>
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>© {new Date().getFullYear()} FutVôlei Arena. Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}

// --- Main Page ---

export default function LandingPage() {
  const { settings, isVisible, getImage, loaded } = useLandingData();

  if (!loaded) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.dark, color: COLORS.white }}>Carregando...</div>;
  }

  return (
    <>
      <style>{`
        .scroll-indicator { animation: bounce 2s infinite; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
        .cta-pulse { animation: ctaPulse 2.5s infinite; }
        @keyframes ctaPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); } 50% { box-shadow: 0 0 0 12px rgba(249, 115, 22, 0); } }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
        @media (max-width: 768px) { .hide-mobile { display: none !important; } .show-mobile { display: flex !important; } }
        @media (min-width: 769px) { .show-mobile { display: none !important; } }
      `}</style>
      <div style={{ fontFamily: "'DM Sans', sans-serif", color: COLORS.dark, overflowX: "hidden" }}>
        <Nav settings={settings} />
        {isVisible("hero") && <HeroSection settings={settings} getImage={getImage} />}
        {isVisible("stats") && <StatsStrip />}
        {isVisible("about") && <AboutSection getImage={getImage} />}
        {isVisible("gallery") && <GallerySection getImage={getImage} />}
        {isVisible("benefits") && <BenefitsSection settings={settings} />}
        {isVisible("how_it_works") && <HowItWorksSection settings={settings} getImage={getImage} />}
        {isVisible("testimonials") && <TestimonialsSection />}
        {isVisible("plans") && <PlansSection settings={settings} />}
        {isVisible("faq") && <FAQSection settings={settings} />}
        {isVisible("final_cta") && <FinalCTA settings={settings} />}
        <Footer settings={settings} />
      </div>
    </>
  );
}
