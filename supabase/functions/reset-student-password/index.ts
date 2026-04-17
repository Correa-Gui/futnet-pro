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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!roleData || roleData.role !== "admin") {
      return new Response(JSON.stringify({ error: "Apenas admins podem redefinir senhas" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate new random 6-digit password
    const newPassword = Math.floor(100000 + Math.random() * 900000).toString();

    // Update password in Supabase Auth
    const { error: updateError } = await adminClient.auth.admin.updateUserById(user_id, {
      password: newPassword,
    });
    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Force password change on next login
    await adminClient
      .from("profiles")
      .update({ force_password_change: true })
      .eq("user_id", user_id);

    // Fetch student name, email and phone to send WhatsApp
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, email, phone")
      .eq("user_id", user_id)
      .single();

    if (profile?.phone) {
      try {
        const { data: cfg } = await adminClient
          .from("system_config")
          .select("value")
          .eq("key", "app_url")
          .maybeSingle();
        const appUrl = (cfg as any)?.value || supabaseUrl;

        const { data: tpl } = await adminClient
          .from("whatsapp_templates")
          .select("body")
          .eq("category", "welcome")
          .eq("name", "Reset de Senha")
          .eq("is_active", true)
          .maybeSingle();

        const body = tpl?.body
          ? tpl.body
              .replace(/\{\{nome\}\}/g, profile.full_name || "")
              .replace(/\{\{senha\}\}/g, newPassword)
              .replace(/\{\{app_url\}\}/g, appUrl)
          : `Olá ${profile.full_name}!\n\nSua nova senha temporária é: ${newPassword}\nAcesse: ${appUrl}`;

        await callerClient.functions.invoke("send-whatsapp", {
          body: { recipients: [{ phone: profile.phone, name: profile.full_name }], message_body: body },
        });
      } catch (e) {
        console.error("WhatsApp reset error:", e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, phone_notified: !!profile?.phone }),
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
