import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

/**
 * Webhook receptor de eventos da Evolution API.
 *
 * Este endpoint é configurado na Evolution API como destino de webhook.
 * Recebe mensagens dos usuários, extrai o texto e número, e está pronto
 * para ser integrado com um LLM/IA para processamento de intenções.
 *
 * Eventos suportados: messages.upsert
 *
 * Segurança: valida header x-webhook-secret contra WHATSAPP_WEBHOOK_SECRET env var.
 *
 * Fluxo de integração com IA:
 * 1. Evolution API envia evento para este webhook
 * 2. Este handler extrai número e mensagem
 * 3. Chama a IA (via HTTP) com contexto da mensagem
 * 4. IA retorna intent + parâmetros + texto de resposta
 * 5. Handler executa ação (reserva, consulta, etc.) e envia resposta via send-whatsapp
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
    // Valida secret do webhook (opcional mas recomendado)
    const webhookSecret = Deno.env.get("WHATSAPP_WEBHOOK_SECRET");
    if (webhookSecret) {
      const receivedSecret = req.headers.get("x-webhook-secret");
      if (receivedSecret !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = await req.json();

    // Ignora eventos que não sejam mensagens recebidas
    const event = payload?.event;
    if (event !== "messages.upsert") {
      return new Response(JSON.stringify({ status: "ignored", event }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageData = payload?.data;
    const remoteJid: string = messageData?.key?.remoteJid ?? "";
    const fromMe: boolean = messageData?.key?.fromMe ?? false;

    // Ignora mensagens enviadas pelo próprio bot
    if (fromMe) {
      return new Response(JSON.stringify({ status: "ignored", reason: "fromMe" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extrai número de telefone limpo (remove @s.whatsapp.net ou @g.us)
    const phone = remoteJid.replace(/@.*$/, "");

    // Extrai texto da mensagem (suporte a texto simples e extended)
    const messageText: string =
      messageData?.message?.conversation ||
      messageData?.message?.extendedTextMessage?.text ||
      "";

    if (!messageText.trim()) {
      return new Response(JSON.stringify({ status: "ignored", reason: "no_text" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Registra a mensagem recebida no banco para auditoria
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await serviceClient.from("whatsapp_messages").insert({
      recipient_phone: phone,
      message_body: messageText,
      status: "sent", // mensagem recebida do usuário
      sent_at: new Date().toISOString(),
    });

    // ──────────────────────────────────────────────────────────────────────────
    // PONTO DE INTEGRAÇÃO COM IA
    //
    // Aqui você deve conectar seu LLM/agente de IA. Exemplo de integração:
    //
    // const aiResponse = await fetch(Deno.env.get("AI_AGENT_URL")!, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json", "Authorization": `Bearer ${Deno.env.get("AI_AGENT_KEY")}` },
    //   body: JSON.stringify({ phone, message: messageText }),
    // });
    // const { intent, response_text, params } = await aiResponse.json();
    //
    // switch (intent) {
    //   case "BOOK_COURT":
    //     // Chamar court-availability para verificar disponibilidade
    //     // Confirmar com o usuário antes de reservar
    //     break;
    //   case "CHECK_AVAILABILITY":
    //     // Chamar GET court-availability e montar resposta
    //     break;
    //   case "GENERAL":
    //     // Apenas enviar response_text
    //     break;
    // }
    //
    // Para enviar resposta, use a Edge Function send-whatsapp:
    // await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-whatsapp`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json", "apikey": Deno.env.get("SUPABASE_ANON_KEY")! },
    //   body: JSON.stringify({
    //     recipients: [{ phone }],
    //     message_body: response_text,
    //   }),
    // });
    // ──────────────────────────────────────────────────────────────────────────

    return new Response(
      JSON.stringify({ status: "processed", phone, message_length: messageText.length }),
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
