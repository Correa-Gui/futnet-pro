import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  fetchBusinessHours,
  jsonResponse,
} from "../_shared/booking.ts";

const DEFAULT_COMPANY_NAME = "Arena";

function parseMoneyLike(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  let cleaned = value.trim();
  if (!cleaned) {
    return fallback;
  }

  cleaned = cleaned.replace(/R\$/gi, "").replace(/\s+/g, "");

  if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return errorResponse("Metodo nao permitido", 405);
  }

  try {
    const supabase = createServiceClient();
    const businessHours = await fetchBusinessHours(supabase);

    const { data, error } = await supabase
      .from("system_config")
      .select("key, value")
      .in("key", [
        "company_name",
        "company_logo_url",
        "app_url",
        "company_address",
        "court_rental_price",
        "day_use_price",
        "reservation_deposit_percentage",
        "chatbot_openai_intent_prompt_id",
        "chatbot_openai_api_key_reference",
      ]);

    if (error) {
      throw error;
    }

    const configMap = Object.fromEntries((data || []).map((row: any) => [row.key, row.value]));

    const rawAppUrl = String(configMap.app_url || "").trim();
    const appUrl = rawAppUrl ? rawAppUrl.replace(/\/+$/, "") : null;
    const landingPageUrl = appUrl ? `${appUrl}/landing` : null;

    const rawAddress = String(configMap.company_address || "").trim();
    const companyAddress = rawAddress || null;

    return jsonResponse({
      company_name: String(configMap.company_name || DEFAULT_COMPANY_NAME).trim() || DEFAULT_COMPANY_NAME,
      company_logo_url: String(configMap.company_logo_url || "").trim() || null,
      app_url: appUrl,
      company_address: companyAddress,
      landing_page_url: landingPageUrl,
      pricing: {
        court_rental_price: parseMoneyLike(configMap.court_rental_price),
        day_use_price: parseMoneyLike(configMap.day_use_price),
      },
      reservation_deposit_percentage: parseMoneyLike(configMap.reservation_deposit_percentage),
      ai: {
        intent_prompt_id: String(configMap.chatbot_openai_intent_prompt_id || "").trim() || null,
        api_key_reference: String(configMap.chatbot_openai_api_key_reference || "").trim() || null,
      },
      business_hours: businessHours,
      flow: {
        subjects: ["court", "day_use"],
        availability_periods: ["morning", "afternoon", "night"],
        confirmation_aliases: ["confirmar", "pode confirmar", "pode reservar", "pode ser", "fechado"],
        day_use_rules: {
          booking_type: "day_use",
          requires_full_business_window: true,
          start_time: businessHours.start,
          end_time: businessHours.end,
        },
        endpoints: {
          next_availability: "/functions/v1/chatbot-availability-next",
          grouped_availability: "/functions/v1/court-availability-grouped",
          range_availability: "/functions/v1/courts/availability-by-range",
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return errorResponse(message, 500);
  }
});
