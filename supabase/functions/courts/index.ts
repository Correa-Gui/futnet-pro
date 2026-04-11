import {
  buildIntervals,
  corsHeaders,
  createAnonClient,
  errorResponse,
  fetchBusinessHours,
  generateHourSlots,
  getDurationHours,
  isBusinessDayOpen,
  isWithinBusinessHours,
  isFutureWindow,
  jsonResponse,
  overlaps,
} from "../_shared/booking.ts";

type OccupancyMap = Record<string, { start: string; end: string }[]>;

async function loadOccupancyMap(supabase: any, targetDate: string) {
  const occupancy: OccupancyMap = {};

  const { data: bookings, error: bookingsError } = await supabase
    .from("court_bookings")
    .select("court_id, start_time, end_time")
    .eq("date", targetDate)
    .in("status", ["requested", "confirmed", "paid"]);

  if (bookingsError) {
    throw bookingsError;
  }

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

  if (classError) {
    throw classError;
  }

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

  const url = new URL(req.url);
  const pathname = url.pathname.replace(/\/+$/, "");

  if (req.method !== "GET" || !pathname.endsWith("/courts/availability-by-range")) {
    return errorResponse("Método ou rota não suportados", 405);
  }

  const targetDate = url.searchParams.get("date");
  const startTime = url.searchParams.get("start_time");
  const endTime = url.searchParams.get("end_time");

  if (!targetDate || !startTime || !endTime) {
    return errorResponse("date, start_time e end_time são obrigatórios", 400);
  }

  if (startTime >= endTime) {
    return errorResponse("start_time deve ser anterior a end_time", 400);
  }

  try {
    const supabase = createAnonClient();
    const now = new Date();

    let { data: courts, error: courtsError } = await supabase
      .from("courts")
      .select("id, name, photo_url, surface_type")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (courtsError) {
      const fallback = await supabase
        .from("courts")
        .select("id, name, surface_type")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (fallback.error) {
        throw fallback.error;
      }
      courts = (fallback.data || []).map((court: any) => ({ ...court, photo_url: null }));
    }

    const activeCourts = courts || [];
    if (!activeCourts.length) {
      return jsonResponse({
        date: targetDate,
        start_time: startTime,
        end_time: endTime,
        available_courts: [],
        suggested_slots: [],
      });
    }

    const businessHours = await fetchBusinessHours(supabase);
    if (!isBusinessDayOpen(targetDate, businessHours) || !isWithinBusinessHours(startTime, endTime, businessHours)) {
      return jsonResponse({
        date: targetDate,
        start_time: startTime,
        end_time: endTime,
        available_courts: [],
        suggested_slots: [],
        business_hours: businessHours,
      });
    }
    const occupancy = await loadOccupancyMap(supabase, targetDate);
    const durationHours = getDurationHours(startTime, endTime);

    const availableCourts = activeCourts.filter((court: any) => {
      if (!isFutureWindow(targetDate, endTime, now)) {
        return false;
      }
      const occupied = occupancy[court.id] || [];
      return !occupied.some((slot) => overlaps(startTime, endTime, slot.start, slot.end));
    });

    const suggestions = new Map<string, { start: string; end: string }>();
    const daySlots = generateHourSlots(businessHours.start, businessHours.end);

    for (const court of activeCourts) {
      const occupied = occupancy[court.id] || [];
      const freeSlots = daySlots.filter(
        (slot) => !occupied.some((occ) => overlaps(slot.start, slot.end, occ.start, occ.end)),
      );
      const intervals = buildIntervals(freeSlots, durationHours);
      for (const interval of intervals) {
        if (!isFutureWindow(targetDate, interval.end, now)) {
          continue;
        }
        suggestions.set(`${interval.start}|${interval.end}`, interval);
      }
    }

    const suggestedSlots = [...suggestions.values()]
      .filter((slot) => !(slot.start === startTime && slot.end === endTime))
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 8);

    return jsonResponse({
      date: targetDate,
      start_time: startTime,
      end_time: endTime,
      available_courts: availableCourts,
      suggested_slots: suggestedSlots,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return errorResponse(message, 500);
  }
});
