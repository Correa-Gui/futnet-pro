import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { BookOpen, ChevronDown, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface EndpointHeader {
  name: string;
  value: string;
  required: boolean;
  description: string;
}

interface EndpointResponse {
  status: number;
  label: string;
  body: string;
}

interface Endpoint {
  method: HttpMethod;
  path: string;
  summary: string;
  description: string;
  headers: EndpointHeader[];
  body?: string;
  responses: EndpointResponse[];
  curl: string;
}

const BASE_URL = "https://iljtqqhzabjghbqhuhmn.supabase.co/functions/v1";

const methodColors: Record<HttpMethod, string> = {
  GET:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  POST:   "bg-sky-500/15 text-sky-400 border-sky-500/30",
  PATCH:  "bg-orange-500/15 text-orange-400 border-orange-500/30",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/30",
};

const endpoints: Endpoint[] = [
  {
    method: "POST",
    path: "/whatsapp-webhook",
    summary: "Webhook receptor de mensagens",
    description:
      "Recebe eventos enviados pelo Evolution API quando um usuário manda mensagem no WhatsApp. Configurar esta URL na Evolution API como destino de webhook com o evento messages.upsert. Mensagens enviadas pelo próprio bot (fromMe: true) são ignoradas automaticamente. O handler registra a mensagem no histórico e expõe o ponto de integração para o agente de IA.",
    headers: [
      {
        name: "x-webhook-secret",
        value: "{WHATSAPP_WEBHOOK_SECRET}",
        required: true,
        description: "Secret configurado na env var da Edge Function — valida que a requisição veio da Evolution API",
      },
      {
        name: "Content-Type",
        value: "application/json",
        required: true,
        description: "Enviado automaticamente pelo Evolution API",
      },
    ],
    body: `{
  "event": "messages.upsert",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "MSG_ID_ABC123"
    },
    "message": {
      "conversation": "Quero reservar uma quadra amanhã às 19h"
    }
  }
}`,
    responses: [
      {
        status: 200,
        label: "Processado",
        body: `{ "status": "processed", "phone": "5511999999999", "message_length": 38 }`,
      },
      {
        status: 200,
        label: "Ignorado",
        body: `{ "status": "ignored", "reason": "fromMe" }`,
      },
      {
        status: 401,
        label: "Secret inválido",
        body: `{ "error": "Unauthorized" }`,
      },
    ],
    curl: `curl -X POST \\
  ${BASE_URL}/whatsapp-webhook \\
  -H "x-webhook-secret: seu_secret_aqui" \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "messages.upsert",
    "data": {
      "key": { "remoteJid": "5511999999999@s.whatsapp.net", "fromMe": false },
      "message": { "conversation": "Quero reservar uma quadra" }
    }
  }'`,
  },
  {
    method: "POST",
    path: "/send-whatsapp",
    summary: "Enviar mensagem WhatsApp",
    description:
      "Envia mensagem de texto para um ou mais destinatários via Evolution API. Suporta substituição de variáveis no formato {{variavel}} através do campo template_variables. Registra todas as mensagens (enviadas ou falhas) na tabela whatsapp_messages. Requer usuário admin autenticado.",
    headers: [
      {
        name: "Authorization",
        value: "Bearer {access_token}",
        required: true,
        description: "JWT do usuário admin — obtido via login no Supabase Auth",
      },
      {
        name: "apikey",
        value: "{anon_key}",
        required: true,
        description: "Chave pública do projeto Supabase",
      },
      {
        name: "Content-Type",
        value: "application/json",
        required: true,
        description: "Formato do body",
      },
    ],
    body: `{
  "recipients": [
    { "phone": "5511999999999", "name": "João Silva", "student_id": "uuid-opcional" }
  ],
  "message_body": "Olá, {{nome}}! Sua fatura de {{valor}} vence em {{data_vencimento}}.",
  "template_id": "uuid-do-template",
  "template_variables": {
    "nome": "João Silva",
    "valor": "R$ 150,00",
    "data_vencimento": "05/04/2026"
  }
}`,
    responses: [
      {
        status: 200,
        label: "Enviado",
        body: `{
  "sent": 1,
  "failed": 0,
  "results": [
    { "phone": "5511999999999", "success": true, "messageId": "MSG_ID_XYZ" }
  ]
}`,
      },
      {
        status: 200,
        label: "Falha parcial",
        body: `{
  "sent": 0,
  "failed": 1,
  "results": [
    { "phone": "5511999999999", "success": false, "error": "Invalid phone number" }
  ]
}`,
      },
      {
        status: 401,
        label: "Não autorizado",
        body: `{ "error": "Unauthorized" }`,
      },
      {
        status: 403,
        label: "Sem permissão",
        body: `{ "error": "Forbidden" }`,
      },
    ],
    curl: `curl -X POST \\
  ${BASE_URL}/send-whatsapp \\
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \\
  -H "apikey: SUA_ANON_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "recipients": [{ "phone": "5511999999999", "name": "João Silva" }],
    "message_body": "Olá, {{nome}}! Sua aula foi cancelada.",
    "template_variables": { "nome": "João Silva" }
  }'`,
  },
  {
    method: "GET",
    path: "/court-availability?court_id={uuid}&date={YYYY-MM-DD}",
    summary: "Consultar slots disponíveis de quadra",
    description:
      "Retorna os horários livres de uma quadra em uma data específica. Desconta automaticamente reservas confirmadas/pagas (court_bookings) e sessões de aula agendadas (class_sessions). Os slots são calculados em intervalos de 1 hora com base no business_hours definido em system_config (padrão: 08h–22h). Endpoint público — ideal para o agente de IA consultar antes de propor um agendamento.",
    headers: [
      {
        name: "apikey",
        value: "{anon_key}",
        required: true,
        description: "Chave pública do projeto Supabase",
      },
    ],
    responses: [
      {
        status: 200,
        label: "Sucesso",
        body: `{
  "date": "2026-04-05",
  "court_id": "uuid-da-quadra",
  "court_name": "Quadra 1",
  "available_slots": [
    { "start": "08:00", "end": "09:00" },
    { "start": "10:00", "end": "11:00" },
    { "start": "19:00", "end": "20:00" }
  ]
}`,
      },
      {
        status: 400,
        label: "Parâmetros ausentes",
        body: `{ "error": "court_id e date são obrigatórios" }`,
      },
      {
        status: 404,
        label: "Quadra não encontrada",
        body: `{ "error": "Quadra não encontrada ou inativa" }`,
      },
    ],
    curl: `curl -X GET \\
  "${BASE_URL}/court-availability?court_id=UUID_DA_QUADRA&date=2026-04-05" \\
  -H "apikey: SUA_ANON_KEY"`,
  },
  {
    method: "POST",
    path: "/court-availability",
    summary: "Reservar quadra via bot",
    description:
      "Cria uma solicitação de reserva com status 'requested' e valida conflitos automaticamente contra reservas existentes (requested/confirmed/paid) e sessões de aula agendadas. Use este endpoint — não o REST direto — quando o agente de IA criar reservas após confirmação do usuário, pois ele inclui a lógica de validação de conflitos.",
    headers: [
      {
        name: "apikey",
        value: "{anon_key}",
        required: true,
        description: "Chave pública do projeto Supabase",
      },
      {
        name: "Content-Type",
        value: "application/json",
        required: true,
        description: "Formato do body",
      },
    ],
    body: `{
  "court_id": "uuid-da-quadra",
  "date": "2026-04-05",
  "start_time": "19:00",
  "end_time": "20:00",
  "requester_name": "João Silva",
  "requester_phone": "5511999999999",
  "price": 120.00
}`,
    responses: [
      {
        status: 201,
        label: "Reserva criada",
        body: `{
  "booking_id": "uuid-da-reserva",
  "status": "requested",
  "message": "Reserva solicitada com sucesso. Aguarde confirmação."
}`,
      },
      {
        status: 400,
        label: "Dados inválidos",
        body: `{ "error": "start_time deve ser anterior a end_time" }`,
      },
      {
        status: 409,
        label: "Conflito de horário",
        body: `{ "error": "Horário não disponível para esta data" }`,
      },
    ],
    curl: `curl -X POST \\
  ${BASE_URL}/court-availability \\
  -H "apikey: SUA_ANON_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "court_id": "UUID_DA_QUADRA",
    "date": "2026-04-05",
    "start_time": "19:00",
    "end_time": "20:00",
    "requester_name": "João Silva",
    "requester_phone": "5511999999999",
    "price": 120.00
  }'`,
  },
  {
    method: "POST",
    path: "/send-invoice-reminders",
    summary: "Disparar lembretes de cobrança",
    description:
      "Envia mensagens WhatsApp para alunos com faturas próximas do vencimento. Regras: apenas alunos com profiles.status='active' e faturas com invoices.status='pending' cujo due_date seja igual a CURRENT_DATE + days_before_due. Variáveis disponíveis no template: {{nome}}, {{valor}}, {{data_vencimento}}, {{pix_copy_paste}}. Ideal para execução via cron job diário.",
    headers: [
      {
        name: "Authorization",
        value: "Bearer {service_role_key}",
        required: true,
        description: "Service role key do Supabase — não expor no frontend",
      },
      {
        name: "Content-Type",
        value: "application/json",
        required: true,
        description: "Formato do body",
      },
    ],
    body: `{
  "days_before_due": 3,
  "template_id": "uuid-do-template-cobranca"
}`,
    responses: [
      {
        status: 200,
        label: "Concluído",
        body: `{ "sent": 12, "skipped": 2, "failed": 1 }`,
      },
      {
        status: 200,
        label: "Nenhuma fatura",
        body: `{ "sent": 0, "skipped": 0, "failed": 0, "message": "Nenhuma fatura encontrada para o critério" }`,
      },
      {
        status: 500,
        label: "Erro de configuração",
        body: `{ "error": "Configuração da Evolution API incompleta" }`,
      },
    ],
    curl: `curl -X POST \\
  ${BASE_URL}/send-invoice-reminders \\
  -H "Authorization: Bearer SUA_SERVICE_ROLE_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "days_before_due": 3,
    "template_id": "UUID_DO_TEMPLATE"
  }'`,
  },
  {
    method: "POST",
    path: "/notify-class-cancellation",
    summary: "Notificar cancelamento de aula",
    description:
      "Notifica em batch todos os alunos com presença confirmada ou não confirmada em uma sessão de aula. Envia mensagem via WhatsApp com substituição de variáveis: {{nome}}, {{turma}}, {{data}}, {{professor}}. Atualiza class_sessions.status para 'cancelled' somente após todas as notificações serem enviadas. Requer usuário admin autenticado.",
    headers: [
      {
        name: "Authorization",
        value: "Bearer {access_token}",
        required: true,
        description: "JWT do usuário admin autenticado",
      },
      {
        name: "apikey",
        value: "{anon_key}",
        required: true,
        description: "Chave pública do projeto Supabase",
      },
      {
        name: "Content-Type",
        value: "application/json",
        required: true,
        description: "Formato do body",
      },
    ],
    body: `{
  "session_id": "uuid-da-sessao",
  "template_id": "uuid-do-template-cancelamento",
  "custom_message": "Mensagem personalizada opcional — sobrescreve o template"
}`,
    responses: [
      {
        status: 200,
        label: "Concluído",
        body: `{ "notified": 10, "failed": 0 }`,
      },
      {
        status: 400,
        label: "Parâmetro ausente",
        body: `{ "error": "session_id é obrigatório" }`,
      },
      {
        status: 404,
        label: "Sessão não encontrada",
        body: `{ "error": "Sessão não encontrada" }`,
      },
      {
        status: 401,
        label: "Não autorizado",
        body: `{ "error": "Unauthorized" }`,
      },
    ],
    curl: `curl -X POST \\
  ${BASE_URL}/notify-class-cancellation \\
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \\
  -H "apikey: SUA_ANON_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "session_id": "UUID_DA_SESSAO",
    "template_id": "UUID_DO_TEMPLATE"
  }'`,
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handle}>
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function EndpointCard({ ep }: { ep: Endpoint; key?: number }) {
  const [open, setOpen] = useState(false);
  const [activeResponse, setActiveResponse] = useState(0);

  const statusColor = (status: number) => {
    if (status < 300) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    if (status < 500) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    return "bg-red-500/15 text-red-400 border-red-500/30";
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left rounded-lg">
          <Badge variant="outline" className={cn("font-mono text-xs shrink-0 w-14 justify-center", methodColors[ep.method])}>
            {ep.method}
          </Badge>
          <code className="text-sm font-mono text-foreground flex-1 min-w-0 truncate">{ep.path}</code>
          <span className="text-sm text-muted-foreground shrink-0 hidden sm:block">— {ep.summary}</span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-4 pb-6 pt-2 space-y-6 border-t border-border mt-1">
          <p className="text-sm text-muted-foreground leading-relaxed">{ep.description}</p>

          {/* Headers */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Headers</p>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-xs text-muted-foreground">
                    <th className="text-left px-3 py-2 font-medium">Nome</th>
                    <th className="text-left px-3 py-2 font-medium">Obrigatório</th>
                    <th className="text-left px-3 py-2 font-medium">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {ep.headers.map((h) => (
                    <tr key={h.name} className="border-t border-border">
                      <td className="px-3 py-2.5 font-mono text-xs text-primary whitespace-nowrap">{h.name}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", h.required ? "bg-red-500 text-white" : "bg-muted text-muted-foreground")}>
                          {h.required ? "Sim" : "Não"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{h.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Request Body */}
          {ep.body && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">Request Body</p>
              <div className="relative rounded-lg border border-border bg-muted/30">
                <div className="absolute top-2 right-2">
                  <CopyButton text={ep.body} />
                </div>
                <pre className="text-xs font-mono text-muted-foreground p-4 overflow-x-auto">
                  {ep.body}
                </pre>
              </div>
            </div>
          )}

          {/* Responses */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Respostas</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {ep.responses.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setActiveResponse(i)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                    activeResponse === i
                      ? statusColor(r.status)
                      : "border-border text-muted-foreground hover:border-muted-foreground"
                  )}
                >
                  <span className="font-mono">{r.status}</span>
                  {r.label}
                </button>
              ))}
            </div>
            <div className="relative rounded-lg border border-border bg-muted/30">
              <div className="absolute top-2 right-2">
                <CopyButton text={ep.responses[activeResponse]?.body ?? ""} />
              </div>
              <pre className="text-xs font-mono text-muted-foreground p-4 overflow-x-auto">
                {ep.responses[activeResponse]?.body}
              </pre>
            </div>
          </div>

          {/* cURL */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">Exemplo cURL</p>
            <div className="relative rounded-lg border border-border bg-muted/30">
              <div className="absolute top-2 right-2">
                <CopyButton text={ep.curl} />
              </div>
              <pre className="text-xs font-mono text-muted-foreground p-4 overflow-x-auto">
                {ep.curl}
              </pre>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function ApiDocs() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold font-brand flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Documentação da API
        </h2>
        <p className="text-sm text-muted-foreground">
          Endpoints da integração com WhatsApp e IA — {endpoints.length} edge functions disponíveis
        </p>
      </div>

      {/* Auth info */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Autenticação</p>
        <p className="text-sm text-muted-foreground">
          Endpoints admin requerem <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">Authorization: Bearer {"{access_token}"}</code> obtido via login Supabase Auth.
          Endpoints públicos requerem apenas <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">apikey: {"{anon_key}"}</code>.
          O webhook de cobrança usa <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">Authorization: Bearer {"{service_role_key}"}</code>.
        </p>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Base URL</p>
          <div className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-2">
            <code className="text-xs font-mono text-foreground flex-1">{BASE_URL}</code>
            <CopyButton text={BASE_URL} />
          </div>
        </div>
      </div>

      {/* Endpoints */}
      <div className="rounded-lg border border-border divide-y divide-border">
        {endpoints.map((ep, i) => (
          <EndpointCard key={i} ep={ep} />
        ))}
      </div>
    </div>
  );
}
