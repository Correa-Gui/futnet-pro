import {
  Nav,
  HeroSection,
  StatsStrip,
  GallerySection,
  BenefitsSection,
  TestimonialsSection,
  FAQSection,
  FinalCTA,
  Footer,
  useLandingData,
} from "@/components/landing";
import { TrialFormSection } from "@/components/landing/TrialFormSection";
import { ClassesSection } from "@/components/landing/ClassesSection";
import { DynamicPlansSection } from "@/components/landing/DynamicPlansSection";
import { ServicesSection } from "@/components/landing/ServicesSection";
import { CourtBookingSection } from "@/components/landing/CourtBookingSection";
import { useState, useCallback } from "react";
import { supportsClasses, supportsRentals } from "@/components/landing/brand";

export default function LandingPage() {
  const { settings, isVisible, getImage, loaded, businessHours } = useLandingData();
  const [preselectedClassId, setPreselectedClassId] = useState("");
  const hasClasses = supportsClasses(settings.business_mode);
  const hasRentals = supportsRentals(settings.business_mode);

  const handleSelectClass = useCallback((id: string) => {
    setPreselectedClassId(id);
  }, []);

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
      `}</style>
      <div className="landing-shell font-body">
        <Nav settings={settings} />
        <HeroSection settings={settings} getImage={getImage} />
        {isVisible("stats") && <StatsStrip settings={settings} />}
        {isVisible("benefits") && <BenefitsSection settings={settings} />}
        <ServicesSection settings={settings} getImage={getImage} />
        {hasClasses && <ClassesSection onSelectClass={handleSelectClass} />}
        {isVisible("gallery") && <GallerySection settings={settings} getImage={getImage} />}
        {isVisible("testimonials") && <TestimonialsSection settings={settings} />}
        {isVisible("plans") && <DynamicPlansSection settings={settings} />}
        {hasClasses && (
          <TrialFormSection
            settings={settings}
            preselectedClassId={preselectedClassId}
          />
        )}
        {hasRentals && <CourtBookingSection />}
        {isVisible("faq") && <FAQSection settings={settings} />}
        {isVisible("final_cta") && <FinalCTA settings={settings} />}
        <Footer settings={settings} businessHours={businessHours} />
      </div>
    </>
  );
}
