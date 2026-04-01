import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LandingSettings, SectionConfig, BusinessHoursData } from "./types";

const DEFAULT_SETTINGS: LandingSettings = {
  business_mode: "both",
  hero_image_url: null,
  whatsapp_number: "5511999999999",
  instagram_url: null,
  youtube_url: null,
  primary_cta_text: "Agende Sua Aula Grátis",
  primary_cta_url: "/cadastro",
};

export function useLandingData() {
  const [settings, setSettings] = useState<LandingSettings>(DEFAULT_SETTINGS);
  const [sections, setSections] = useState<Record<string, SectionConfig>>({});
  const [businessHours, setBusinessHours] = useState<BusinessHoursData | null>(null);
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
        (sectionsRes.data as unknown as SectionConfig[]).forEach((s) => {
          map[s.section_key] = s;
        });
        setSections(map);
      }
      if (hoursRes.data?.value) {
        try {
          setBusinessHours(JSON.parse(hoursRes.data.value));
        } catch {
          setBusinessHours(null);
        }
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
