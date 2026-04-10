import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  jsonResponse,
  normalizePhone,
  phoneLookupKey,
  phoneMatches,
} from "../_shared/booking.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createServiceClient();
  const url = new URL(req.url);
  const pathname = url.pathname.replace(/\/+$/, "");

  try {
    if (req.method === "GET" && pathname.endsWith("/booking-user")) {
      const phone = url.searchParams.get("phone");
      if (!phone) {
        return errorResponse("phone é obrigatório", 400);
      }

      const normalizedPhone = normalizePhone(phone);
      const lookupKey = phoneLookupKey(phone);

      const { data: bookingUser, error: bookingUserError } = await supabase
        .from("booking_users")
        .select("id, name, phone, normalized_phone")
        .eq("normalized_phone", lookupKey)
        .maybeSingle();

      if (bookingUserError) {
        throw bookingUserError;
      }

      if (bookingUser && phoneMatches(bookingUser.phone, normalizedPhone)) {
        return jsonResponse({
          found: true,
          is_student: false,
          user: {
            id: bookingUser.id,
            name: bookingUser.name,
            phone: bookingUser.phone,
          },
        });
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, user_id")
        .or(`phone.ilike.%${lookupKey},phone.eq.${normalizedPhone}`)
        .limit(5);

      if (profilesError) {
        throw profilesError;
      }

      for (const profile of profiles || []) {
        if (!profile?.phone || !phoneMatches(profile.phone, normalizedPhone)) {
          continue;
        }

        const { data: studentProfile } = await supabase
          .from("student_profiles")
          .select("id")
          .eq("user_id", profile.user_id)
          .maybeSingle();

        if (studentProfile) {
          return jsonResponse({
            found: true,
            is_student: true,
            user: {
              id: profile.id,
              name: profile.full_name,
              phone: normalizePhone(profile.phone),
            },
          });
        }
      }

      return jsonResponse({
        found: false,
        is_student: false,
        user: null,
      });
    }

    if (req.method === "POST" && pathname.endsWith("/booking-user/upsert")) {
      const body = await req.json();
      const phone = normalizePhone(body?.phone || "");
      const normalizedPhone = phoneLookupKey(phone);
      const name = String(body?.name || "").trim();

      if (!phone || !name) {
        return errorResponse("phone e name são obrigatórios", 400);
      }

      const { data, error } = await supabase
        .from("booking_users")
        .upsert(
          {
            phone,
            normalized_phone: normalizedPhone,
            name,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "normalized_phone" },
        )
        .select("id, name, phone, normalized_phone")
        .single();

      if (error) {
        throw error;
      }

      return jsonResponse({
        success: true,
        user: data,
      });
    }

    return errorResponse("Método ou rota não suportados", 405);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return errorResponse(message, 500);
  }
});
