export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";
export type EndpointApplication = "FutPro" | "Chatbot" | "Sistema";
export type EndpointAudience = "Público" | "Interno" | "Admin";
export type EndpointLifecycle = "Ativo" | "Legado" | "Novo" | "TODO" | "Stub";
export type EndpointDomain =
  | "Infra"
  | "WhatsApp"
  | "Sessão"
  | "Usuário"
  | "Reserva"
  | "Quadra"
  | "Pagamento"
  | "Configuração";
export type AuthType =
  | "Sem autenticação"
  | "apikey anon"
  | "JWT admin"
  | "JWT app"
  | "Evolution apikey";
export type BaseUrlKey = "futproFunctions" | "chatbotFastapi" | "evolutionApi";

export interface EndpointHeader {
  name: string;
  value: string;
  required: boolean;
  description: string;
}

export interface EndpointResponse {
  status: number;
  label: string;
  body: string;
}

export interface ApiEndpointDoc {
  id: string;
  method: HttpMethod;
  path: string;
  title: string;
  description: string;
  application: EndpointApplication;
  domain: EndpointDomain;
  audience: EndpointAudience;
  lifecycle: EndpointLifecycle;
  authType: AuthType;
  baseUrlKey: BaseUrlKey;
  headers: EndpointHeader[];
  body?: string;
  responses: EndpointResponse[];
  curl?: string;
  notes?: string[];
  usedByChatbot?: boolean;
  recommendedForNewFlow?: boolean;
  writerOfficial?: boolean;
  fallback?: boolean;
}

export interface ApiOverviewCard {
  id: string;
  title: string;
  subtitle: string;
  bullets: string[];
}

export interface ApiBaseUrl {
  id: BaseUrlKey;
  label: string;
  url: string;
  description: string;
}

export interface ApiDocGroup {
  id: string;
  title: string;
  description: string;
  endpointIds: string[];
}

export interface ApiDocSection {
  id: string;
  title: string;
  description: string;
  kind: "detailed" | "reference";
  groups: ApiDocGroup[];
}

export const API_BASE_URLS: ApiBaseUrl[] = [
  {
    id: "futproFunctions",
    label: "FutPro / Supabase Edge Functions",
    url: "https://iljtqqhzabjghbqhuhmn.supabase.co/functions/v1",
    description: "Fonte de verdade do negócio. Expõe disponibilidade, reservas, usuários e pagamentos.",
  },
  {
    id: "chatbotFastapi",
    label: "Chatbot / FastAPI",
    url: "https://seu-chatbot.example.com",
    description: "Orquestrador conversacional. Recebe webhook, mantém sessão e integra com FutPro e Evolution.",
  },
  {
    id: "evolutionApi",
    label: "Evolution API",
    url: "https://evolution-api.example.com",
    description: "Canal de transporte WhatsApp. Responsável por instância, webhook e envio de mensagens.",
  },
];

const FUTPRO_BASE_URL = API_BASE_URLS.find((item) => item.id === "futproFunctions")?.url ?? "";
const CHATBOT_BASE_URL = API_BASE_URLS.find((item) => item.id === "chatbotFastapi")?.url ?? "";
const EVOLUTION_BASE_URL = API_BASE_URLS.find((item) => item.id === "evolutionApi")?.url ?? "";

export const API_OVERVIEW_CARDS: ApiOverviewCard[] = [
  {
    id: "futpro",
    title: "FutPro",
    subtitle: "Painel web + backend de negócio",
    bullets: [
      "Supabase e Edge Functions como fonte de verdade para reservas, usuários e pagamentos.",
      "Centraliza regras transacionais e contratos de negócio consumidos pelo chatbot.",
      "Também concentra envio administrativo de WhatsApp pelo painel.",
    ],
  },
  {
    id: "chatbot",
    title: "Chatbot",
    subtitle: "FastAPI orquestrador conversacional",
    bullets: [
      "Recebe o webhook do WhatsApp e mantém estado, sessão e timeout por telefone.",
      "Combina fluxo guiado com interpretação híbrida do usuário.",
      "Consome regras reais do FutPro e abstrai a mensageria do canal.",
    ],
  },
  {
    id: "evolution",
    title: "WhatsApp / Evolution",
    subtitle: "Canal de transporte",
    bullets: [
      "Fica responsável pela instância, webhook, status de conexão e envio/recebimento de mensagens.",
      "Não contém regra de negócio nem lógica conversacional.",
      "É a camada operacional de entrada e saída do WhatsApp.",
    ],
  },
];

