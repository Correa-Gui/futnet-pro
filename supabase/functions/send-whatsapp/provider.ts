export interface WhatsAppProviderConfig {
  baseUrl: string;
  instanceName: string;
}

export interface TemplateParameter {
  type: "text" | "coupon_code";
  text?: string;
  coupon_code?: string;
}

export interface TemplateComponent {
  type: "body" | "button";
  sub_type?: "copy_code" | "url";
  index?: string;
  parameters: TemplateParameter[];
}

export interface SendTemplatePayload {
  number: string;
  name: string;
  language: string;
  components: TemplateComponent[];
}

export function resolveWhatsAppProviderConfig(input?: {
  provider_base_url?: string;
  provider_instance_name?: string;
}): WhatsAppProviderConfig | null {
  const baseUrl = input?.provider_base_url?.trim() || "";
  const instanceName = input?.provider_instance_name?.trim() || "";

  if (!baseUrl || !instanceName) {
    return null;
  }

  return { baseUrl, instanceName };
}

export function buildMessagesSendEndpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, "")}/messages/send`;
}

export function buildTemplateSendEndpoint(baseUrl: string, instanceName: string): string {
  return `${baseUrl.replace(/\/$/, "")}/message/sendTemplate/${instanceName}`;
}

export async function loadWhatsAppProviderConfig(serviceClient: any): Promise<WhatsAppProviderConfig> {
  const { data, error } = await serviceClient
    .from("system_config")
    .select("key, value")
    .in("key", ["whatsapp_service_base_url", "whatsapp_instance_name"]);

  if (error) throw error;

  const values = Object.fromEntries((data || []).map((item) => [item.key, item.value?.trim() || ""]));
  const baseUrl = values.whatsapp_service_base_url || "";
  const instanceName = values.whatsapp_instance_name || "";

  if (!baseUrl) {
    throw new Error("Configuração do serviço WhatsApp incompleta: informe a URL base");
  }

  if (!instanceName) {
    throw new Error("Configuração do serviço WhatsApp incompleta: informe o nome da instância");
  }

  return { baseUrl, instanceName };
}

export async function sendViaWhatsAppProvider(
  config: WhatsAppProviderConfig,
  payload: { number: string; text: string }
) {
  const response = await fetch(buildMessagesSendEndpoint(config.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      number: payload.number,
      text: payload.text,
      instance_name: config.instanceName,
    }),
  });

  let responseJson: unknown = null;
  try {
    responseJson = await response.json();
  } catch {
    responseJson = null;
  }

  return { response, responseJson };
}

export async function sendTemplateViaWhatsAppProvider(
  config: WhatsAppProviderConfig,
  payload: SendTemplatePayload
) {
  const response = await fetch(buildTemplateSendEndpoint(config.baseUrl, config.instanceName), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let responseJson: unknown = null;
  try {
    responseJson = await response.json();
  } catch {
    responseJson = null;
  }

  return { response, responseJson };
}
