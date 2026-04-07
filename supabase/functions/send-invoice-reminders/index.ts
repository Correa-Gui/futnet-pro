import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { interpolateVariables } from "../send-whatsapp/evolution.ts";
import {
  loadWhatsAppProviderConfig,
  sendButtonsViaWhatsAppProvider,
  sendViaWhatsAppProvider,
} from "../send-whatsapp/provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Metodo nao permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const daysBeforeDue: number = body.days_before_due ?? 3;
    const templateId: string | null = body.template_id ?? null;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysBeforeDue);
    const targetDateStr = targetDate.toISOString().split("T")[0];

    const { data: invoices, error: invoicesError } = await serviceClient
      .from("invoices")
      .select(`
        id,
        amount,
        due_date,
        reference_month,
        pix_copy_paste,
        student_id,
        profiles!inner(
          full_name,
          phone,
          status
        )
      `)
      .eq("status", "pending")
      .eq("due_date", targetDateStr)
      .eq("profiles.status", "active");

    if (invoicesError) throw invoicesError;

    if (!invoices || invoices.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, skipped: 0, failed: 0, message: "Nenhuma fatura encontrada para o criterio" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let templateBody: string | null = null;
    if (templateId) {
      const { data: template } = await serviceClient
        .from("whatsapp_templates")
        .select("body")
        .eq("id", templateId)
        .eq("is_active", true)
        .single();
      templateBody = template?.body ?? null;
    }

    // Load provider config and app_url in parallel
    const [providerConfig, configRows] = await Promise.all([
      loadWhatsAppProviderConfig(serviceClient),
      serviceClient
        .from("system_config")
        .select("key, value")
        .in("key", ["app_url", "company_name"]),
    ]);

    const configMap = Object.fromEntries(
      ((configRows.data ?? []) as { key: string; value: string }[]).map((r) => [r.key, r.value?.trim() ?? ""])
    );
    const appUrl = configMap.app_url ?? "";
    const companyName = configMap.company_name ?? "";

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const invoice of invoices) {
      const profile = invoice.profiles as any;

      if (!profile?.phone) {
        skipped++;
        continue;
      }

      const digitsOnly = profile.phone.replace(/\D/g, "");
      const phone = digitsOnly.startsWith("55") ? digitsOnly : `55${digitsOnly}`;

      const amountFormatted = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(invoice.amount));

      const [year, month, day] = (invoice.due_date as string).split("-");
      const dueDateFormatted = `${day}/${month}/${year}`;

      const refMonth = invoice.reference_month as string | null;
      let mesLabel = "";
      if (refMonth) {
        const [y, m] = refMonth.split("-");
        const monthNames = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
        mesLabel = `${monthNames[parseInt(m, 10) - 1]}/${y}`;
      }

      const pixCode = invoice.pix_copy_paste as string | null;

      const vars: Record<string, string> = {
        nome: profile.full_name ?? "",
        valor: amountFormatted,
        data_vencimento: dueDateFormatted,
        mes: mesLabel,
        pix_copy_paste: pixCode ?? "",
        app_url: appUrl,
      };

      const defaultMessage =
        `Ola, {{nome}}! Sua fatura de {{valor}} vence em {{data_vencimento}}.` +
        (pixCode ? ` Para pagar via PIX, copie o codigo: {{pix_copy_paste}}` : "");

      const rawMessage = templateBody ?? defaultMessage;
      const messageBody = interpolateVariables(rawMessage, vars);

      try {
        let response: Response;
        let responseJson: unknown;

        if (pixCode) {
          // Send interactive message: PIX code in body + URL button to invoice
          const invoiceUrl = appUrl ? `${appUrl}/invoices/${invoice.id}` : "";

          const pixBody = pixCode
            ? `${messageBody}\n\nCódigo PIX Copia e Cola:\n${pixCode}`
            : messageBody;

          const buttons: { type: "url" | "reply"; displayText: string; url?: string; id?: string }[] = [];

          if (invoiceUrl) {
            buttons.push({ type: "url", displayText: "Ver Fatura", url: invoiceUrl });
          }

          if (buttons.length > 0) {
            ({ response, responseJson } = await sendButtonsViaWhatsAppProvider(providerConfig, {
              number: phone,
              title: "Lembrete de Pagamento 💳",
              description: pixBody,
              ...(companyName && { footer: companyName }),
              buttons,
            }));
          } else {
            // No app_url configured — fall back to plain text
            ({ response, responseJson } = await sendViaWhatsAppProvider(providerConfig, {
              number: phone,
              text: pixBody,
            }));
          }
        } else {
          // No PIX code — send plain text
          ({ response, responseJson } = await sendViaWhatsAppProvider(providerConfig, {
            number: phone,
            text: messageBody,
          }));
        }

        const typedResponse = responseJson as Record<string, unknown> | null;
        const messageId =
          (typedResponse?.message_id as string | undefined) ||
          (typedResponse?.id as string | undefined) ||
          null;
        const errorMessage =
          (typedResponse?.message as string | undefined) ||
          (typedResponse?.error as string | undefined) ||
          `HTTP ${response.status}`;

        await serviceClient.from("whatsapp_messages").insert({
          template_id: templateId,
          recipient_phone: phone,
          recipient_name: profile.full_name,
          student_id: invoice.student_id,
          message_body: messageBody,
          status: response.ok ? "sent" : "failed",
          whatsapp_message_id: response.ok ? messageId : null,
          error_message: response.ok ? null : errorMessage,
          sent_at: new Date().toISOString(),
        });

        if (response.ok) {
          sent++;
        } else {
          failed++;
        }
      } catch (err) {
        failed++;
        await serviceClient.from("whatsapp_messages").insert({
          template_id: templateId,
          recipient_phone: phone,
          recipient_name: profile.full_name,
          student_id: invoice.student_id,
          message_body: messageBody,
          status: "failed",
          error_message: err instanceof Error ? err.message : "Unknown error",
          sent_at: new Date().toISOString(),
        });
      }
    }

    return new Response(JSON.stringify({ sent, skipped, failed }), {
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