const SYSTEM_ENDPOINTS: ApiEndpointDoc[] = [
  {
    id: "system-chatbot-health",
    method: "GET",
    path: "/health",
    title: "Healthcheck do orquestrador",
    description: "Confirma se o FastAPI do chatbot está de pé e pronto para receber webhooks e chamadas internas.",
    application: "Sistema",
    domain: "Infra",
    audience: "Público",
    lifecycle: "Ativo",
    authType: "Sem autenticação",
    baseUrlKey: "chatbotFastapi",
    headers: [],
    responses: [{ status: 200, label: "OK", body: `{"status":"ok"}` }],
    curl: `curl -X GET "${CHATBOT_BASE_URL}/health"`,
    notes: ["Útil para monitoramento e para validar publicação do orquestrador."],
  },
  {
    id: "system-chatbot-webhook",
    method: "POST",
    path: "/webhook/whatsapp",
    title: "Webhook inbound do WhatsApp",
    description: "Entrada principal das mensagens vindas da Evolution. É o ponto de início do fluxo conversacional.",
    application: "Sistema",
    domain: "WhatsApp",
    audience: "Público",
    lifecycle: "Ativo",
    authType: "Sem autenticação",
    baseUrlKey: "chatbotFastapi",
    headers: [{ name: "Content-Type", value: "application/json", required: true, description: "Payload enviado pela Evolution." }],
    responses: [{ status: 200, label: "Processado", body: `{"ok": true, "status": "processed"}` }],
    notes: [
      "Writer oficial de entrada do canal WhatsApp no ecossistema.",
      "Consumido pela Evolution API, não pelo painel.",
      "Usado pelo fluxo novo do chatbot.",
    ],
    usedByChatbot: true,
    recommendedForNewFlow: true,
  },
  {
    id: "system-chatbot-send-message",
    method: "POST",
    path: "/messages/send",
    title: "Gateway interno de envio WhatsApp",
    description: "Endpoint do FastAPI para FutPro e automações enviarem texto ou mídia sem depender da Evolution diretamente.",
    application: "Sistema",
    domain: "WhatsApp",
    audience: "Interno",
    lifecycle: "Ativo",
    authType: "Sem autenticação",
    baseUrlKey: "chatbotFastapi",
    headers: [
      { name: "Content-Type", value: "application/json", required: true, description: "Payload interno do orquestrador." },
    ],
    body: `{
  "number": "5516997906992@s.whatsapp.net",
  "type": "text",
  "text": "Olá! Sua reserva foi confirmada."
}`,
    responses: [{ status: 200, label: "OK", body: `{"ok": true, "message_type": "text"}` }],
    curl: `curl -X POST ${CHATBOT_BASE_URL}/messages/send \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "5516997906992@s.whatsapp.net",
    "type": "text",
    "text": "Olá! Sua reserva foi confirmada."
  }'`,
    notes: [
      "Endpoint interno do orquestrador FastAPI.",
      "Usado pelo FutPro e automações para disparo outbound.",
    ],
  },
  {
    id: "system-chatbot-config",
    method: "GET",
    path: "/chatbot/config",
    title: "Runtime config do chatbot",
    description: "Expõe modo do bot, timeout de sessão e mensagens operacionais em uso no ambiente.",
    application: "Sistema",
    domain: "Configuração",
    audience: "Interno",
    lifecycle: "Ativo",
    authType: "Sem autenticação",
    baseUrlKey: "chatbotFastapi",
    headers: [],
    responses: [
      {
        status: 200,
        label: "OK",
        body: `{
  "mode": "hybrid",
  "session_timeout_minutes": 5,
  "enable_openai_fallback": true,
  "openai_confidence_threshold": 0.65
}`,
      },
    ],
    notes: ["Útil para futura área 'WhatsApp > Chatbot' do painel."],
  },
  {
    id: "system-chatbot-active-sessions",
    method: "GET",
    path: "/chatbot/sessions/active",
    title: "Sessões ativas do chatbot",
    description: "Lista sessões atualmente abertas no orquestrador para inspeção operacional.",
    application: "Sistema",
    domain: "Sessão",
    audience: "Admin",
    lifecycle: "Ativo",
    authType: "Sem autenticação",
    baseUrlKey: "chatbotFastapi",
    headers: [],
    responses: [
      {
        status: 200,
        label: "OK",
        body: `[
  {
    "session_id": "uuid",
    "sender_id": "5516997906992@s.whatsapp.net",
    "state": "BOOKING_AWAIT_CONFIRMATION"
  }
]`,
      },
    ],
    notes: ["Endpoint interno/admin para observabilidade do atendimento."],
  },
  {
    id: "system-evolution-fetch-instances",
    method: "GET",
    path: "/instance/fetchInstances",
    title: "Listar instâncias Evolution",
    description: "Endpoint externo da Evolution usado pelo ecossistema para observar instâncias existentes.",
    application: "Sistema",
    domain: "Infra",
    audience: "Admin",
    lifecycle: "Ativo",
    authType: "Evolution apikey",
    baseUrlKey: "evolutionApi",
    headers: [{ name: "apikey", value: "{evolution_api_key}", required: true, description: "Chave de autenticação da Evolution." }],
    responses: [{ status: 200, label: "OK", body: `{"value":[{"name":"SB Tech","connectionStatus":"open"}]}` }],
    curl: `curl -X GET "${EVOLUTION_BASE_URL}/instance/fetchInstances" -H "apikey: SUA_EVOLUTION_API_KEY"`,
    notes: ["Infra externa do canal WhatsApp.", "Suportado oficialmente pelo chatbot."],
  },
  {
    id: "system-evolution-connection-state",
    method: "GET",
    path: "/instance/connectionState/{instance}",
    title: "Consultar estado da conexão",
    description: "Retorna o estado atual da instância WhatsApp na Evolution.",
    application: "Sistema",
    domain: "Infra",
    audience: "Admin",
    lifecycle: "Ativo",
    authType: "Evolution apikey",
    baseUrlKey: "evolutionApi",
    headers: [{ name: "apikey", value: "{evolution_api_key}", required: true, description: "Chave de autenticação da Evolution." }],
    responses: [{ status: 200, label: "OK", body: `{"instance":{"instanceName":"SB Tech","state":"open"}}` }],
    curl: `curl -X GET "${EVOLUTION_BASE_URL}/instance/connectionState/SB%20Tech" -H "apikey: SUA_EVOLUTION_API_KEY"`,
    notes: ["Infra externa do canal WhatsApp."],
  },
  {
    id: "system-evolution-connect-instance",
    method: "GET",
    path: "/instance/connect/{instance}",
    title: "Conectar ou reconectar instância",
    description: "Solicita QR code ou pairing code para a instância na Evolution.",
    application: "Sistema",
    domain: "Infra",
    audience: "Admin",
    lifecycle: "Ativo",
    authType: "Evolution apikey",
    baseUrlKey: "evolutionApi",
    headers: [{ name: "apikey", value: "{evolution_api_key}", required: true, description: "Chave de autenticação da Evolution." }],
    responses: [{ status: 200, label: "OK", body: `{"base64":"data:image/png;base64,...","code":"ABCD-1234"}` }],
    notes: ["Suportado pelo backend do chatbot para onboarding e operação."],
  },
  {
    id: "system-evolution-restart-instance",
    method: "POST",
    path: "/instance/restart/{instance}",
    title: "Reiniciar instância",
    description: "Reinicia a instância do canal na Evolution.",
    application: "Sistema",
    domain: "Infra",
    audience: "Admin",
    lifecycle: "Ativo",
    authType: "Evolution apikey",
    baseUrlKey: "evolutionApi",
    headers: [{ name: "apikey", value: "{evolution_api_key}", required: true, description: "Chave de autenticação da Evolution." }],
    responses: [{ status: 200, label: "OK", body: `{"status":"restarted"}` }],
    notes: ["O cliente do chatbot tenta PUT e cai para POST por compatibilidade de versões da Evolution."],
  },
  {
    id: "system-evolution-find-webhook",
    method: "GET",
    path: "/webhook/find/{instance}",
    title: "Consultar webhook da instância",
    description: "Lê a configuração atual do webhook na Evolution.",
    application: "Sistema",
    domain: "WhatsApp",
    audience: "Admin",
    lifecycle: "Ativo",
    authType: "Evolution apikey",
    baseUrlKey: "evolutionApi",
    headers: [{ name: "apikey", value: "{evolution_api_key}", required: true, description: "Chave de autenticação da Evolution." }],
    responses: [{ status: 200, label: "OK", body: `{"enabled":true,"url":"https://seu-chatbot.example.com/webhook/whatsapp"}` }],
  },
  {
    id: "system-evolution-set-webhook",
    method: "POST",
    path: "/webhook/set/{instance}",
    title: "Configurar webhook da instância",
    description: "Aponta a instância da Evolution para o webhook do chatbot.",
    application: "Sistema",
    domain: "WhatsApp",
    audience: "Admin",
    lifecycle: "Ativo",
    authType: "Evolution apikey",
    baseUrlKey: "evolutionApi",
    headers: [
      { name: "apikey", value: "{evolution_api_key}", required: true, description: "Chave de autenticação da Evolution." },
      { name: "Content-Type", value: "application/json", required: true, description: "Payload do webhook." },
    ],
    body: `{
  "enabled": true,
  "url": "https://seu-chatbot.example.com/webhook/whatsapp",
  "events": ["MESSAGES_UPSERT", "QRCODE_UPDATED", "CONNECTION_UPDATE"]
}`,
    responses: [{ status: 200, label: "OK", body: `{"enabled":true,"url":"https://seu-chatbot.example.com/webhook/whatsapp"}` }],
  },
  {
    id: "system-evolution-send-text",
    method: "POST",
    path: "/message/sendText/{instance}",
    title: "Enviar texto via WhatsApp",
    description: "Operação externa da Evolution usada pelo FastAPI para respostas simples.",
    application: "Sistema",
    domain: "WhatsApp",
    audience: "Interno",
    lifecycle: "Ativo",
    authType: "Evolution apikey",
    baseUrlKey: "evolutionApi",
    headers: [
      { name: "apikey", value: "{evolution_api_key}", required: true, description: "Chave de autenticação da Evolution." },
      { name: "Content-Type", value: "application/json", required: true, description: "Payload de texto." },
    ],
    body: `{
  "number": "5516997906992@s.whatsapp.net",
  "text": "Olá!"
}`,
    responses: [{ status: 201, label: "Created", body: `{"status":"PENDING","messageTimestamp":"1717781848"}` }],
    notes: ["Suportado oficialmente pelo projeto.", "Canal de transporte, não regra de negócio."],
  },
  {
    id: "system-evolution-send-media",
    method: "POST",
    path: "/message/sendMedia/{instance}",
    title: "Enviar mídia/imagem via WhatsApp",
    description: "Operação externa da Evolution usada pelo FastAPI para fotos de quadra, calendário e mídia geral.",
    application: "Sistema",
    domain: "WhatsApp",
    audience: "Interno",
    lifecycle: "Ativo",
    authType: "Evolution apikey",
    baseUrlKey: "evolutionApi",
    headers: [
      { name: "apikey", value: "{evolution_api_key}", required: true, description: "Chave de autenticação da Evolution." },
      { name: "Content-Type", value: "application/json", required: true, description: "Payload de mídia." },
    ],
    body: `{
  "number": "5516997906992@s.whatsapp.net",
  "mediatype": "image",
  "media": "https://example.com/quadra-1.jpg",
  "caption": "📍 Quadra 1"
}`,
    responses: [{ status: 201, label: "Created", body: `{"status":"PENDING","messageType":"imageMessage"}` }],
    notes: ["Usado pelo fluxo novo do chatbot para foto da quadra e imagem de calendário."],
    recommendedForNewFlow: true,
  },
  {
    id: "system-evolution-send-list",
    method: "POST",
    path: "/message/sendList/{instance}",
    title: "Enviar lista interativa",
    description: "Suporte preparado na integração. Não é o caminho principal do fluxo atual do chatbot.",
    application: "Sistema",
    domain: "WhatsApp",
    audience: "Interno",
    lifecycle: "Novo",
    authType: "Evolution apikey",
    baseUrlKey: "evolutionApi",
    headers: [
      { name: "apikey", value: "{evolution_api_key}", required: true, description: "Chave de autenticação da Evolution." },
      { name: "Content-Type", value: "application/json", required: true, description: "Payload da lista." },
    ],
    responses: [{ status: 201, label: "Created", body: `{"status":"PENDING","messageType":"viewOnceMessage"}` }],
    notes: ["Capacidade preparada para evolução futura do UX.", "Hoje o fluxo principal prioriza texto e mídia."],
  },
  {
    id: "system-evolution-send-buttons",
    method: "POST",
    path: "/message/sendButtons/{instance}",
    title: "Enviar botões interativos",
    description: "Suporte preparado na integração. Não é o caminho principal do fluxo atual do chatbot.",
    application: "Sistema",
    domain: "WhatsApp",
    audience: "Interno",
    lifecycle: "Novo",
    authType: "Evolution apikey",
    baseUrlKey: "evolutionApi",
    headers: [
      { name: "apikey", value: "{evolution_api_key}", required: true, description: "Chave de autenticação da Evolution." },
      { name: "Content-Type", value: "application/json", required: true, description: "Payload dos botões." },
    ],
    responses: [{ status: 201, label: "Created", body: `{"status":"PENDING","messageType":"viewOnceMessage"}` }],
    notes: ["Capacidade preparada para evolução futura do UX.", "Hoje o fluxo principal prioriza texto e mídia."],
  },
];

