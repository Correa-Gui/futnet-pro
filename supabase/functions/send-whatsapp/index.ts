import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  interpolateVariables,
  normalizeRecipientPhone,
  parseSendWhatsAppPayload,
  resolveMessageBody,
} from "./evolution.ts";
import {
  loadWhatsAppProviderConfig,
  resolveWhatsAppProviderConfig,
  sendViaWhatsAppProvider,
} from "./provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const requestPayload = parseSendWhatsAppPayload(await req.json());
    const resolvedMessage = resolveMessageBody(requestPayload);
    const finalMessage = requestPayload.template_variables
      ? interpolateVariables(resolvedMessage, requestPayload.template_variables)
      : resolvedMessage;

    if (!finalMessage) {
      return new Response(JSON.stringify({ error: "message_body is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { phone: string; success: boolean; messageId?: string; error?: string }[] = [];

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const providerConfig =
      resolveWhatsAppProviderConfig(requestPayload) ||
      await loadWhatsAppProviderConfig(serviceClient);

    for (const recipient of requestPayload.recipients) {
      const fullPhone = normalizeRecipientPhone(recipient.phone);
      if (!fullPhone) {
        results.push({ phone: recipient.phone, success: false, error: "Invalid recipient phone" });
        continue;
      }

      try {
        const { response, responseJson } = await sendViaWhatsAppProvider(providerConfig, {
          number: fullPhone,
          text: finalMessage,
        });
        const typedResponse = responseJson as Record<string, unknown> | null;

        if (!response.ok) {
          const errorMessage =
            (typedResponse?.message as string | undefined) ||
            (typedResponse?.error as string | undefined) ||
            `HTTP ${response.status}`;
          results.push({ phone: fullPhone, success: false, error: errorMessage });

          await serviceClient.from("whatsapp_messages").insert({
            template_id: requestPayload.template_id || null,
            recipient_phone: fullPhone,
            recipient_name: recipient.name || null,
            student_id: recipient.student_id || null,
            message_body: finalMessage,
            status: "failed",
            error_message: errorMessage,
            sent_by: user.id,
            sent_at: new Date().toISOString(),
          });
          continue;
        }

        const messageId =
          (typedResponse?.message_id as string | undefined) ||
          (typedResponse?.id as string | undefined) ||
          null;
        results.push({ phone: fullPhone, success: true, messageId });

        await serviceClient.from("whatsapp_messages").insert({
          template_id: requestPayload.template_id || null,
          recipient_phone: fullPhone,
          recipient_name: recipient.name || null,
          student_id: recipient.student_id || null,
          message_body: finalMessage,
          status: "sent",
          whatsapp_message_id: messageId,
          sent_by: user.id,
          sent_at: new Date().toISOString(),
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.push({ phone: fullPhone, success: false, error: errorMessage });

        await serviceClient.from("whatsapp_messages").insert({
          template_id: requestPayload.template_id || null,
          recipient_phone: fullPhone,
          recipient_name: recipient.name || null,
          student_id: recipient.student_id || null,
          message_body: finalMessage,
          status: "failed",
          error_message: errorMessage,
          sent_by: user.id,
          sent_at: new Date().toISOString(),
        });
      }
    }

    const sent = results.filter((item) => item.success).length;
    const failed = results.filter((item) => !item.success).length;

    return new Response(JSON.stringify({ sent, failed, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
