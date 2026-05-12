import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "./useTenant";

function parseActiveModules(rawValue: string | null | undefined, availableModuleIds: string[]) {
  if (!rawValue || !rawValue.trim()) {
    return availableModuleIds;
  }

  const trimmed = rawValue.trim();

  if (trimmed === "*") {
    return availableModuleIds;
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      const values = parsed.filter((value): value is string => typeof value === "string");
      return availableModuleIds.filter((moduleId) => values.includes(moduleId));
    }
  } catch {
    // fall back to comma-separated parsing below
  }

  const values = trimmed
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return availableModuleIds.filter((moduleId) => values.includes(moduleId));
}

export function useSubscriptions(availableModuleIds: string[]) {
  const { tenant } = useTenant();

  return useQuery({
    queryKey: ["active-modules", tenant?.id ?? null, availableModuleIds],
    queryFn: async () => {
      if (tenant?.id) {
        const { data: subscriptions, error: subscriptionsError } = await supabase
          .from("subscriptions")
          .select("module, active")
          .eq("tenant_id", tenant.id)
          .in("module", availableModuleIds);

        if (!subscriptionsError && subscriptions && subscriptions.length > 0) {
          const activeModules = availableModuleIds.filter((moduleId) =>
            subscriptions.some((subscription) => subscription.module === moduleId && subscription.active)
          );

          return {
            activeModules,
            hasModule: (moduleId: string) => activeModules.includes(moduleId),
          };
        }
      }

      const { data, error } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "active_modules")
        .maybeSingle();

      if (error) throw error;

      const activeModules = parseActiveModules(data?.value, availableModuleIds);

      return {
        activeModules,
        hasModule: (moduleId: string) => activeModules.includes(moduleId),
      };
    },
    initialData: {
      activeModules: availableModuleIds,
      hasModule: (moduleId: string) => availableModuleIds.includes(moduleId),
    },
    enabled: availableModuleIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
