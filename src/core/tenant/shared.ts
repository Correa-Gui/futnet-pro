import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface TenantConfig {
  companyName: string;
  companyLogoUrl: string;
  appUrl: string;
  companyAddress: string;
  primaryColor: string;
}

export interface TenantData {
  id: string | null;
  slug: string | null;
  nome: string;
  plano: string;
  status: string;
  config: TenantConfig;
}

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  companyName: "",
  companyLogoUrl: "",
  appUrl: "",
  companyAddress: "",
  primaryColor: "",
};

function configValue(config: Json, key: string) {
  if (!config || typeof config !== "object" || Array.isArray(config)) return "";
  const value = (config as Record<string, Json | undefined>)[key];
  return typeof value === "string" ? value : "";
}

function normalizeTenantConfig(params: {
  tenantName?: string;
  tenantConfig?: Json;
  legacyValues?: Record<string, string>;
}) {
  const tenantConfig = params.tenantConfig;
  const legacyValues = params.legacyValues || {};

  return {
    companyName:
      configValue(tenantConfig, "nome_exibido") ||
      params.tenantName ||
      legacyValues.company_name ||
      DEFAULT_TENANT_CONFIG.companyName,
    companyLogoUrl:
      configValue(tenantConfig, "logo_url") ||
      legacyValues.company_logo_url ||
      DEFAULT_TENANT_CONFIG.companyLogoUrl,
    appUrl:
      configValue(tenantConfig, "app_url") ||
      legacyValues.app_url ||
      DEFAULT_TENANT_CONFIG.appUrl,
    companyAddress:
      configValue(tenantConfig, "company_address") ||
      legacyValues.company_address ||
      DEFAULT_TENANT_CONFIG.companyAddress,
    primaryColor:
      configValue(tenantConfig, "cor_primaria") ||
      legacyValues.tenant_primary_color ||
      DEFAULT_TENANT_CONFIG.primaryColor,
  };
}

export function resolveTenantSlug(hostname: string) {
  if (!hostname || hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }

  const parts = hostname.split(".");
  if (parts.length < 3) return null;

  return parts[0] || null;
}

async function loadLegacyTenantConfig() {
  const { data, error } = await supabase
    .from("system_config")
    .select("key, value")
    .in("key", [
      "company_name",
      "company_logo_url",
      "app_url",
      "company_address",
      "tenant_primary_color",
    ]);

  if (error) throw error;

  const values = Object.fromEntries((data || []).map((item) => [item.key, item.value || ""]));

  return {
    id: null,
    slug: null,
    nome: values.company_name || "",
    plano: "essencial",
    status: "ativo",
    config: normalizeTenantConfig({ legacyValues: values }),
  } satisfies TenantData;
}

export async function loadTenantBySlug(slug: string | null): Promise<TenantData> {
  try {
    let tenantQuery = supabase
      .from("tenants")
      .select("id, slug, nome, plano, status")
      .order("created_at", { ascending: true })
      .limit(1);

    if (slug) {
      tenantQuery = supabase
        .from("tenants")
        .select("id, slug, nome, plano, status")
        .eq("slug", slug)
        .limit(1);
    }

    const { data: tenantRows, error: tenantError } = await tenantQuery;
    if (tenantError) throw tenantError;

    const tenant = tenantRows?.[0];
    if (!tenant) {
      return await loadLegacyTenantConfig();
    }

    const { data: tenantSettings, error: settingsError } = await supabase
      .from("tenant_settings")
      .select("config")
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (settingsError) throw settingsError;

    const { data: legacyRows } = await supabase
      .from("system_config")
      .select("key, value")
      .in("key", [
        "company_name",
        "company_logo_url",
        "app_url",
        "company_address",
        "tenant_primary_color",
      ]);

    const legacyValues = Object.fromEntries((legacyRows || []).map((item) => [item.key, item.value || ""]));

    return {
      id: tenant.id,
      slug: tenant.slug,
      nome: tenant.nome,
      plano: tenant.plano,
      status: tenant.status,
      config: normalizeTenantConfig({
        tenantName: tenant.nome,
        tenantConfig: tenantSettings?.config,
        legacyValues,
      }),
    };
  } catch {
    return await loadLegacyTenantConfig();
  }
}