const FUTPRO_ENDPOINTS: ApiEndpointDoc[] = [
  {
    id: "futpro-get-user-info",
    method: "GET",
    path: "/get-user-info?phone={phone}",
    title: "Consultar nome e perfil básico por telefone",
    description: "Busca primeiro alunos em profiles/student_profiles e, se não encontrar, cai para booking_users.",
    application: "FutPro",
    domain: "Usuário",
    audience: "Público",
    lifecycle: "Legado",
    authType: "apikey anon",
    baseUrlKey: "futproFunctions",
    headers: [{ name: "apikey", value: "{anon_key}", required: true, description: "Chave pública do projeto Supabase." }],
    responses: [{ status: 200, label: "OK", body: `{"name":"Arthur Bessa","is_student":true}` }],
    curl: `curl -X GET "${FUTPRO_BASE_URL}/get-user-info?phone=5516997906992" -H "apikey: SUA_ANON_KEY"`,
    notes: ["Contrato legado mantido por compatibilidade.", "Hoje o fluxo novo prefere /booking-user."],
    usedByChatbot: true,
    fallback: true,
  },
  {
    id: "futpro-booking-user",
    method: "GET",
    path: "/booking-user?phone={phone}",
    title: "Buscar usuário conhecido do fluxo de reservas",
    description: "Procura booking_users e, quando aplicável, também reconhece aluno por telefone para abrir a conversa já com nome salvo.",
    application: "FutPro",
    domain: "Usuário",
    audience: "Público",
    lifecycle: "Novo",
    authType: "apikey anon",
    baseUrlKey: "futproFunctions",
    headers: [{ name: "apikey", value: "{anon_key}", required: true, description: "Chave pública do projeto Supabase." }],
    responses: [
      { status: 200, label: "Encontrado", body: `{"found":true,"is_student":false,"user":{"id":"uuid","name":"Arthur Bessa","phone":"5516997906992"}}` },
      { status: 200, label: "Não encontrado", body: `{"found":false,"is_student":false,"user":null}` },
    ],
    curl: `curl -X GET "${FUTPRO_BASE_URL}/booking-user?phone=5516997906992" -H "apikey: SUA_ANON_KEY"`,
    notes: ["Usado pelo fluxo novo do chatbot.", "Leitura preferencial do usuário por telefone."],
    usedByChatbot: true,
    recommendedForNewFlow: true,
  },
  {
    id: "futpro-booking-user-upsert",
    method: "POST",
    path: "/booking-user/upsert",
    title: "Salvar ou atualizar usuário do agendamento",
    description: "Persiste nome e telefone após o primeiro agendamento confirmado, evitando pedir nome em conversas futuras.",
    application: "FutPro",
    domain: "Usuário",
    audience: "Público",
    lifecycle: "Novo",
    authType: "apikey anon",
    baseUrlKey: "futproFunctions",
    headers: [
      { name: "apikey", value: "{anon_key}", required: true, description: "Chave pública do projeto Supabase." },
      { name: "Content-Type", value: "application/json", required: true, description: "Payload do usuário." },
    ],
    body: `{"phone":"5516997906992","name":"Arthur Bessa"}`,
    responses: [{ status: 200, label: "OK", body: `{"success":true,"user":{"id":"uuid","name":"Arthur Bessa","phone":"5516997906992"}}` }],
    curl: `curl -X POST ${FUTPRO_BASE_URL}/booking-user/upsert -H "apikey: SUA_ANON_KEY" -H "Content-Type: application/json" -d '{"phone":"5516997906992","name":"Arthur Bessa"}'`,
    notes: ["Writer oficial do perfil leve de usuário do agendamento.", "Usado pelo fluxo novo do chatbot."],
    usedByChatbot: true,
    writerOfficial: true,
    recommendedForNewFlow: true,
  },
  {
    id: "futpro-court-availability-get",
    method: "GET",
    path: "/court-availability?court_id={uuid}&date={YYYY-MM-DD}",
    title: "Consultar slots livres de uma quadra",
    description: "Retorna slots de 1 hora, descontando reservas requested/confirmed/paid e sessões de aula agendadas.",
    application: "FutPro",
    domain: "Quadra",
    audience: "Público",
    lifecycle: "Ativo",
    authType: "apikey anon",
    baseUrlKey: "futproFunctions",
    headers: [{ name: "apikey", value: "{anon_key}", required: true, description: "Chave pública do projeto Supabase." }],
    responses: [{ status: 200, label: "OK", body: `{"date":"2026-04-08","court_id":"uuid","court_name":"Quadra 1","available_slots":[{"start":"08:00","end":"09:00"},{"start":"19:00","end":"20:00"}]}` }],
    curl: `curl -X GET "${FUTPRO_BASE_URL}/court-availability?court_id=UUID_DA_QUADRA&date=2026-04-08" -H "apikey: SUA_ANON_KEY"`,
    notes: ["Continua ativo no domínio de reservas.", "Também serve como fallback de disponibilidade."],
  },
  {
    id: "futpro-court-availability-post",
    method: "POST",
    path: "/court-availability",
    title: "Criar solicitação de reserva",
    description: "Valida conflitos e cria a solicitação de reserva da quadra. Continua sendo o writer oficial da criação de reserva.",
    application: "FutPro",
    domain: "Reserva",
    audience: "Público",
    lifecycle: "Ativo",
    authType: "apikey anon",
    baseUrlKey: "futproFunctions",
    headers: [
      { name: "apikey", value: "{anon_key}", required: true, description: "Chave pública do projeto Supabase." },
      { name: "Content-Type", value: "application/json", required: true, description: "Formato do body." },
    ],
    body: `{
  "court_id": "uuid-da-quadra",
  "date": "2026-04-08",
  "start_time": "19:00",
  "end_time": "20:00",
  "requester_name": "Arthur Bessa",
  "requester_phone": "5516997906992",
  "price": 120
}`,
    responses: [
      { status: 201, label: "Reserva criada", body: `{"booking_id":"uuid-da-reserva","status":"requested","message":"Reserva solicitada com sucesso. Aguarde confirmação."}` },
      { status: 409, label: "Conflito", body: `{"error":"Horário não disponível para esta data"}` },
    ],
    curl: `curl -X POST ${FUTPRO_BASE_URL}/court-availability -H "apikey: SUA_ANON_KEY" -H "Content-Type: application/json" -d '{"court_id":"UUID_DA_QUADRA","date":"2026-04-08","start_time":"19:00","end_time":"20:00","requester_name":"Arthur Bessa","requester_phone":"5516997906992","price":120}'`,
    notes: ["Writer oficial da criação de reserva.", "Usado pelo fluxo novo do chatbot."],
    usedByChatbot: true,
    writerOfficial: true,
    recommendedForNewFlow: true,
  },
  {
    id: "futpro-courts-availability-by-range",
    method: "GET",
    path: "/courts/availability-by-range?date={YYYY-MM-DD}&start_time={HH:MM}&end_time={HH:MM}",
    title: "Disponibilidade de quadras por intervalo",
    description: "Retorna as quadras livres no intervalo completo e sugere horários próximos quando não houver disponibilidade.",
    application: "FutPro",
    domain: "Quadra",
    audience: "Público",
    lifecycle: "Novo",
    authType: "apikey anon",
    baseUrlKey: "futproFunctions",
    headers: [{ name: "apikey", value: "{anon_key}", required: true, description: "Chave pública do projeto Supabase." }],
    responses: [{ status: 200, label: "OK", body: `{"date":"2026-04-08","start_time":"19:00","end_time":"20:00","available_courts":[{"id":"uuid-1","name":"Quadra 1","photo_url":"https://..."}],"suggested_slots":[{"start":"20:00","end":"21:00"}]}` }],
    curl: `curl -X GET "${FUTPRO_BASE_URL}/courts/availability-by-range?date=2026-04-08&start_time=19:00&end_time=20:00" -H "apikey: SUA_ANON_KEY"`,
    notes: ["Usado pelo fluxo novo do chatbot.", "Permite decidir se segue direto ou pede escolha de quadra."],
    usedByChatbot: true,
    recommendedForNewFlow: true,
  },
  {
    id: "futpro-court-availability-grouped",
    method: "GET",
    path: "/court-availability-grouped?date={YYYY-MM-DD}",
    title: "Disponibilidade agrupada por período",
    description: "Agrupa horários livres em manhã, tarde e noite, já filtrando janelas passadas na data atual.",
    application: "FutPro",
    domain: "Quadra",
    audience: "Público",
    lifecycle: "Novo",
    authType: "apikey anon",
    baseUrlKey: "futproFunctions",
    headers: [{ name: "apikey", value: "{anon_key}", required: true, description: "Chave pública do projeto Supabase." }],
    responses: [{ status: 200, label: "OK", body: `{"date":"2026-04-08","periods":{"morning":[{"start":"08:00","end":"09:00"}],"afternoon":[{"start":"14:00","end":"15:00"}],"night":[{"start":"19:00","end":"20:00"}]}}` }],
    curl: `curl -X GET "${FUTPRO_BASE_URL}/court-availability-grouped?date=2026-04-08" -H "apikey: SUA_ANON_KEY"`,
    notes: ["Usado pelo fluxo novo do chatbot quando o usuário pede apenas data ou período."],
    usedByChatbot: true,
    recommendedForNewFlow: true,
  },
  {
    id: "futpro-list-bookings",
    method: "GET",
    path: "/list-bookings?phone={phone}",
    title: "Listar reservas por telefone",
    description: "Retorna reservas não canceladas, limitadas e sem filtro adequado de futuro. Mantido por compatibilidade.",
    application: "FutPro",
    domain: "Reserva",
    audience: "Público",
    lifecycle: "Legado",
    authType: "apikey anon",
    baseUrlKey: "futproFunctions",
    headers: [{ name: "apikey", value: "{anon_key}", required: true, description: "Chave pública do projeto Supabase." }],
    responses: [{ status: 200, label: "OK", body: `{"bookings":[{"id":"uuid","date":"2026-04-08","start_time":"19:00:00","end_time":"20:00:00","status":"requested","courts":{"name":"Quadra 1"}}]}` }],
    curl: `curl -X GET "${FUTPRO_BASE_URL}/list-bookings?phone=5516997906992" -H "apikey: SUA_ANON_KEY"`,
    notes: ["Contrato legado, mantido por compatibilidade.", "O fluxo novo prefere /list-upcoming-bookings."],
    fallback: true,
  },
  {
    id: "futpro-list-upcoming-bookings",
    method: "GET",
    path: "/list-upcoming-bookings?phone={phone}",
    title: "Listar apenas reservas futuras",
    description: "Devolve somente reservas futuras, ordenadas por data/hora, com status técnico e status amigável em português.",
    application: "FutPro",
    domain: "Reserva",
    audience: "Público",
    lifecycle: "Novo",
    authType: "apikey anon",
    baseUrlKey: "futproFunctions",
    headers: [{ name: "apikey", value: "{anon_key}", required: true, description: "Chave pública do projeto Supabase." }],
    responses: [{ status: 200, label: "OK", body: `{"bookings":[{"id":"uuid","court_name":"Quadra 2","start_at":"2026-04-08T21:00:00-03:00","end_at":"2026-04-08T22:00:00-03:00","status":"requested","status_label":"Pendente"}]}` }],
    curl: `curl -X GET "${FUTPRO_BASE_URL}/list-upcoming-bookings?phone=5516997906992" -H "apikey: SUA_ANON_KEY"`,
    notes: ["Usado pelo fluxo novo do chatbot.", "Leitura recomendada para 'ver minhas reservas'."],
    usedByChatbot: true,
    recommendedForNewFlow: true,
  },
  {
    id: "futpro-cancel-booking",
    method: "POST",
    path: "/cancel-booking",
    title: "Cancelar reserva",
    description: "Continua disponível no domínio de negócio, mas o fluxo novo do chatbot não oferece cancelamento direto.",
    application: "FutPro",
    domain: "Reserva",
    audience: "Público",
    lifecycle: "Legado",
    authType: "apikey anon",
    baseUrlKey: "futproFunctions",
    headers: [
      { name: "apikey", value: "{anon_key}", required: true, description: "Chave pública do projeto Supabase." },
      { name: "Content-Type", value: "application/json", required: true, description: "Formato do body." },
    ],
    body: `{"booking_id":"uuid-da-reserva","requester_phone":"5516997906992"}`,
    responses: [{ status: 200, label: "OK", body: `{"status":"cancelado","message":"Reserva cancelada com sucesso."}` }],
    curl: `curl -X POST ${FUTPRO_BASE_URL}/cancel-booking -H "apikey: SUA_ANON_KEY" -H "Content-Type: application/json" -d '{"booking_id":"UUID_DA_RESERVA","requester_phone":"5516997906992"}'`,
    notes: ["Mantido por compatibilidade.", "Não é o caminho principal do fluxo novo."],
  },
  {
    id: "futpro-booking-calendar-image",
    method: "GET",
    path: "/booking-calendar-image?date={YYYY-MM-DD}&view={daily|weekly}",
    title: "Imagem do calendário de reservas",
    description: "Contrato preparado para o chatbot enviar a visão do calendário do painel.",
    application: "FutPro",
    domain: "Quadra",
    audience: "Público",
    lifecycle: "Stub",
    authType: "apikey anon",
    baseUrlKey: "futproFunctions",
    headers: [{ name: "apikey", value: "{anon_key}", required: true, description: "Chave pública do projeto Supabase." }],
    responses: [{ status: 501, label: "Stub/TODO", body: `{"implemented":false,"image_url":null,"view":"daily","date":"2026-04-08","todo":"Implementar geração ou publicação da imagem do calendário de reservas."}` }],
    curl: `curl -X GET "${FUTPRO_BASE_URL}/booking-calendar-image?date=2026-04-08&view=daily" -H "apikey: SUA_ANON_KEY"`,
    notes: ["Stub atual, retorna 501.", "Dependente de backend de mídia/calendário."],
    usedByChatbot: true,
    recommendedForNewFlow: true,
  },
  {
    id: "futpro-create-pix-payment",
    method: "POST",
    path: "/create-pix-payment",
    title: "Gerar PIX para fatura ou reserva",
    description: "Gera cobrança PIX para reserva ou fatura e serve como base para fluxos futuros de pagamento no chatbot.",
    application: "FutPro",
    domain: "Pagamento",
    audience: "Admin",
    lifecycle: "Ativo",
    authType: "JWT admin",
    baseUrlKey: "futproFunctions",
    headers: [
      { name: "Authorization", value: "Bearer {access_token}", required: true, description: "JWT de admin ou aluno, conforme o fluxo." },
      { name: "Content-Type", value: "application/json", required: true, description: "Formato do body." },
    ],
    body: `{"booking_id":"uuid-da-reserva"}`,
    responses: [{ status: 200, label: "OK", body: `{"qr_code":"00020126...","qr_code_base64":"iVBORw0KGgo...","payment_id":123456789,"expires_at":"2026-04-08T22:00:00.000Z"}` }],
    curl: `curl -X POST ${FUTPRO_BASE_URL}/create-pix-payment -H "Authorization: Bearer SEU_TOKEN_ADMIN" -H "Content-Type: application/json" -d '{"booking_id":"UUID_DA_RESERVA"}'`,
    notes: ["Endpoint de pagamento do domínio FutPro.", "Preparado para integração futura no fluxo do chatbot."],
  },
  {
    id: "futpro-send-whatsapp",
    method: "POST",
    path: "/send-whatsapp",
    title: "Enviar mensagem WhatsApp pelo painel",
    description: "Endpoint administrativo do ecossistema para disparos outbound via painel e automações.",
    application: "FutPro",
    domain: "WhatsApp",
    audience: "Admin",
    lifecycle: "Ativo",
    authType: "JWT admin",
    baseUrlKey: "futproFunctions",
    headers: [
      { name: "Authorization", value: "Bearer {access_token}", required: true, description: "Token JWT de usuário admin." },
      { name: "Content-Type", value: "application/json", required: true, description: "Formato do body." },
    ],
    body: `{"recipients":[{"phone":"5516997906992","name":"Arthur"}],"message_body":"Olá!"}`,
    responses: [{ status: 200, label: "OK", body: `{"sent":1,"failed":0,"results":[{"phone":"5516997906992","status":"sent"}]}` }],
    curl: `curl -X POST ${FUTPRO_BASE_URL}/send-whatsapp -H "Authorization: Bearer SEU_TOKEN" -H "Content-Type: application/json" -d '{"recipients":[{"phone":"5516997906992","name":"Arthur"}],"message_body":"Olá!"}'`,
    notes: ["WhatsApp administrativo do painel.", "Não é endpoint de negócio do chatbot."],
  },
];

