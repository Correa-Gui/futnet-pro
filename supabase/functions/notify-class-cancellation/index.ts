import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { interpolateVariables } from "../send-whatsapp/evolution.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Notifica alunos de uma sessão cancelada via WhatsApp.
 *
 * Regras:
 * - Busca attendances com status confirmed|not_confirmed da sessão
 * - Envia mensagem para cada aluno com phone cadastrado
 * - Atualiza class_sessions.status = 'cancelled' APÓS notificar
 * - Variáveis disponíveis: {{nome}}, {{turma}}, {{data}}, {{professor}}
 *
 * Auth: admin JWT
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
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
      return new Response(JSON.stringify({ error: "session_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Busca a sessão com dados da turma e professor
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
      return new Response(JSON.stringify({ error: "Sessão não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionClass = session.classes as any;
    const professorName =
      sessionClass?.teacher_profiles?.profiles?.full_name ?? "Professor";
    const className = sessionClass?.name ?? "Turma";

    const [year, month, day] = (session.date as string).split("-");
    const dataFormatada = `${day}/${month}/${year}`;

    // Busca attendances não canceladas
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

    // Busca template
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
      `Olá, {{nome}}! Informamos que a aula da turma {{turma}} ` +
      `do dia {{data}} com {{professor}} foi cancelada. Pedimos desculpas pelo inconveniente.`;

    const rawMessage = templateBody ?? defaultMessage;

    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
    const evolutionInstance =
      Deno.env.get("EVOLUTION_INSTANCE_NAME") || Deno.env.get("EVOLUTION_INSTANCE");

    if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstance) {
      throw new Error("Configuração da Evolution API incompleta");
    }

    let notified = 0;
    let failed = 0;

    for (const attendance of attendances ?? []) {
      const sp = attendance.student_profiles as any;
      const profile = sp?.profiles;

      if (!profile?.phone) continue;

      const vars: Record<string, string> = {
        nome: profile.full_name ?? "",
        turma: className,
        data: dataFormatada,
        professor: professorName,
      };

      const messageBody = interpolateVariables(rawMessage, vars);
      const digitsOnly = profile.phone.replace(/\D/g, "");
      const phone = digitsOnly.startsWith("55") ? digitsOnly : `55${digitsOnly}`;

      try {
        const response = await fetch(
          `${evolutionApiUrl.replace(/\/$/, "")}/message/sendText/${evolutionInstance}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: evolutionApiKey,
            },
            body: JSON.stringify({ number: phone, text: messageBody }),
          }
        );

        const responseJson = await response.json();
        const messageId = responseJson?.key?.id || responseJson?.id || null;

        await serviceClient.from("whatsapp_messages").insert({
          template_id: template_id ?? null,
          recipient_phone: phone,
          recipient_name: profile.full_name,
          student_id: attendance.student_id,
          message_body: messageBody,
          status: response.ok ? "sent" : "failed",
          whatsapp_message_id: response.ok ? messageId : null,
          error_message: response.ok
            ? null
            : responseJson?.response?.message || `HTTP ${response.status}`,
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

    // Atualiza status da sessão para cancelled APÓS notificar
    await serviceClient
      .from("class_sessions")
      .update({ status: "cancelled" })
      .eq("id", session_id);

    return new Response(
      JSON.stringify({ notified, failed }),
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
