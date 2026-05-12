import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function resolveTenantId(adminClient: any, caller: any, requestedTenantId?: string) {
  if (requestedTenantId) {
    return requestedTenantId;
  }

  if (typeof caller?.app_metadata?.tenant_id === "string" && caller.app_metadata.tenant_id.trim()) {
    return caller.app_metadata.tenant_id.trim();
  }

  const { data: membership } = await adminClient
    .from("tenant_members")
    .select("tenant_id")
    .eq("user_id", caller.id)
    .limit(1)
    .maybeSingle();

  if (membership?.tenant_id) {
    return membership.tenant_id;
  }

  const { data: fallbackTenant } = await adminClient
    .from("tenants")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return fallbackTenant?.id ?? null;
}

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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser(token);
    if (callerError || !caller) {
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
      return new Response(JSON.stringify({ error: "Apenas admins podem criar usuários" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      full_name,
      phone,
      cpf,
      birth_date,
      role,
      rate_per_class,
      pix_key,
      skill_level,
      plan_id,
      invoice_due_day,
      class_ids,
      admin_role_id,
      tenant_id: requestedTenantId,
    } = body;

    let email: string | undefined = body.email;
    if (!email && role === "student" && phone) {
      const digits = phone.replace(/\D/g, "");
      const normalized = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
      email = `${normalized}@aluno.futnet.app`;
    }

    const normalizedInvoiceDueDay =
      typeof invoice_due_day === "number"
        ? invoice_due_day
        : typeof invoice_due_day === "string" && invoice_due_day.trim()
          ? Number(invoice_due_day)
          : null;

    if (!email || !full_name || !role) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: email (ou telefone para alunos), full_name, role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["admin", "teacher", "student"].includes(role)) {
      return new Response(JSON.stringify({ error: "Role deve ser 'admin', 'teacher' ou 'student'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (
      normalizedInvoiceDueDay !== null &&
      (!Number.isInteger(normalizedInvoiceDueDay) || normalizedInvoiceDueDay < 1 || normalizedInvoiceDueDay > 31)
    ) {
      return new Response(JSON.stringify({ error: "invoice_due_day deve estar entre 1 e 31" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tenantId = await resolveTenantId(adminClient, caller, requestedTenantId);
    if (!tenantId) {
      return new Response(JSON.stringify({ error: "Nenhum tenant disponível para vincular o usuário" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const generatedPassword = Math.floor(100000 + Math.random() * 900000).toString();
    const password: string = role === "student" ? generatedPassword : (body.password || generatedPassword);

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
      app_metadata: { tenant_id: tenantId },
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    const { error: tenantMemberError } = await adminClient
      .from("tenant_members")
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        role,
      });

    if (tenantMemberError) {
      await adminClient.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ error: tenantMemberError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profileUpdates: Record<string, unknown> = {
      ...(phone && { phone }),
      ...(cpf && { cpf }),
      ...(birth_date && { birth_date }),
      force_password_change: true,
    };

    if (Object.keys(profileUpdates).length > 0) {
      await adminClient
        .from("profiles")
        .update(profileUpdates)
        .eq("user_id", userId);
    }

    if (role === "admin") {
      await adminClient
        .from("user_roles")
        .update({ role: "admin" })
        .eq("user_id", userId);

      if (admin_role_id) {
        await adminClient
          .from("profiles")
          .update({ admin_role_id })
          .eq("user_id", userId);
      }

      await adminClient
        .from("student_profiles")
        .delete()
        .eq("user_id", userId);
    } else if (role === "teacher") {
      await adminClient
        .from("user_roles")
        .update({ role: "teacher" })
        .eq("user_id", userId);

      await adminClient
        .from("teacher_profiles")
        .insert({
          user_id: userId,
          rate_per_class: rate_per_class || 0,
          ...(pix_key && { pix_key }),
        });

      await adminClient
        .from("student_profiles")
        .delete()
        .eq("user_id", userId);
    } else {
      if (skill_level || plan_id || normalizedInvoiceDueDay !== null) {
        await adminClient
          .from("student_profiles")
          .update({
            ...(skill_level && { skill_level }),
            ...(plan_id && { plan_id }),
            ...(normalizedInvoiceDueDay !== null && { invoice_due_day: normalizedInvoiceDueDay }),
          })
          .eq("user_id", userId);
      }

      const { data: sp } = await adminClient
        .from("student_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (sp) {
        const classIdList: string[] = Array.isArray(class_ids) ? class_ids : [];
        if (classIdList.length > 0) {
          const enrollments = classIdList.map((class_id: string) => ({
            class_id,
            student_id: sp.id,
            status: "active",
          }));

          const { error: enrollError } = await adminClient.from("enrollments").insert(enrollments);
          if (enrollError) {
            console.error("Enrollment error:", enrollError);
          }
        }

        if (plan_id) {
          const now = new Date();
          const refMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

          const { error: invoiceError } = await adminClient.rpc("create_invoice_for_student", {
            p_student_id: sp.id,
            p_due_date: now.toISOString().split("T")[0],
            p_reference_month: refMonth,
          });

          if (invoiceError) {
            console.error("Invoice creation error:", invoiceError);
          }
        }
      }
    }

    if (role === "student" && phone) {
      try {
        const [{ data: tenantSettings }, { data: cfgRows }] = await Promise.all([
          adminClient
            .from("tenant_settings")
            .select("config")
            .eq("tenant_id", tenantId)
            .maybeSingle(),
          adminClient
            .from("system_config")
            .select("key, value")
            .in("key", ["app_url"]),
        ]);
        const cfgMap = Object.fromEntries((cfgRows || []).map((row: any) => [row.key, row.value || ""]));
        const tenantConfig =
          tenantSettings?.config && typeof tenantSettings.config === "object" && !Array.isArray(tenantSettings.config)
            ? tenantSettings.config
            : {};
        const appUrl =
          (typeof tenantConfig.app_url === "string" && tenantConfig.app_url) ||
          cfgMap["app_url"] ||
          supabaseUrl.replace("supabase.co", "vercel.app");

        const { data: tpl } = await adminClient
          .from("whatsapp_templates")
          .select("body")
          .eq("category", "welcome")
          .eq("name", "Novo Aluno")
          .eq("is_active", true)
          .maybeSingle();

        const messageBody = tpl?.body
          ? tpl.body
              .replace(/\{\{nome\}\}/g, full_name)
              .replace(/\{\{telefone\}\}/g, phone)
              .replace(/\{\{email\}\}/g, email)
              .replace(/\{\{senha\}\}/g, generatedPassword)
              .replace(/\{\{app_url\}\}/g, appUrl)
          : `Bem-vindo(a), ${full_name}!\n\nTelefone: ${phone}\nSenha temporária: ${generatedPassword}\n${appUrl}\n\nNo primeiro acesso você será solicitado(a) a criar uma nova senha.`;

        await callerClient.functions.invoke("send-whatsapp", {
          body: {
            recipients: [{ phone, name: full_name }],
            message_body: messageBody,
          },
        });
      } catch (error) {
        console.error("WhatsApp welcome error:", error);
      }
    }

    return new Response(JSON.stringify({
      user_id: userId,
      email,
      tenant_id: tenantId,
      generated_password: role === "student" ? generatedPassword : undefined,
    }), {
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
