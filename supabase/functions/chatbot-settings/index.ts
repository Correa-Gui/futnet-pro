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
        "court_rental_price",
        "day_use_price",
        "reservation_deposit_percentage",
        "chatbot_openai_intent_prompt_id",
        "chatbot_openai_institutional_prompt_id",
        "chatbot_openai_vector_store_id",
        "chatbot_openai_api_key_reference",
      ]);

    if (error) {
      throw error;
    }

    const configMap = Object.fromEntries((data || []).map((row: any) => [row.key, row.value]));

    return jsonResponse({
      company_name: String(configMap.company_name || DEFAULT_COMPANY_NAME).trim() || DEFAULT_COMPANY_NAME,
      company_logo_url: String(configMap.company_logo_url || "").trim() || null,
      app_url: String(configMap.app_url || "").trim() || null,
      pricing: {
        court_rental_price: parseMoneyLike(configMap.court_rental_price),
        day_use_price: parseMoneyLike(configMap.day_use_price),
      },
      reservation_deposit_percentage: parseMoneyLike(configMap.reservation_deposit_percentage),
      ai: {
        intent_prompt_id: String(configMap.chatbot_openai_intent_prompt_id || "").trim() || null,
        institutional_prompt_id: String(configMap.chatbot_openai_institutional_prompt_id || "").trim() || null,
        vector_store_id: String(configMap.chatbot_openai_vector_store_id || "").trim() || null,
        api_key_reference: String(configMap.chatbot_openai_api_key_reference || "").trim() || null,
      },
      business_hours: businessHours,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return errorResponse(message, 500);
  }
});
