import { describe, expect, it } from "vitest";
import {
  buildEvolutionTextEndpoint,
  normalizeRecipientPhone,
  parseSendWhatsAppPayload,
  resolveMessageBody,
} from "../../supabase/functions/send-whatsapp/evolution";

describe("Evolution WhatsApp helpers", () => {
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

  it("monta endpoint sem barra duplicada", () => {
    expect(buildEvolutionTextEndpoint("https://evolution.api/", "minha-instancia")).toBe(
      "https://evolution.api/message/sendText/minha-instancia"
    );
  });

  it("resolve corpo da mensagem com fallback para template", () => {
    expect(resolveMessageBody({ recipients: [{ phone: "11999998888" }], template_name: "template_1" })).toBe(
      "[Template: template_1]"
    );
  });
});
