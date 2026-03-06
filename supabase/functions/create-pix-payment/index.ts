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
    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
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
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const { invoice_id } = await req.json();
    if (!invoice_id) {
      throw new Error("invoice_id é obrigatório");
    }

    // Fetch the invoice and verify it belongs to the user
    const { data: invoice, error: invError } = await supabase
      .from("invoices")
      .select("*, student_profiles!inner(user_id)")
      .eq("id", invoice_id)
      .single();

    if (invError || !invoice) {
      throw new Error("Fatura não encontrada");
    }

    if (invoice.student_profiles.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invoice.status !== "pending" && invoice.status !== "overdue") {
      throw new Error("Esta fatura não está pendente de pagamento");
    }

    // If already has a payment_id, check its status first
    if (invoice.payment_id) {
      const checkRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${invoice.payment_id}`,
        { headers: { Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` } }
      );
      const checkData = await checkRes.json();
      if (checkRes.ok && checkData.status === "pending" && checkData.point_of_interaction?.transaction_data) {
        // Check if payment is not expired
        const expirationDate = checkData.date_of_expiration ? new Date(checkData.date_of_expiration) : null;
        if (expirationDate && expirationDate > new Date()) {
          return new Response(
            JSON.stringify({
              qr_code: checkData.point_of_interaction.transaction_data.qr_code,
              qr_code_base64: checkData.point_of_interaction.transaction_data.qr_code_base64,
              payment_id: checkData.id,
              expires_at: checkData.date_of_expiration,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        // Payment expired, will create a new one below
      }
    }

    const finalAmount = Number(invoice.amount) - Number(invoice.discount || 0);

    // Fetch user email for payer info
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", userId)
      .single();

    // Create PIX payment via Mercado Pago with 5-minute expiration
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `invoice-${invoice_id}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: finalAmount,
        description: `Fatura ${invoice.reference_month}`,
        payment_method_id: "pix",
        date_of_expiration: expiresAt,
        notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
        payer: {
          email: profile?.email || "aluno@email.com",
          first_name: profile?.full_name?.split(" ")[0] || "Aluno",
        },
      }),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error("Mercado Pago error:", JSON.stringify(mpData));
      throw new Error(`Erro ao gerar PIX: ${mpData.message || mpRes.status}`);
    }

    const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64;

    // Update invoice with payment info using service role
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await adminSupabase
      .from("invoices")
      .update({
        payment_id: String(mpData.id),
        pix_copy_paste: qrCode,
        pix_qr_code: qrCodeBase64,
      })
      .eq("id", invoice_id);

    return new Response(
      JSON.stringify({
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64,
        payment_id: mpData.id,
        expires_at: mpData.date_of_expiration || expiresAt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
