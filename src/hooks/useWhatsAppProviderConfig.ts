import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppProviderConfig {
  baseUrl: string;
  instanceName: string;
}

export const DEFAULT_WHATSAPP_PROVIDER_CONFIG: WhatsAppProviderConfig = {
  baseUrl: "",
  instanceName: "SB Tech",
};

export function useWhatsAppProviderConfig() {
  return useQuery({
    queryKey: ["whatsapp-provider-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_config")
        .select("key, value")
        .in("key", ["whatsapp_service_base_url", "whatsapp_instance_name"]);

      if (error) throw error;

      const map = Object.fromEntries((data || []).map((item) => [item.key, item.value]));
      return {
        baseUrl: map.whatsapp_service_base_url || DEFAULT_WHATSAPP_PROVIDER_CONFIG.baseUrl,
        instanceName: map.whatsapp_instance_name || DEFAULT_WHATSAPP_PROVIDER_CONFIG.instanceName,
      } satisfies WhatsAppProviderConfig;
    },
    staleTime: 5 * 60 * 1000,
  });
}
