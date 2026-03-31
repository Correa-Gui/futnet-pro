import { describe, expect, it } from "vitest";
import {
  normalizeRecipientPhone,
  parseSendWhatsAppPayload,
  resolveMessageBody,
} from "../../supabase/functions/send-whatsapp/evolution";
import { buildMessagesSendEndpoint } from "../../supabase/functions/send-whatsapp/provider";

describe("WhatsApp helpers", () => {
  it("normaliza telefone brasileiro sem DDI", () => {
    expect(normalizeRecipientPhone("(11) 98888-7777")).toBe("5511988887777");
  });

  it("mantém número internacional já completo", () => {
    expect(normalizeRecipientPhone("+351912345678")).toBe("351912345678");
  });

  it("valida payload com recipients", () => {
    const payload = parseSendWhatsAppPayload({
      recipients: [{ phone: "11999998888", name: "Aluno" }],
      message_body: "Olá",
    });

    expect(payload.recipients).toHaveLength(1);
    expect(payload.message_body).toBe("Olá");
  });

  it("falha quando recipients está ausente", () => {
    expect(() => parseSendWhatsAppPayload({ message_body: "Olá" })).toThrow("recipients is required");
  });

  it("monta endpoint do servico sem barra duplicada", () => {
    expect(buildMessagesSendEndpoint("https://api.exemplo.com/")).toBe(
      "https://api.exemplo.com/messages/send"
    );
  });

  it("resolve corpo da mensagem com fallback para template", () => {
    expect(resolveMessageBody({ recipients: [{ phone: "11999998888" }], template_name: "template_1" })).toBe(
      "[Template: template_1]"
    );
  });
});