const CHATBOT_ENDPOINTS: ApiEndpointDoc[] = [
  {
    id: "chatbot-flow-hybrid",
    method: "POST",
    path: "/webhook/whatsapp + sessão híbrida",
    title: "Fluxo híbrido do chatbot",
    description: "Representa o comportamento do orquestrador: menu guiado + conversa natural + fallback com OpenAI + execução em FutPro.",
    application: "Chatbot",
    domain: "Sessão",
    audience: "Interno",
    lifecycle: "Novo",
    authType: "Sem autenticação",
    baseUrlKey: "chatbotFastapi",
    headers: [],
    responses: [
      { status: 200, label: "Fluxo ativo", body: `{"mode":"hybrid","layers":["commands","state","deterministic_parse","openai_interpreter","business_execution"]}` },
    ],
    notes: [
      "Fluxo novo recomendado do chatbot.",
      "Não é um endpoint novo isolado; é a capacidade principal do orquestrador.",
    ],
    recommendedForNewFlow: true,
  },
];

export const API_ENDPOINTS: ApiEndpointDoc[] = [...SYSTEM_ENDPOINTS, ...FUTPRO_ENDPOINTS, ...CHATBOT_ENDPOINTS];

export const API_ENDPOINT_MAP: Record<string, ApiEndpointDoc> = Object.fromEntries(
  API_ENDPOINTS.map((endpoint) => [endpoint.id, endpoint]),
);

