export interface LandingSettings {
  business_mode: string;
  hero_image_url: string | null;
  whatsapp_number: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  primary_cta_text: string;
  primary_cta_url: string;
}

export interface SectionConfig {
  section_key: string;
  is_visible: boolean;
  title: string | null;
  subtitle: string | null;
  content: any;
  image_url: string | null;
  display_order: number;
}

export interface BusinessHoursData {
  open_days: number[];
  open_hour: number;
  close_hour: number;
}
