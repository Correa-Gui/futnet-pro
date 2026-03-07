import {
  Nav,
  HeroSection,
  StatsStrip,
  AboutSection,
  GallerySection,
  BenefitsSection,
  HowItWorksSection,
  TestimonialsSection,
  PlansSection,
  FAQSection,
  FinalCTA,
  Footer,
  useLandingData,
} from "@/components/landing";

export default function LandingPage() {
  const { settings, isVisible, getImage, loaded, businessHours } = useLandingData();

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-foreground text-white">
        Carregando...
      </div>
    );
  }

  return (
    <>
      <style>{`
        .scroll-indicator { animation: bounce 2s infinite; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(8px); } }
        .cta-pulse { animation: ctaPulse 2.5s infinite; }
        @keyframes ctaPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.4); } 50% { box-shadow: 0 0 0 12px rgba(249, 115, 22, 0); } }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
      `}</style>
      <div className="font-body text-foreground overflow-x-hidden">
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
        <Footer settings={settings} businessHours={businessHours} />
      </div>
    </>
  );
}
