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
  institutional: "institucional",
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
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });

    if (categoriesError) {
      throw categoriesError;
    }

    const { data: examples, error: examplesError } = await supabase
      .from("chatbot_intent_examples")
      .select("id, category_id, example_text, is_active, sort_order, updated_at")
      .eq("is_active", true)
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

    const payload = (categories || []).map((category: any) => ({
      key: category.key,
      route_class: ROUTE_BY_KEY[category.key] || "unknown",
      title: category.title,
      description: category.description,
      examples: examplesByCategory.get(category.id) || [],
      updated_at: category.updated_at,
    }));

    return jsonResponse({
      generated_at: new Date().toISOString(),
      categories: payload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return errorResponse(message, 500);
  }
});
