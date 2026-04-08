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
      email, full_name, phone, cpf, birth_date,
      role, rate_per_class, skill_level, plan_id,
      class_ids, admin_role_id,
    } = body;

    if (!email || !full_name || !role) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: email, full_name, role" }), {
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
        });

      // Delete the auto-created student profile
      await adminClient
        .from("student_profiles")
        .delete()
        .eq("user_id", userId);
    } else if (role === "student") {
      // Update student profile with skill_level and plan
      if (skill_level || plan_id) {
        await adminClient
          .from("student_profiles")
          .update({
            ...(skill_level && { skill_level }),
            ...(plan_id && { plan_id }),
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
          const { data: planData } = await adminClient
            .from("plans")
            .select("monthly_price, name")
            .eq("id", plan_id)
            .single();

          if (planData) {
            // Check for duplicate invoice (same student + month with active status)
            const now = new Date();
            const refMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
            const dueDate = new Date(now);
            dueDate.setDate(dueDate.getDate() + 30);

            const { data: existing } = await adminClient
              .from("invoices")
              .select("id")
              .eq("student_id", sp.id)
              .eq("reference_month", refMonth)
              .in("status", ["pending", "paid", "overdue"])
              .maybeSingle();

            if (!existing) {
              const { error: invoiceError } = await adminClient.from("invoices").insert({
                student_id: sp.id,
                amount: planData.monthly_price,
                discount: 0,
                due_date: dueDate.toISOString().split("T")[0],
                reference_month: refMonth,
                status: "pending",
              });
              if (invoiceError) {
                console.error("Invoice creation error:", invoiceError);
              }
            }
          }
        }
      }
    }

    // Send WhatsApp welcome message with temporary password if student has phone
    if (role === "student" && phone) {
      try {
        const { data: cfg } = await adminClient
          .from("system_config")
          .select("key, value")
          .in("key", ["app_url"])
          .maybeSingle();
        const appUrl = (cfg as any)?.value || supabaseUrl.replace("supabase.co", "vercel.app");

        const { data: tpl } = await adminClient
          .from("whatsapp_templates")
          .select("body")
          .eq("category", "welcome")
          .eq("name", "Novo Aluno")
          .eq("is_active", true)
          .maybeSingle();

        const body = tpl?.body
          ? tpl.body
              .replace(/\{\{nome\}\}/g, full_name)
              .replace(/\{\{email\}\}/g, email)
              .replace(/\{\{senha\}\}/g, generatedPassword)
              .replace(/\{\{app_url\}\}/g, appUrl)
          : `Bem-vindo(a), ${full_name}!\n\nE-mail: ${email}\nSenha temporária: ${generatedPassword}\nAcesse: ${appUrl}`;

        await adminClient.functions.invoke("send-whatsapp", {
          body: { recipients: [{ phone, name: full_name }], message_body: body },
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
