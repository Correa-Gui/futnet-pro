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
    method: "GET",
    path: "/list-bookings?phone={phone}",
    summary: "Listar reservas por telefone",
    description:
      "Retorna as últimas 5 reservas ativas (não canceladas) de um cliente pelo número de telefone. Utilizado pelo chatbot para exibir reservas e montar o fluxo de cancelamento. Endpoint público.",
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
  "bookings": [
    {
      "id": "uuid-da-reserva",
      "date": "2026-04-05",
      "start_time": "19:00:00",
      "end_time": "20:00:00",
      "status": "requested",
      "courts": { "name": "Quadra 1" }
    }
  ]
}`,
      },
      {
        status: 200,
        label: "Sem reservas",
        body: `{ "bookings": [] }`,
      },
      {
        status: 400,
        label: "Parâmetro ausente",
        body: `{ "error": "phone é obrigatório" }`,
      },
    ],
    curl: `curl -X GET \\
  "${BASE_URL}/list-bookings?phone=5511999999999" \\
  -H "apikey: SUA_ANON_KEY"`,
  },
  {
    method: "POST",
    path: "/cancel-booking",
    summary: "Cancelar reserva pelo chatbot",
    description:
      "Cancela uma reserva verificando se o telefone informado é o mesmo do solicitante. Reservas com status 'paid' não podem ser canceladas pelo chatbot. Usa service role internamente — seguro para chamadas do orquestrador FastAPI.",
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
  "booking_id": "uuid-da-reserva",
  "requester_phone": "5511999999999"
}`,
    responses: [
      {
        status: 200,
        label: "Cancelado",
        body: `{ "status": "cancelado", "message": "Reserva cancelada com sucesso." }`,
      },
      {
        status: 403,
        label: "Telefone não confere",
        body: `{ "error": "Reserva não pertence a este número" }`,
      },
      {
        status: 404,
        label: "Não encontrada",
        body: `{ "error": "Reserva não encontrada" }`,
      },
      {
        status: 409,
        label: "Não cancelável",
        body: `{ "error": "Reservas pagas não podem ser canceladas pelo chatbot. Entre em contato com a equipe." }`,
      },
    ],
    curl: `curl -X POST \\
  ${BASE_URL}/cancel-booking \\
  -H "apikey: SUA_ANON_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "booking_id": "UUID_DA_RESERVA",
    "requester_phone": "5511999999999"
  }'`,
  },
  {
    method: "POST",
    path: "/send-whatsapp",
    summary: "Enviar mensagem WhatsApp",
    description:
      "Envia mensagens WhatsApp via Evolution API para um ou mais destinatários. Suporta mensagem livre ou template com variáveis dinâmicas. Requer autenticação de admin. Registra cada envio na tabela whatsapp_messages.",
    headers: [
      {
        name: "Authorization",
        value: "Bearer {access_token}",
        required: true,
        description: "Token JWT de um usuário admin",
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
    { "phone": "5511999999999", "name": "Nome do Aluno" }
  ],
  "message_body": "Olá {{nome}}! Mensagem livre ou com variáveis.",
  "template_id": "uuid-do-template (opcional)",
  "template_variables": {
    "nome": "João",
    "turma": "Sub-17",
    "horario": "18:00"
  }
}`,
    responses: [
      {
        status: 200,
        label: "Enviado",
        body: `{ "sent": 1, "failed": 0, "results": [{ "phone": "5511999999999", "status": "sent" }] }`,
      },
      {
        status: 401,
        label: "Não autorizado",
        body: `{ "error": "Não autorizado" }`,
      },
    ],
    curl: `curl -X POST \\
  ${BASE_URL}/send-whatsapp \\
  -H "Authorization: Bearer SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "recipients": [{ "phone": "5511999999999", "name": "João" }],
    "message_body": "Olá {{nome}}! Sua aula é amanhã.",
    "template_variables": { "nome": "João" }
  }'`,
  },
  {
    method: "POST",
    path: "/create-pix-payment",
    summary: "Gerar PIX para fatura ou reserva",
    description:
      "Gera um pagamento PIX via Mercado Pago. Aceita invoice_id (fatura de aluno) ou booking_id (reserva de quadra). Para booking_id, o valor é calculado automaticamente como booking.price × reservation_deposit_percentage / 100, configurável em system_config. Requer admin para booking_id; aluno autenticado para invoice_id.",
    headers: [
      {
        name: "Authorization",
        value: "Bearer {access_token}",
        required: true,
        description: "Token JWT (admin para reserva, aluno para fatura)",
      },
      {
        name: "Content-Type",
        value: "application/json",
        required: true,
        description: "Formato do body",
      },
    ],
    body: `// Para fatura de aluno:
{ "invoice_id": "uuid-da-fatura" }

// Para reserva de quadra (admin):
{ "booking_id": "uuid-da-reserva" }`,
    responses: [
      {
        status: 200,
        label: "PIX gerado",
        body: `{
  "qr_code": "00020126...",
  "qr_code_base64": "iVBORw0KGgo...",
  "payment_id": 1234567890,
  "expires_at": "2026-04-02T13:30:00.000Z",
  "deposit_amount": 45.00,
  "deposit_percentage": 30
}`,
      },
      {
        status: 400,
        label: "Erro",
        body: `{ "error": "Reserva não encontrada" }`,
      },
    ],
    curl: `# Para reserva de quadra:
curl -X POST \\
  ${BASE_URL}/create-pix-payment \\
  -H "Authorization: Bearer SEU_TOKEN_ADMIN" \\
  -H "Content-Type: application/json" \\
  -d '{ "booking_id": "UUID_DA_RESERVA" }'`,
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
          Endpoints de negócio chamados pelo chatbot (FastAPI) — {endpoints.length} edge functions disponíveis
        </p>
      </div>

      {/* Auth info */}
      <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Autenticação</p>
        <p className="text-sm text-muted-foreground">
          Todos os endpoints são públicos e requerem apenas <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">apikey: {"{anon_key}"}</code>.
          Chamados pelo orquestrador FastAPI — não expor a anon key no frontend.
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
