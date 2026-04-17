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
    // Verify the calling user is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin using their token
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    // Pass token explicitly — Deno has no localStorage so getUser() without args returns null
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser(token);
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
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
      full_name, phone, cpf, birth_date,
      role, rate_per_class, pix_key, skill_level, plan_id, invoice_due_day,
      class_ids, admin_role_id,
    } = body;

    // For students, email is optional — derive it from phone if not provided
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

    // For students, always generate a random 6-digit password so the admin never sets one manually.
    // For admin/teacher, a password may be passed in; fall back to a random one.
    const generatedPassword = Math.floor(100000 + Math.random() * 900000).toString();
    const password: string = (role === "student") ? generatedPassword : (body.password || generatedPassword);

    if (!["admin", "teacher", "student"].includes(role)) {
      return new Response(JSON.stringify({ error: "Role deve ser 'admin', 'teacher' ou 'student'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (normalizedInvoiceDueDay !== null && (!Number.isInteger(normalizedInvoiceDueDay) || normalizedInvoiceDueDay < 1 || normalizedInvoiceDueDay > 31)) {
      return new Response(JSON.stringify({ error: "invoice_due_day deve estar entre 1 e 31" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;

    // Update profile with extra fields
    // Students must change password on first login
    const profileUpdates: Record<string, any> = {
      ...(phone && { phone }),
      ...(cpf && { cpf }),
      ...(birth_date && { birth_date }),
      ...(role === "student" && { force_password_change: true }),
    };
    if (Object.keys(profileUpdates).length > 0) {
      await adminClient
        .from("profiles")
        .update(profileUpdates)
        .eq("user_id", userId);
    }

    // Update role (trigger already created student role, so update it)
    if (role === "admin") {
      await adminClient
        .from("user_roles")
        .update({ role: "admin" })
        .eq("user_id", userId);

      // Set admin_role_id if provided
      if (admin_role_id) {
        await adminClient
          .from("profiles")
          .update({ admin_role_id })
          .eq("user_id", userId);
      }

      // Delete the auto-created student profile
      await adminClient
        .from("student_profiles")
        .delete()
        .eq("user_id", userId);
    } else if (role === "teacher") {
      await adminClient
        .from("user_roles")
        .update({ role: "teacher" })
        .eq("user_id", userId);

      // Create teacher profile
      await adminClient
        .from("teacher_profiles")
        .insert({
          user_id: userId,
          rate_per_class: rate_per_class || 0,
          ...(pix_key && { pix_key }),
        });

      // Delete the auto-created student profile
      await adminClient
        .from("student_profiles")
        .delete()
        .eq("user_id", userId);
    } else if (role === "student") {
      // Update student profile with skill_level, plan and billing preferences
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

      // Get student profile id for enrollments and invoices
      const { data: sp } = await adminClient
        .from("student_profiles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (sp) {
        // Enroll in selected classes
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

        // Auto-generate first invoice if student has a plan
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

    // Send WhatsApp welcome message with temporary password if student has phone
    if (role === "student" && phone) {
      try {
        const { data: cfgRows } = await adminClient
          .from("system_config")
          .select("key, value")
          .in("key", ["app_url"]);
        const cfgMap = Object.fromEntries((cfgRows || []).map((r: any) => [r.key, r.value || ""]));
        const appUrl = cfgMap["app_url"] || supabaseUrl.replace("supabase.co", "vercel.app");

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
              .replace(/\{\{email\}\}/g, email!)
              .replace(/\{\{senha\}\}/g, generatedPassword)
              .replace(/\{\{app_url\}\}/g, appUrl)
          : `Bem-vindo(a), ${full_name}!\n\n📱 Telefone: ${phone}\n🔑 Senha temporária: ${generatedPassword}\n👉 ${appUrl}\n\nNo primeiro acesso você será solicitado(a) a criar uma nova senha.`;

        await callerClient.functions.invoke("send-whatsapp", {
          body: {
            recipients: [{ phone, name: full_name }],
            message_body: messageBody,
          },
        });
      } catch (e) {
        console.error("WhatsApp welcome error:", e);
      }
    }

    return new Response(JSON.stringify({ user_id: userId, email, generated_password: role === "student" ? generatedPassword : undefined }), {
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
