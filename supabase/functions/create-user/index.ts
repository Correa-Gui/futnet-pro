import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    const { email, password, full_name, phone, cpf, birth_date, role, rate_per_class, skill_level, plan_id } = body;

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
    }

    return new Response(JSON.stringify({ user_id: userId, email }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
