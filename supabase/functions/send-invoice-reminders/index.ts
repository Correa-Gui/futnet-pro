import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { interpolateVariables } from "../send-whatsapp/evolution.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Envia lembretes de cobrança por WhatsApp para alunos ativos com faturas pendentes.
 *
 * Regras de negócio:
 * - Apenas alunos com profiles.status = 'active'
 * - Apenas faturas com status = 'pending'
 * - Vencimento em exatamente CURRENT_DATE + days_before_due dias
 * - Requer template_id com variáveis: {{nome}}, {{valor}}, {{data_vencimento}}, {{pix_copy_paste}}
 *
 * Auth: service role key (chamada interna / cron job)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
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

    // Calcula a data-alvo de vencimento
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysBeforeDue);
    const targetDateStr = targetDate.toISOString().split("T")[0];

    // Busca faturas pendentes com vencimento na data-alvo
    const { data: invoices, error: invoicesError } = await serviceClient
      .from("invoices")
      .select(`
        id,
        amount,
        due_date,
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
        JSON.stringify({ sent: 0, skipped: 0, failed: 0, message: "Nenhuma fatura encontrada para o critério" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Busca corpo do template se fornecido
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

    const evolutionApiUrl = Deno.env.get("EVOLUTION_API_URL");
    const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
    const evolutionInstance =
      Deno.env.get("EVOLUTION_INSTANCE_NAME") || Deno.env.get("EVOLUTION_INSTANCE");

    if (!evolutionApiUrl || !evolutionApiKey || !evolutionInstance) {
      throw new Error("Configuração da Evolution API incompleta");
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const invoice of invoices) {
      const profile = invoice.profiles as any;

      if (!profile?.phone) {
        skipped++;
        continue;
      }

      // Formata valor para exibição
      const valorFormatado = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(Number(invoice.amount));

      // Formata data de vencimento
      const [year, month, day] = (invoice.due_date as string).split("-");
      const dataFormatada = `${day}/${month}/${year}`;

      const vars: Record<string, string> = {
        nome: profile.full_name ?? "",
        valor: valorFormatado,
        data_vencimento: dataFormatada,
        pix_copy_paste: invoice.pix_copy_paste ?? "Consulte o app",
      };

      const defaultMessage =
        `Olá, {{nome}}! Sua fatura de {{valor}} vence em {{data_vencimento}}. ` +
        `Para pagar via PIX, copie o código: {{pix_copy_paste}}`;

      const rawMessage = templateBody ?? defaultMessage;
      const messageBody = interpolateVariables(rawMessage, vars);

      // Normaliza telefone
      const digitsOnly = profile.phone.replace(/\D/g, "");
      const phone = digitsOnly.startsWith("55") ? digitsOnly : `55${digitsOnly}`;

      try {
        const response = await fetch(
          `${evolutionApiUrl.replace(/\/$/, "")}/message/sendText/${evolutionInstance}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: evolutionApiKey,
            },
            body: JSON.stringify({ number: phone, text: messageBody }),
          }
        );

        const responseJson = await response.json();
        const messageId = responseJson?.key?.id || responseJson?.id || null;

        await serviceClient.from("whatsapp_messages").insert({
          template_id: templateId,
          recipient_phone: phone,
          recipient_name: profile.full_name,
          student_id: invoice.student_id,
          message_body: messageBody,
          status: response.ok ? "sent" : "failed",
          whatsapp_message_id: response.ok ? messageId : null,
          error_message: response.ok
            ? null
            : responseJson?.response?.message || `HTTP ${response.status}`,
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

    return new Response(
      JSON.stringify({ sent, skipped, failed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
