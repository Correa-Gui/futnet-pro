import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DaySchedule {
  open_hour: number;
  close_hour: number;
}

export interface BusinessHours {
  /** Days open: 0=Sun, 1=Mon ... 6=Sat */
  open_days: number[];
  /** Global fallback opening hour */
  open_hour: number;
  /** Global fallback closing hour */
  close_hour: number;
  /** Per-day overrides keyed by weekday number (0-6) */
  per_day?: Record<string, DaySchedule>;
}

/** Returns the schedule for a given weekday, falling back to global hours. */
export function getHoursForDay(bh: BusinessHours, dayOfWeek: number): DaySchedule {
  return bh.per_day?.[String(dayOfWeek)] ?? { open_hour: bh.open_hour, close_hour: bh.close_hour };
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
    staleTime: 0,
  });
}

export { DEFAULT_BUSINESS_HOURS };
