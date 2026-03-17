export interface WhatsAppRecipient {
  phone: string;
  name?: string;
  student_id?: string;
}

export interface SendWhatsAppRequestPayload {
  recipients: WhatsAppRecipient[];
  message_body?: string;
  template_id?: string | null;
  template_name?: string;
  template_language?: string;
}

/**
 * Normaliza números de telefone para o formato internacional esperado pela Evolution API.
 */
export function normalizeRecipientPhone(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, "");

  if (!digitsOnly) {
    return "";
  }

  if (digitsOnly.startsWith("55") && digitsOnly.length >= 12) {
    return digitsOnly;
  }


  if (digitsOnly.length >= 12) {
    return digitsOnly;
  }

  return `55${digitsOnly}`;
}

/**
 * Valida payload de envio recebido na função edge e retorna um objeto tipado.
 */
export function parseSendWhatsAppPayload(payload: unknown): SendWhatsAppRequestPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload");
  }

  const typedPayload = payload as Record<string, unknown>;
  const recipients = typedPayload.recipients;

  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error("recipients is required");
  }

  const parsedRecipients: WhatsAppRecipient[] = recipients.map((recipient, index) => {
    if (!recipient || typeof recipient !== "object") {
      throw new Error(`recipient at index ${index} is invalid`);
    }

    const typedRecipient = recipient as Record<string, unknown>;
    if (typeof typedRecipient.phone !== "string" || typedRecipient.phone.trim() === "") {
      throw new Error(`recipient phone at index ${index} is required`);
    }

    return {
      phone: typedRecipient.phone,
      name: typeof typedRecipient.name === "string" ? typedRecipient.name : undefined,
      student_id: typeof typedRecipient.student_id === "string" ? typedRecipient.student_id : undefined,
    };
  });

  return {
    recipients: parsedRecipients,
    message_body: typeof typedPayload.message_body === "string" ? typedPayload.message_body : undefined,
    template_id: typeof typedPayload.template_id === "string" ? typedPayload.template_id : null,
    template_name: typeof typedPayload.template_name === "string" ? typedPayload.template_name : undefined,
    template_language:
      typeof typedPayload.template_language === "string" ? typedPayload.template_language : undefined,
  };
}

/**
 * Monta endpoint de envio de texto da Evolution API.
 */
export function buildEvolutionTextEndpoint(baseUrl: string, instanceName: string): string {
  return `${baseUrl.replace(/\/$/, "")}/message/sendText/${instanceName}`;
}

/**
 * Resolve o corpo final da mensagem com base no modo de envio.
 */
export function resolveMessageBody(input: SendWhatsAppRequestPayload): string {
  if (input.template_name) {
    return input.message_body?.trim() || `[Template: ${input.template_name}]`;
  }

  return input.message_body?.trim() || "";
}
