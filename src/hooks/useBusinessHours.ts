import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessHours {
  /** Days open: 0=Sun, 1=Mon ... 6=Sat */
  open_days: number[];
  /** Opening hour (e.g. 6 for 06:00) */
  open_hour: number;
  /** Closing hour (e.g. 22 for 22:00) */
  close_hour: number;
}

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  open_days: [1, 2, 3, 4, 5, 6], // Mon-Sat
  open_hour: 6,
  close_hour: 22,
};

export function useBusinessHours() {
  return useQuery({
    queryKey: ["business-hours"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "business_hours")
        .maybeSingle();
      if (error) throw error;
      if (data?.value) {
        try {
          return JSON.parse(data.value) as BusinessHours;
        } catch {
          return DEFAULT_BUSINESS_HOURS;
        }
      }
      return DEFAULT_BUSINESS_HOURS;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export { DEFAULT_BUSINESS_HOURS };
