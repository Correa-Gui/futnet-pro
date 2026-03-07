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
      email, password, full_name, phone, cpf, birth_date,
      role, rate_per_class, skill_level, plan_id,
      class_ids,
    } = body;

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: email, password, full_name, role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!["teacher", "student"].includes(role)) {
      return new Response(JSON.stringify({ error: "Role deve ser 'teacher' ou 'student'" }), {
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
    if (phone || cpf || birth_date) {
      await adminClient
        .from("profiles")
        .update({
          ...(phone && { phone }),
          ...(cpf && { cpf }),
          ...(birth_date && { birth_date }),
        })
        .eq("user_id", userId);
    }

    // Update role (trigger already created student role, so update it)
    if (role === "teacher") {
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

    return new Response(JSON.stringify({ user_id: userId, email }), {
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
