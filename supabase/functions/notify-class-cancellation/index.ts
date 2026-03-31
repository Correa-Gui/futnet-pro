import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { interpolateVariables } from "../send-whatsapp/evolution.ts";
import { loadWhatsAppProviderConfig, sendViaWhatsAppProvider } from "../send-whatsapp/provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Metodo nao permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: hasRole } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!hasRole) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { session_id, template_id, custom_message } = body;

    if (!session_id) {
      return new Response(JSON.stringify({ error: "session_id e obrigatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: session, error: sessionError } = await serviceClient
      .from("class_sessions")
      .select(`
        id,
        date,
        status,
        classes(
          name,
          teacher_profiles(
            profiles(full_name)
          )
        )
      `)
      .eq("id", session_id)
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: "Sessao nao encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionClass = session.classes as any;
    const professorName = sessionClass?.teacher_profiles?.profiles?.full_name ?? "Professor";
    const className = sessionClass?.name ?? "Turma";

    const [year, month, day] = (session.date as string).split("-");
    const formattedDate = `${day}/${month}/${year}`;

    const { data: attendances, error: attendancesError } = await serviceClient
      .from("attendances")
      .select(`
        student_id,
        student_profiles(
          user_id,
          profiles(full_name, phone)
        )
      `)
      .eq("session_id", session_id)
      .in("status", ["confirmed", "not_confirmed"]);

    if (attendancesError) throw attendancesError;

    let templateBody: string | null = custom_message ?? null;
    if (!templateBody && template_id) {
      const { data: template } = await serviceClient
        .from("whatsapp_templates")
        .select("body")
        .eq("id", template_id)
        .eq("is_active", true)
        .single();
      templateBody = template?.body ?? null;
    }

    const defaultMessage =
      `Ola, {{nome}}! Informamos que a aula da turma {{turma}} ` +
      `do dia {{data}} com {{professor}} foi cancelada. Pedimos desculpas pelo inconveniente.`;

    const rawMessage = templateBody ?? defaultMessage;
    const providerConfig = await loadWhatsAppProviderConfig(serviceClient);

    let notified = 0;
    let failed = 0;

    for (const attendance of attendances ?? []) {
      const studentProfile = attendance.student_profiles as any;
      const profile = studentProfile?.profiles;

      if (!profile?.phone) continue;

      const vars: Record<string, string> = {
        nome: profile.full_name ?? "",
        turma: className,
        data: formattedDate,
        professor: professorName,
      };

      const messageBody = interpolateVariables(rawMessage, vars);
      const digitsOnly = profile.phone.replace(/\D/g, "");
      const phone = digitsOnly.startsWith("55") ? digitsOnly : `55${digitsOnly}`;

      try {
        const { response, responseJson } = await sendViaWhatsAppProvider(providerConfig, {
          number: phone,
          text: messageBody,
        });

        const typedResponse = responseJson as Record<string, unknown> | null;
        const messageId =
          (typedResponse?.message_id as string | undefined) ||
          (typedResponse?.id as string | undefined) ||
          null;
        const errorMessage =
          (typedResponse?.message as string | undefined) ||
          (typedResponse?.error as string | undefined) ||
          `HTTP ${response.status}`;

        await serviceClient.from("whatsapp_messages").insert({
          template_id: template_id ?? null,
          recipient_phone: phone,
          recipient_name: profile.full_name,
          student_id: attendance.student_id,
          message_body: messageBody,
          status: response.ok ? "sent" : "failed",
          whatsapp_message_id: response.ok ? messageId : null,
          error_message: response.ok ? null : errorMessage,
          sent_by: user.id,
          sent_at: new Date().toISOString(),
        });

        if (response.ok) {
          notified++;
        } else {
          failed++;
        }
      } catch (err) {
        failed++;
        await serviceClient.from("whatsapp_messages").insert({
          template_id: template_id ?? null,
          recipient_phone: phone,
          recipient_name: profile.full_name,
          student_id: attendance.student_id,
          message_body: messageBody,
          status: "failed",
          error_message: err instanceof Error ? err.message : "Unknown error",
          sent_by: user.id,
          sent_at: new Date().toISOString(),
        });
      }
    }

    await serviceClient
      .from("class_sessions")
      .update({ status: "cancelled" })
      .eq("id", session_id);

    return new Response(JSON.stringify({ notified, failed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
