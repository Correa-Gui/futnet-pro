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

    const body = await req.json();
    const { invoice_id, booking_id } = body;

    if (!invoice_id && !booking_id) {
      throw new Error("invoice_id ou booking_id é obrigatório");
    }

    // --- Booking PIX mode ---
    if (booking_id) {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Verify admin role
      const { data: roleRow } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();
      if (!roleRow || roleRow.role !== "admin") {
        return new Response(JSON.stringify({ error: "Acesso negado" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: booking, error: bookingError } = await adminClient
        .from("court_bookings")
        .select("id, price, status, requester_name, requester_phone, date, payment_id")
        .eq("id", booking_id)
        .single();

      if (bookingError || !booking) {
        throw new Error("Reserva não encontrada");
      }
      if (booking.status === "paid") {
        throw new Error("Esta reserva já foi paga");
      }

      // Load deposit percentage from system_config
      const { data: configRow } = await adminClient
        .from("system_config")
        .select("value")
        .eq("key", "reservation_deposit_percentage")
        .maybeSingle();
      const depositPct = parseFloat((configRow as any)?.value || "30");
      const depositAmount = Math.max(0.01, Number(booking.price) * depositPct / 100);

      // Reuse existing payment if still valid
      if (booking.payment_id) {
        const checkRes = await fetch(
          `https://api.mercadopago.com/v1/payments/${booking.payment_id}`,
          { headers: { Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` } }
        );
        const checkData = await checkRes.json();
        if (checkRes.ok && checkData.status === "pending" && checkData.point_of_interaction?.transaction_data) {
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
        }
        await adminClient.from("court_bookings").update({ payment_id: null }).eq("id", booking_id);
      }

      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `booking-${booking_id}-${Date.now()}`,
        },
        body: JSON.stringify({
          transaction_amount: depositAmount,
          description: `Reserva de quadra ${booking.date}`,
          payment_method_id: "pix",
          date_of_expiration: expiresAt,
          external_reference: booking_id,
          notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
          payer: {
            email: "reserva@arena.com",
            first_name: booking.requester_name?.split(" ")[0] || "Cliente",
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

      await adminClient
        .from("court_bookings")
        .update({ payment_id: String(mpData.id) })
        .eq("id", booking_id);

      return new Response(
        JSON.stringify({
          qr_code: qrCode,
          qr_code_base64: qrCodeBase64,
          payment_id: mpData.id,
          expires_at: mpData.date_of_expiration || expiresAt,
          deposit_amount: depositAmount,
          deposit_percentage: depositPct,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Invoice PIX mode (existing logic) ---
    if (!invoice_id) throw new Error("invoice_id é obrigatório");

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
        // Payment expired or not pending — clear old payment data
      }

      // Clean up old payment data so a fresh PIX is generated
      const adminSupabaseClean = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await adminSupabaseClean
        .from("invoices")
        .update({ payment_id: null, pix_copy_paste: null, pix_qr_code: null })
        .eq("id", invoice_id);
    }

    const finalAmount = Number(invoice.amount) - Number(invoice.discount || 0);

    // Fetch user email for payer info
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", userId)
      .single();

    // Create PIX payment via Mercado Pago with 5-minute expiration
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
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
        external_reference: invoice_id,
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
