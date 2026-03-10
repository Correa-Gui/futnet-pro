import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    console.log("send-whatsapp: request received", req.method);
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.log("send-whatsapp: missing auth header");
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
      console.log("send-whatsapp: auth error", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;
    console.log("send-whatsapp: authenticated user", userId);

    // Check admin role
    const { data: hasRole, error: roleError } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    console.log("send-whatsapp: hasRole result", hasRole, "error", roleError?.message);
    if (!hasRole) {
      console.log("send-whatsapp: user is not admin, forbidden");
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("send-whatsapp: checking secrets...");
    console.log("send-whatsapp: WHATSAPP_ACCESS_TOKEN exists:", !!Deno.env.get("WHATSAPP_ACCESS_TOKEN"));
    console.log("send-whatsapp: WHATSAPP_PHONE_NUMBER_ID exists:", !!Deno.env.get("WHATSAPP_PHONE_NUMBER_ID"));
    const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");

    if (!WHATSAPP_ACCESS_TOKEN) {
      throw new Error("WHATSAPP_ACCESS_TOKEN is not configured");
    }
    if (!WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error("WHATSAPP_PHONE_NUMBER_ID is not configured");
    }

    const body = await req.json();
    const { recipients, message_body, template_id } = body;
    console.log("send-whatsapp: payload", JSON.stringify({ recipientCount: recipients?.length, message_body: message_body?.substring(0, 50), template_id }));

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      console.log("send-whatsapp: no recipients");
      return new Response(JSON.stringify({ error: "recipients is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { phone: string; success: boolean; messageId?: string; error?: string }[] = [];

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    for (const recipient of recipients) {
      const phone = recipient.phone.replace(/\D/g, "");
      // Brazilian mobile numbers (without country code) are 10-11 digits starting with region codes 11-99
      // If phone starts with "1" followed by 10 digits, it's likely a US/Canada number (+1)
      // If phone starts with "55", it already has Brazil's country code
      // Otherwise, assume Brazilian and prepend 55
      let fullPhone = phone;
      if (phone.startsWith("55") && phone.length >= 12) {
        fullPhone = phone; // Already has Brazil country code
      } else if (phone.startsWith("1") && phone.length === 11) {
        fullPhone = phone; // US/Canada number with country code 1
      } else if (phone.length >= 12) {
        fullPhone = phone; // Already has some international prefix
      } else {
        fullPhone = `55${phone}`; // Assume Brazilian, prepend 55
      }
      console.log("send-whatsapp: sending to", fullPhone);

      try {
        const waPayload = {
          messaging_product: "whatsapp",
          to: fullPhone,
          type: "text",
          text: { body: message_body },
        };
        console.log("send-whatsapp: WA API payload", JSON.stringify(waPayload));

        const waResponse = await fetch(
          `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(waPayload),
          }
        );

        const waData = await waResponse.json();
        console.log("send-whatsapp: WA API response", waResponse.status, JSON.stringify(waData));

        if (!waResponse.ok) {
          const errMsg = waData?.error?.message || `HTTP ${waResponse.status}`;
          results.push({ phone: fullPhone, success: false, error: errMsg });

          await serviceClient.from("whatsapp_messages").insert({
            template_id: template_id || null,
            recipient_phone: fullPhone,
            recipient_name: recipient.name || null,
            student_id: recipient.student_id || null,
            message_body,
            status: "failed",
            error_message: errMsg,
            sent_by: userId,
            sent_at: new Date().toISOString(),
          });
        } else {
          const msgId = waData?.messages?.[0]?.id || null;
          results.push({ phone: fullPhone, success: true, messageId: msgId });

          await serviceClient.from("whatsapp_messages").insert({
            template_id: template_id || null,
            recipient_phone: fullPhone,
            recipient_name: recipient.name || null,
            student_id: recipient.student_id || null,
            message_body,
            status: "sent",
            whatsapp_message_id: msgId,
            sent_by: userId,
            sent_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";
        results.push({ phone: fullPhone, success: false, error: errMsg });

        await serviceClient.from("whatsapp_messages").insert({
          template_id: template_id || null,
          recipient_phone: fullPhone,
          recipient_name: recipient.name || null,
          student_id: recipient.student_id || null,
          message_body,
          status: "failed",
          error_message: errMsg,
          sent_by: userId,
          sent_at: new Date().toISOString(),
        });
      }
    }

    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({ sent, failed, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("send-whatsapp error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
