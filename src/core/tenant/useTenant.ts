import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { loadTenantBySlug, resolveTenantSlug } from "./shared";

export function useTenant() {
  const slug = useMemo(() => resolveTenantSlug(window.location.hostname), []);

  const query = useQuery({
    queryKey: ["tenant-config", slug],
    queryFn: async () => loadTenantBySlug(slug),
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    const companyName = query.data?.config.companyName;
    if (companyName) {
      document.title = companyName;
    }
  }, [query.data?.config.companyName]);

  useEffect(() => {
    const companyLogoUrl = query.data?.config.companyLogoUrl;
    if (!companyLogoUrl) return;

    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = companyLogoUrl;
  }, [query.data?.config.companyLogoUrl]);

  useEffect(() => {
    const primaryColor = query.data?.config.primaryColor?.trim();
    if (!primaryColor) return;

    document.documentElement.style.setProperty("--color-primary", primaryColor);
  }, [query.data?.config.primaryColor]);

  return {
    ...query,
    slug,
    tenant: query.data,
  };
}
