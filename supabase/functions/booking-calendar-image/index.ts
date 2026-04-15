import { corsHeaders, errorResponse, jsonResponse } from "../_shared/booking.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return errorResponse("Método não permitido", 405);
  }

  const url = new URL(req.url);
  const date = url.searchParams.get("date");
  const view = url.searchParams.get("view") || "daily";

  if (!date) {
    return errorResponse("date é obrigatório", 400);
  }

  return jsonResponse({
    implemented: false,
    image_url: null,
    view,
    date,
    status: "unavailable",
    note: "Preview de calendario ainda nao publicado no FutPro. O chatbot pode seguir sem essa visualizacao.",
  });
});
