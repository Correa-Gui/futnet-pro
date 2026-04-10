import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizePhone, phoneLookupKey } from "../_shared/booking.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const phone = url.searchParams.get("phone");

  if (!phone) {
    return new Response(
      JSON.stringify({ error: "phone é obrigatório" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Normaliza o telefone: apenas dígitos, últimos 11 (DDD + número)
  const normalized = normalizePhone(phone);
  const lookupKey = phoneLookupKey(phone);

  try {
    // 1. Verifica se é aluno: busca em profiles pelo telefone
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("full_name, user_id")
      .or(`phone.ilike.%${lookupKey},phone.eq.${normalized}`)
      .limit(5);

    if (profiles && profiles.length > 0) {
      const profile = profiles[0] as { full_name: string; user_id: string };

      // Confirma se tem student_profile associado
      const { data: studentProfile } = await adminClient
        .from("student_profiles")
        .select("id")
        .eq("user_id", profile.user_id)
        .maybeSingle();

      if (studentProfile) {
        return new Response(
          JSON.stringify({ name: profile.full_name, is_student: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 2. Não é aluno — verifica em booking_users
    const { data: bookingUser } = await adminClient
      .from("booking_users")
      .select("name")
      .eq("normalized_phone", lookupKey)
      .maybeSingle();

    return new Response(
      JSON.stringify({ name: (bookingUser as any)?.name ?? null, is_student: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
