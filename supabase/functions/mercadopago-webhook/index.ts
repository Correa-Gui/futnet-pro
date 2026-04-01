import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function verifyWebhookSignature(
  req: Request,
  body: string,
  webhookSecret: string
): boolean {
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  if (!xSignature || !xRequestId) {
    console.warn("Missing x-signature or x-request-id headers");
    return false;
  }

  // Parse x-signature: "ts=...,v1=..."
  const parts: Record<string, string> = {};
  for (const part of xSignature.split(",")) {
    const [key, ...rest] = part.split("=");
    parts[key.trim()] = rest.join("=").trim();
  }

  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) {
    console.warn("x-signature missing ts or v1");
    return false;
  }

  // Extract data.id from query string (MercadoPago sends it as ?data.id=xxx)
  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id") || "";

  // Build the manifest string as documented by MercadoPago
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  const hmac = createHmac("sha256", webhookSecret);
  hmac.update(manifest);
  const generatedHash = hmac.digest("hex");

  const isValid = generatedHash === v1;
  if (!isValid) {
    console.warn("Signature mismatch", { expected: v1, got: generatedHash });
  }
  return isValid;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!MERCADOPAGO_ACCESS_TOKEN) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");
    }

    const MERCADOPAGO_WEBHOOK_SECRET = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");

    const rawBody = await req.text();

    // Validate webhook signature if secret is configured
    if (MERCADOPAGO_WEBHOOK_SECRET) {
      const isValid = verifyWebhookSignature(req, rawBody, MERCADOPAGO_WEBHOOK_SECRET);
      if (!isValid) {
        console.error("Invalid webhook signature — possible forgery attempt");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.warn("MERCADOPAGO_WEBHOOK_SECRET not set — skipping signature validation. This is insecure!");
    }

    const body = JSON.parse(rawBody);
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
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Try invoice first
      const { data: invoice } = await adminClient
        .from("invoices")
        .select("id")
        .eq("payment_id", String(paymentId))
        .maybeSingle();

      if (invoice) {
        const { error: updateError } = await adminClient
          .from("invoices")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", invoice.id);
        if (updateError) {
          console.error("Invoice update error:", updateError);
          throw new Error("Falha ao atualizar fatura");
        }
        console.log("Invoice", invoice.id, "marked as paid");
      } else {
        // Try court_bookings
        const { data: booking } = await adminClient
          .from("court_bookings")
          .select("id, requester_name, requester_phone, date, start_time, end_time")
          .eq("payment_id", String(paymentId))
          .maybeSingle();

        if (booking) {
          await adminClient
            .from("court_bookings")
            .update({ status: "paid" })
            .eq("id", booking.id);
          console.log("Booking", booking.id, "marked as paid");

          // Send WhatsApp confirmation inline (avoids auth issue calling send-whatsapp with service role)
          try {
            const { data: configs } = await adminClient
              .from("system_config")
              .select("key, value")
              .in("key", ["whatsapp_service_base_url", "whatsapp_instance_name"]);
            const configMap = Object.fromEntries((configs || []).map((c: any) => [c.key, c.value]));
            const baseUrl = configMap["whatsapp_service_base_url"];
            const instanceName = configMap["whatsapp_instance_name"];

            if (baseUrl && booking.requester_phone) {
              const msg = `Olá ${booking.requester_name}! ✅ Sua reserva foi confirmada e o pagamento recebido!\n📅 ${booking.date}\n🕐 ${booking.start_time} às ${booking.end_time}\n\nObrigado! Até lá! 🏐`;
              const cleanPhone = booking.requester_phone.replace(/\D/g, "");
              const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
              await fetch(`${baseUrl}/messages/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ number: fullPhone, text: msg, instance_name: instanceName }),
              });
            }
          } catch (waErr) {
            console.error("WhatsApp send failed:", waErr);
          }
        } else {
          console.warn("No invoice or booking found for payment_id:", paymentId);
        }
      }
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
