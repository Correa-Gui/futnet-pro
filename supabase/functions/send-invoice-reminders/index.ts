import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { interpolateVariables } from "../send-whatsapp/evolution.ts";
import {
  loadWhatsAppProviderConfig,
  sendTemplateViaWhatsAppProvider,
  sendViaWhatsAppProvider,
  type TemplateComponent,
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
    let metaTemplateName: string | null = null;
    let metaTemplateLanguage = "pt_BR";

    if (templateId) {
      const { data: template } = await serviceClient
        .from("whatsapp_templates")
        .select("body, meta_template_name, meta_template_language")
        .eq("id", templateId)
        .eq("is_active", true)
        .single();
      templateBody = template?.body ?? null;
      metaTemplateName = template?.meta_template_name ?? null;
      metaTemplateLanguage = template?.meta_template_language ?? "pt_BR";
    }

    const providerConfig = await loadWhatsAppProviderConfig(serviceClient);

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const invoice of invoices) {
      const profile = invoice.profiles as any;

      if (!profile?.phone) {
        skipped++;
        continue;
      }

      const amountFormatted = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(invoice.amount));

      const [year, month, day] = (invoice.due_date as string).split("-");
      const dueDateFormatted = `${day}/${month}/${year}`;

      const digitsOnly = profile.phone.replace(/\D/g, "");
      const phone = digitsOnly.startsWith("55") ? digitsOnly : `55${digitsOnly}`;

      // Format reference_month (YYYY-MM) to "Mês/YYYY" label
      const refMonth = invoice.reference_month as string | null;
      let mesLabel = "";
      if (refMonth) {
        const [y, m] = refMonth.split("-");
        const monthNames = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
        mesLabel = `${monthNames[parseInt(m, 10) - 1]}/${y}`;
      }

      // Build a human-readable message body for logging (used in both paths)
      const vars: Record<string, string> = {
        nome: profile.full_name ?? "",
        valor: amountFormatted,
        data_vencimento: dueDateFormatted,
        mes: mesLabel,
        pix_copy_paste: invoice.pix_copy_paste ?? "",
      };
      const defaultMessage =
        `Ola, {{nome}}! Sua fatura de {{valor}} vence em {{data_vencimento}}. ` +
        `Para pagar via PIX, copie o codigo: {{pix_copy_paste}}`;
      const rawMessage = templateBody ?? defaultMessage;
      const messageBody = interpolateVariables(rawMessage, vars);

      try {
        let response: Response;
        let responseJson: unknown;

        if (metaTemplateName && invoice.pix_copy_paste) {
          // Send via Evolution API template endpoint (buttons: copy_code + url)
          const components: TemplateComponent[] = [
            {
              type: "body",
              parameters: [
                { type: "text", text: profile.full_name ?? "" },
                { type: "text", text: mesLabel },
                { type: "text", text: amountFormatted },
                { type: "text", text: dueDateFormatted },
              ],
            },
            {
              type: "button",
              sub_type: "copy_code",
              index: "0",
              parameters: [{ type: "coupon_code", coupon_code: invoice.pix_copy_paste as string }],
            },
            {
              type: "button",
              sub_type: "url",
              index: "1",
              parameters: [{ type: "text", text: invoice.id as string }],
            },
          ];

          ({ response, responseJson } = await sendTemplateViaWhatsAppProvider(providerConfig, {
            number: phone,
            name: metaTemplateName,
            language: metaTemplateLanguage,
            components,
          }));
        } else {
          // Fallback: plain text message
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
