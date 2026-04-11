import {
  corsHeaders,
  createAnonClient,
  errorResponse,
  fetchBusinessHours,
  generateHourSlots,
  isBusinessDayOpen,
  isFutureWindow,
  jsonResponse,
  overlaps,
  periodKey,
} from "../_shared/booking.ts";

type OccupancyMap = Record<string, { start: string; end: string }[]>;

async function loadOccupancyMap(supabase: any, targetDate: string) {
  const occupancy: OccupancyMap = {};

  const { data: bookings, error: bookingsError } = await supabase
    .from("court_bookings")
    .select("court_id, start_time, end_time")
    .eq("date", targetDate)
    .in("status", ["requested", "confirmed", "paid"]);

  if (bookingsError) throw bookingsError;

  for (const booking of bookings || []) {
    occupancy[booking.court_id] ??= [];
    occupancy[booking.court_id].push({
      start: booking.start_time,
      end: booking.end_time,
    });
  }

  const { data: classSessions, error: classError } = await supabase
    .from("class_sessions")
    .select("classes(court_id, start_time, end_time)")
    .eq("date", targetDate)
    .eq("status", "scheduled");

  if (classError) throw classError;

  for (const session of classSessions || []) {
    const classData = (session as any)?.classes;
    if (!classData?.court_id) continue;
    occupancy[classData.court_id] ??= [];
    occupancy[classData.court_id].push({
      start: classData.start_time,
      end: classData.end_time,
    });
  }

  return occupancy;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return errorResponse("Método não permitido", 405);
  }

  const url = new URL(req.url);
  const targetDate = url.searchParams.get("date");
  if (!targetDate) {
    return errorResponse("date é obrigatório", 400);
  }

  try {
    const supabase = createAnonClient();
    const now = new Date();

    const { data: courts, error: courtsError } = await supabase
      .from("courts")
      .select("id")
      .eq("is_active", true);

    if (courtsError) throw courtsError;

    const businessHours = await fetchBusinessHours(supabase);
    if (!isBusinessDayOpen(targetDate, businessHours)) {
      return jsonResponse({
        date: targetDate,
        periods: {
          morning: [],
          afternoon: [],
          night: [],
        },
        business_hours: businessHours,
      });
    }
    const occupancy = await loadOccupancyMap(supabase, targetDate);
    const uniqueSlots = new Map<string, { start: string; end: string }>();
    const daySlots = generateHourSlots(businessHours.start, businessHours.end);

    for (const court of courts || []) {
      const occupied = occupancy[court.id] || [];
      const freeSlots = daySlots.filter(
        (slot) => !occupied.some((occ) => overlaps(slot.start, slot.end, occ.start, occ.end)),
      );
      for (const slot of freeSlots) {
        if (!isFutureWindow(targetDate, slot.end, now)) {
          continue;
        }
        uniqueSlots.set(`${slot.start}|${slot.end}`, slot);
      }
    }

    const periods = {
      morning: [] as { start: string; end: string }[],
      afternoon: [] as { start: string; end: string }[],
      night: [] as { start: string; end: string }[],
    };

    for (const slot of [...uniqueSlots.values()].sort((a, b) => a.start.localeCompare(b.start))) {
      periods[periodKey(slot.start) as keyof typeof periods].push(slot);
    }

    return jsonResponse({
      date: targetDate,
      periods,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return errorResponse(message, 500);
  }
});