export const API_SECTIONS: ApiDocSection[] = [
  {
    id: "system-infra",
    title: "Sistema / Infraestrutura",
    description: "Superfícies de integração do ecossistema, healthchecks, webhook, status operacional e canal WhatsApp.",
    kind: "detailed",
    groups: [
      {
        id: "system-chatbot",
        title: "FastAPI / Orquestrador",
        description: "Rotas do chatbot-beach-clubs que expõem operação, sessão e mensageria interna.",
        endpointIds: [
          "system-chatbot-health",
          "system-chatbot-webhook",
          "system-chatbot-send-message",
          "system-chatbot-config",
          "system-chatbot-active-sessions",
        ],
      },
      {
        id: "system-evolution",
        title: "Evolution / Canal WhatsApp",
        description: "Endpoints externos oficialmente suportados pela integração para instância, webhook e envio.",
        endpointIds: [
          "system-evolution-fetch-instances",
          "system-evolution-connection-state",
          "system-evolution-connect-instance",
          "system-evolution-restart-instance",
          "system-evolution-find-webhook",
          "system-evolution-set-webhook",
          "system-evolution-send-text",
          "system-evolution-send-media",
          "system-evolution-send-list",
          "system-evolution-send-buttons",
        ],
      },
    ],
  },
  {
    id: "futpro-business",
    title: "FutPro — Endpoints de Negócio",
    description: "Contratos do backend principal do sistema, agrupados por domínio funcional.",
    kind: "detailed",
    groups: [
      {
        id: "futpro-users",
        title: "Usuários",
        description: "Leitura e persistência leve do usuário de agendamento por telefone.",
        endpointIds: [
          "futpro-get-user-info",
          "futpro-booking-user",
          "futpro-booking-user-upsert",
        ],
      },
      {
        id: "futpro-bookings",
        title: "Reservas / Quadras",
        description: "Disponibilidade, criação de reserva, listagens e contratos de apoio ao novo fluxo do bot.",
        endpointIds: [
          "futpro-court-availability-get",
          "futpro-court-availability-post",
          "futpro-courts-availability-by-range",
          "futpro-court-availability-grouped",
          "futpro-list-bookings",
          "futpro-list-upcoming-bookings",
          "futpro-cancel-booking",
          "futpro-booking-calendar-image",
        ],
      },
      {
        id: "futpro-payments",
        title: "Pagamentos",
        description: "Contratos de cobrança e PIX do sistema principal.",
        endpointIds: ["futpro-create-pix-payment"],
      },
      {
        id: "futpro-whatsapp-admin",
        title: "WhatsApp administrativo",
        description: "Disparos outbound do painel e automações operacionais.",
        endpointIds: ["futpro-send-whatsapp"],
      },
    ],
  },
  {
    id: "chatbot-orchestration",
    title: "Chatbot — Orquestração Conversacional",
    description: "Capacidades e contratos do aplicativo chatbot-beach-clubs no fluxo novo de reservas.",
    kind: "reference",
    groups: [
      {
        id: "chatbot-flow",
        title: "Webhook, sessão e fluxo híbrido",
        description: "Entrada do canal, roteamento por estado e camada assistida por OpenAI.",
        endpointIds: [
          "system-chatbot-webhook",
          "system-chatbot-config",
          "system-chatbot-active-sessions",
          "chatbot-flow-hybrid",
        ],
      },
      {
        id: "chatbot-messaging",
        title: "Mensageria e operação",
        description: "Gateway interno de envio e rotas operacionais usadas pelo ecossistema.",
        endpointIds: [
          "system-chatbot-send-message",
          "system-chatbot-health",
        ],
      },
    ],
  },
  {
    id: "new-flow-contracts",
    title: "Contratos do Fluxo Novo do Chatbot",
    description: "Caminho recomendado do fluxo novo, destacando o writer oficial e as leituras preferenciais.",
    kind: "reference",
    groups: [
      {
        id: "new-flow-recommended",
        title: "Caminho recomendado",
        description: "Endpoints e capacidades que formam o fluxo novo de reserva e acompanhamento.",
        endpointIds: [
          "system-chatbot-webhook",
          "futpro-booking-user",
          "futpro-courts-availability-by-range",
          "futpro-court-availability-grouped",
          "futpro-court-availability-post",
          "futpro-booking-user-upsert",
          "futpro-list-upcoming-bookings",
          "system-evolution-send-media",
          "chatbot-flow-hybrid",
        ],
      },
    ],
  },
  {
    id: "legacy-compatibility",
    title: "Legado / Compatibilidade",
    description: "Contratos ainda presentes no ecossistema, mas que não representam o caminho principal do fluxo novo.",
    kind: "reference",
    groups: [
      {
        id: "legacy-endpoints",
        title: "Contratos mantidos por compatibilidade",
        description: "Ainda funcionam, mas devem ser usados com consciência do contexto.",
        endpointIds: [
          "futpro-get-user-info",
          "futpro-list-bookings",
          "futpro-cancel-booking",
        ],
      },
    ],
  },
  {
    id: "todo-stub-future",
    title: "TODO / Stub / Futuro",
    description: "Contratos planejados, parcialmente implementados ou dependentes de backend/mídia.",
    kind: "reference",
    groups: [
      {
        id: "todo-endpoints",
        title: "Pendências",
        description: "Pontos onde a arquitetura já está preparada, mas a implementação ainda não está completa.",
        endpointIds: [
          "futpro-booking-calendar-image",
          "system-evolution-send-list",
          "system-evolution-send-buttons",
        ],
      },
    ],
  },
];

export function getEndpointById(id: string): ApiEndpointDoc | undefined {
  return API_ENDPOINT_MAP[id];
}

export function getEndpointsByIds(ids: string[]): ApiEndpointDoc[] {
  return ids
    .map((id) => API_ENDPOINT_MAP[id])
    .filter((endpoint): endpoint is ApiEndpointDoc => Boolean(endpoint));
}

export function matchesEndpointSearch(endpoint: ApiEndpointDoc, query: string): boolean {
  if (!query.trim()) return true;
  const haystack = [
    endpoint.method,
    endpoint.path,
    endpoint.title,
    endpoint.description,
    endpoint.application,
    endpoint.domain,
    endpoint.audience,
    endpoint.lifecycle,
    endpoint.authType,
    ...(endpoint.notes ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.trim().toLowerCase());
}
