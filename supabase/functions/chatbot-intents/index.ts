import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  jsonResponse,
} from "../_shared/booking.ts";

const ROUTE_BY_KEY: Record<string, string> = {
  greeting: "controle",
  menu: "controle",
  back: "controle",
  exit: "controle",
  cancel_flow: "controle",
  book: "transacional",
  day_use: "transacional",
  availability: "transacional",
  view_bookings: "transacional",
  choose_court: "transacional",
  confirm: "transacional",
  deny: "transacional",
  change_time: "transacional",
  cancel_booking: "transacional",
  operational: "operacional",
};

const FLOW_METADATA_BY_KEY: Record<string, { flow_family: string; stage: string; subject_hint: string | null }> = {
  greeting: { flow_family: "control", stage: "entry", subject_hint: null },
  menu: { flow_family: "control", stage: "navigation", subject_hint: null },
  back: { flow_family: "control", stage: "navigation", subject_hint: null },
  exit: { flow_family: "control", stage: "navigation", subject_hint: null },
  cancel_flow: { flow_family: "control", stage: "navigation", subject_hint: null },
  book: { flow_family: "booking", stage: "start", subject_hint: "court" },
  day_use: { flow_family: "booking", stage: "start", subject_hint: "day_use" },
  availability: { flow_family: "availability", stage: "lookup", subject_hint: null },
  view_bookings: { flow_family: "booking", stage: "list", subject_hint: null },
  choose_court: { flow_family: "booking", stage: "selection", subject_hint: "court" },
  confirm: { flow_family: "booking", stage: "confirmation", subject_hint: null },
  deny: { flow_family: "booking", stage: "confirmation", subject_hint: null },
  change_time: { flow_family: "booking", stage: "adjustment", subject_hint: null },
  cancel_booking: { flow_family: "booking", stage: "cancellation", subject_hint: null },
  operational: { flow_family: "operational", stage: "informational", subject_hint: null },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return errorResponse("Metodo nao permitido", 405);
  }

  try {
    const supabase = createServiceClient();

    const { data: categories, error: categoriesError } = await supabase
      .from("chatbot_intent_categories")
      .select("id, key, title, description, is_active, sort_order, updated_at")
      .eq("is_active", true)
      .neq("key", "institutional")
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

    if (categoriesError) {
      throw categoriesError;
    }

    const categoryIds = (categories || []).map((category: any) => category.id);

    const { data: examples, error: examplesError } = await supabase
      .from("chatbot_intent_examples")
      .select("id, category_id, example_text, is_active, sort_order, updated_at")
      .eq("is_active", true)
      .in("category_id", categoryIds.length ? categoryIds : ["00000000-0000-0000-0000-000000000000"])
      .order("sort_order", { ascending: true })
      .order("example_text", { ascending: true });

    if (examplesError) {
      throw examplesError;
    }

    const examplesByCategory = new Map<string, string[]>();
    for (const example of examples || []) {
      const list = examplesByCategory.get(example.category_id) || [];
      list.push(example.example_text);
      examplesByCategory.set(example.category_id, list);
    }

    const payload = (categories || []).map((category: any) => {
      const metadata = FLOW_METADATA_BY_KEY[category.key] || {
        flow_family: "unknown",
        stage: "unknown",
        subject_hint: null,
      };

      return {
        key: category.key,
        route_class: ROUTE_BY_KEY[category.key] || "unknown",
        title: category.title,
        description: category.description,
        examples: examplesByCategory.get(category.id) || [],
        updated_at: category.updated_at,
        flow_family: metadata.flow_family,
        stage: metadata.stage,
        subject_hint: metadata.subject_hint,
      };
    });

    return jsonResponse({
      generated_at: new Date().toISOString(),
      catalog_version: "2026-04-15-chatbot-flow",
      categories: payload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return errorResponse(message, 500);
  }
});
