import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  getStatusLabel,
  jsonResponse,
  normalizePhone,
  phoneMatches,
  toSaoPauloIso,
} from "../_shared/booking.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return errorResponse("Método não permitido", 405);
  }

  const url = new URL(req.url);
  const phone = url.searchParams.get("phone");
  if (!phone) {
    return errorResponse("phone é obrigatório", 400);
  }

  try {
    const supabase = createServiceClient();
    const normalizedPhone = normalizePhone(phone);
    const last11 = normalizedPhone.slice(-11);
    const now = new Date();

    const { data, error } = await supabase
      .from("court_bookings")
      .select("id, date, start_time, end_time, status, payment_id, requester_phone, courts(name)")
      .or(`requester_phone.eq.${normalizedPhone},requester_phone.eq.${last11}`)
      .neq("status", "cancelled")
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      throw error;
    }

    const bookings = (data || [])
      .filter((booking: any) => phoneMatches(booking.requester_phone, normalizedPhone))
      .map((booking: any) => ({
        id: booking.id,
        court_name: booking.courts?.name || "Quadra",
        start_at: toSaoPauloIso(booking.date, booking.start_time),
        end_at: toSaoPauloIso(booking.date, booking.end_time),
        status: booking.status,
        status_label: getStatusLabel(booking.status),
      }))
      .filter((booking: any) => new Date(booking.end_at).getTime() > now.getTime())
      .sort((a: any, b: any) => a.start_at.localeCompare(b.start_at));

    return jsonResponse({ bookings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return errorResponse(message, 500);
  }
});
