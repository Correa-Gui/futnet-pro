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

    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    // Mercado Pago sends different event types
    if (body.type !== "payment" && body.action !== "payment.updated") {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify payment status with Mercado Pago
    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}` } }
    );

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      console.error("MP verification failed:", JSON.stringify(mpData));
      throw new Error("Falha ao verificar pagamento");
    }

    console.log("Payment status:", mpData.status, "ID:", paymentId);

    if (mpData.status === "approved") {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: invoice, error: findError } = await supabase
        .from("invoices")
        .select("id")
        .eq("payment_id", String(paymentId))
        .single();

      if (findError || !invoice) {
        console.error("Invoice not found for payment_id:", paymentId);
        return new Response(JSON.stringify({ received: true, note: "invoice not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", invoice.id);

      if (updateError) {
        console.error("Update error:", updateError);
        throw new Error("Falha ao atualizar fatura");
      }

      console.log("Invoice", invoice.id, "marked as paid");
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
