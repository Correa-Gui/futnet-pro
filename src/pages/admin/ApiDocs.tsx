import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  BookOpen,
  ChevronDown,
  Search,
  Database,
  Shield,
  Zap,
  Users,
  CalendarDays,
  CreditCard,
  ClipboardCheck,
  MessageCircle,
  LayoutDashboard,
  FileText,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "RPC";

interface ApiEndpoint {
  method: HttpMethod;
  path: string;
  summary: string;
  description: string;
  auth?: string;
  headers?: { name: string; value: string; description: string }[];
  params?: { name: string; type: string; required: boolean; description: string }[];
  response?: string;
}

interface ApiSection {
  title: string;
  icon: React.ReactNode;
  description: string;
  endpoints: ApiEndpoint[];
}

const methodColors: Record<HttpMethod, string> = {
  GET: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  POST: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  PUT: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  PATCH: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/30",
  RPC: "bg-violet-500/15 text-violet-400 border-violet-500/30",
};

// Headers reutilizáveis
const H_AUTH_ADMIN = [
  { name: "Authorization", value: "Bearer {access_token}", description: "JWT do usuário admin autenticado" },
  { name: "apikey", value: "{anon_key}", description: "Chave pública do projeto Supabase" },
  { name: "Content-Type", value: "application/json", description: "Formato do body" },
];
const H_AUTH_USER = [
  { name: "Authorization", value: "Bearer {access_token}", description: "JWT do usuário autenticado" },
  { name: "apikey", value: "{anon_key}", description: "Chave pública do projeto Supabase" },
  { name: "Content-Type", value: "application/json", description: "Formato do body" },
];
const H_ANON = [
  { name: "apikey", value: "{anon_key}", description: "Chave pública do projeto Supabase" },
  { name: "Content-Type", value: "application/json", description: "Formato do body" },
];

const apiSections: ApiSection[] = [
  {
    title: "Autenticação",
    icon: <Shield className="h-5 w-5" />,
    description: "Login, registro e gerenciamento de sessão via Supabase Auth REST API.",
    endpoints: [
      {
        method: "POST",
        path: "/auth/v1/signup",
        summary: "Registrar novo usuário",
        description:
          "Cria um novo usuário com email e senha. Automaticamente cria profile, user_role (student) e student_profile via trigger handle_new_user.",
        auth: "anon",
        headers: [
          { name: "apikey", value: "{anon_key}", description: "Chave pública do projeto Supabase" },
          { name: "Content-Type", value: "application/json", description: "Formato do body" },
        ],
        params: [
          { name: "email", type: "string", required: true, description: "Email do usuário" },
          { name: "password", type: "string", required: true, description: "Senha (min 6 caracteres)" },
          { name: "data.full_name", type: "string", required: true, description: "Nome completo (via user_metadata)" },
        ],
        response: `{ user: { id, email }, session: { access_token, refresh_token } }`,
      },
      {
        method: "POST",
        path: "/auth/v1/token?grant_type=password",
        summary: "Login com email/senha",
        description: "Autentica o usuário e retorna sessão com JWT. O role é verificado via RPC get_user_role para redirecionamento.",
        auth: "anon",
        headers: [
          { name: "apikey", value: "{anon_key}", description: "Chave pública do projeto Supabase" },
          { name: "Content-Type", value: "application/json", description: "Formato do body" },
        ],
        params: [
          { name: "email", type: "string", required: true, description: "Email cadastrado" },
          { name: "password", type: "string", required: true, description: "Senha do usuário" },
        ],
        response: `{ access_token, refresh_token, token_type: "bearer", user: { id, email } }`,
      },
      {
        method: "POST",
        path: "/auth/v1/recover",
        summary: "Solicitar reset de senha",
        description: "Envia email com link de redefinição de senha.",
        auth: "anon",
        headers: [
          { name: "apikey", value: "{anon_key}", description: "Chave pública do projeto Supabase" },
          { name: "Content-Type", value: "application/json", description: "Formato do body" },
        ],
        params: [
          { name: "email", type: "string", required: true, description: "Email cadastrado" },
        ],
      },
      {
        method: "RPC",
        path: "/rest/v1/rpc/get_user_role",
        summary: "Obter role do usuário",
        description: "Retorna o role (admin, teacher, student) do usuário autenticado. Usa SECURITY DEFINER para evitar recursão RLS.",
        auth: "authenticated",
        headers: H_AUTH_USER,
        params: [
          { name: "_user_id", type: "uuid", required: true, description: "ID do usuário (auth.uid())" },
        ],
        response: `"admin" | "teacher" | "student"`,
      },
      {
        method: "RPC",
        path: "/rest/v1/rpc/has_role",
        summary: "Verificar role específico",
        description: "Retorna boolean se o usuário possui determinado role. Usado internamente pelas RLS policies e edge functions.",
        auth: "authenticated",
        headers: H_AUTH_USER,
        params: [
          { name: "_user_id", type: "uuid", required: true, description: "ID do usuário" },
          { name: "_role", type: "app_role", required: true, description: "admin | teacher | student" },
        ],
        response: `boolean`,
      },
    ],
  },
  {
    title: "Alunos",
    icon: <Users className="h-5 w-5" />,
    description: "CRUD de perfis de alunos, planos e matrículas.",
    endpoints: [
      {
        method: "GET",
        path: "/rest/v1/profiles?select=*,student_profiles(*,plans(*))",
        summary: "Listar alunos com perfil e plano",
        description: "Retorna todos os perfis de alunos com dados do student_profile e plano associado. Admin only via RLS.",
        auth: "admin",
        headers: H_AUTH_ADMIN,
        response: `[{ id, full_name, email, phone, cpf, status, student_profiles: { skill_level, plan_id, plans: { name, monthly_price } } }]`,
      },
      {
        method: "POST",
        path: "/functions/v1/create-user",
        summary: "Criar aluno",
        description: "Cria usuário via admin com email, nome, plano e turma. Gera senha automática, cria profile, student_profile, enrollment e primeira fatura.",
        auth: "admin",
        headers: H_AUTH_ADMIN,
        params: [
          { name: "email", type: "string", required: true, description: "Email do aluno" },
          { name: "full_name", type: "string", required: true, description: "Nome completo" },
          { name: "phone", type: "string", required: false, description: "Telefone" },
          { name: "plan_id", type: "uuid", required: false, description: "ID do plano" },
          { name: "class_id", type: "uuid", required: false, description: "ID da turma para matrícula" },
        ],
        response: `{ user_id, generated_password }`,
      },
      {
        method: "PATCH",
        path: "/rest/v1/profiles?id=eq.{id}",
        summary: "Atualizar perfil do aluno",
        description: "Atualiza dados pessoais (nome, telefone, CPF, data de nascimento). Alunos podem editar o próprio perfil; admins podem editar qualquer um.",
        auth: "authenticated",
        headers: [...H_AUTH_USER, { name: "Prefer", value: "return=representation", description: "Retorna o registro atualizado" }],
        params: [
          { name: "full_name", type: "string", required: false, description: "Nome completo" },
          { name: "phone", type: "string", required: false, description: "Telefone" },
          { name: "cpf", type: "string", required: false, description: "CPF" },
          { name: "birth_date", type: "date", required: false, description: "Data de nascimento" },
          { name: "status", type: "user_status", required: false, description: "active | inactive | suspended | defaulter" },
        ],
      },
      {
        method: "POST",
        path: "/rest/v1/enrollments",
        summary: "Matricular aluno em turma",
        description: "Cria enrollment vinculando aluno a uma turma. Verifica max_students da turma antes de criar.",
        auth: "admin",
        headers: H_AUTH_ADMIN,
        params: [
          { name: "student_id", type: "uuid", required: true, description: "ID do student_profile" },
          { name: "class_id", type: "uuid", required: true, description: "ID da turma" },
          { name: "status", type: "enrollment_status", required: false, description: "Default: active" },
        ],
      },
    ],
  },
  {
    title: "Turmas & Sessões",
    icon: <CalendarDays className="h-5 w-5" />,
    description: "Gerenciamento de turmas, geração de sessões e calendário.",
    endpoints: [
      {
        method: "GET",
        path: "/rest/v1/classes?select=*,courts(*),teacher_profiles(*,profiles(*))",
        summary: "Listar turmas com detalhes",
        description: "Retorna todas as turmas com quadra, professor e horários. Turmas ativas visíveis para anon; todas visíveis para admin.",
        auth: "public (active) / admin (all)",
        headers: H_ANON,
        response: `[{ id, name, day_of_week, start_time, end_time, level, max_students, status, courts: {...}, teacher_profiles: { profiles: { full_name } } }]`,
      },
      {
        method: "POST",
        path: "/rest/v1/classes",
        summary: "Criar nova turma",
        description: "Cria turma com nome, professor, quadra, dias da semana e horários.",
        auth: "admin",
        headers: H_AUTH_ADMIN,
        params: [
          { name: "name", type: "string", required: true, description: "Nome da turma" },
          { name: "teacher_id", type: "uuid", required: true, description: "ID do professor" },
          { name: "court_id", type: "uuid", required: true, description: "ID da quadra" },
          { name: "day_of_week", type: "number[]", required: true, description: "Dias da semana (0=Dom, 6=Sáb)" },
          { name: "start_time", type: "time", required: true, description: "Horário de início (HH:MM)" },
          { name: "end_time", type: "time", required: true, description: "Horário de término" },
          { name: "level", type: "skill_level", required: false, description: "beginner | elementary | intermediate | advanced" },
          { name: "max_students", type: "number", required: false, description: "Máximo de alunos (default: 12)" },
        ],
      },
      {
        method: "POST",
        path: "/functions/v1/generate-sessions",
        summary: "Gerar sessões de aula",
        description: "Gera class_sessions para um período futuro baseado nos day_of_week da turma. Evita duplicatas por (class_id, date).",
        auth: "admin",
        headers: H_AUTH_ADMIN,
        params: [
          { name: "class_id", type: "uuid", required: true, description: "ID da turma" },
          { name: "weeks_ahead", type: "number", required: false, description: "Semanas à frente (default: 4)" },
        ],
        response: `{ created: number }`,
      },
      {
        method: "GET",
        path: "/rest/v1/class_sessions?select=*,classes(*)",
        summary: "Listar sessões de aula",
        description: "Retorna sessões filtradas por data, turma ou status. Adicionar filtros via query params: ?class_id=eq.{uuid}&date=gte.{YYYY-MM-DD}&status=eq.scheduled",
        auth: "public (read) / admin (manage)",
        headers: H_ANON,
        response: `[{ id, class_id, date, status, classes: { name, start_time, end_time } }]`,
      },
    ],
  },
  {
    title: "Presenças",
    icon: <ClipboardCheck className="h-5 w-5" />,
    description: "Registro e confirmação de presenças dos alunos.",
    endpoints: [
      {
        method: "GET",
        path: "/rest/v1/attendances?select=*,student_profiles(*,profiles(*)),class_sessions(*,classes(*))",
        summary: "Listar presenças de uma sessão",
        description: "Retorna todas as presenças com dados do aluno e sessão. Filtrar por sessão: ?session_id=eq.{uuid}. Admins veem tudo; alunos veem apenas as próprias via RLS.",
        auth: "authenticated",
        headers: H_AUTH_USER,
        response: `[{ id, status, confirmed_at, student_profiles: { profiles: { full_name } }, class_sessions: { date, classes: { name } } }]`,
      },
      {
        method: "POST",
        path: "/rest/v1/attendances",
        summary: "Registrar presença",
        description: "Cria registro de presença para um aluno em uma sessão. Status inicial: not_confirmed.",
        auth: "admin",
        headers: H_AUTH_ADMIN,
        params: [
          { name: "session_id", type: "uuid", required: true, description: "ID da sessão" },
          { name: "student_id", type: "uuid", required: true, description: "ID do student_profile" },
          { name: "status", type: "attendance_status", required: false, description: "confirmed | cancelled | not_confirmed | present | absent" },
        ],
      },
      {
        method: "PATCH",
        path: "/rest/v1/attendances?id=eq.{id}",
        summary: "Atualizar status de presença",
        description: "Atualiza o status da presença. Alunos podem confirmar/cancelar; professores podem marcar present/absent. Trigger update_skill_level_on_attendance atualiza automaticamente o nível do aluno.",
        auth: "authenticated",
        headers: H_AUTH_USER,
        params: [
          { name: "status", type: "attendance_status", required: true, description: "confirmed | cancelled | not_confirmed | present | absent" },
          { name: "confirmed_at", type: "timestamp", required: false, description: "Data/hora da confirmação (ISO 8601)" },
        ],
      },
    ],
  },
  {
    title: "Agendamento de Quadras",
    icon: <LayoutDashboard className="h-5 w-5" />,
    description: "Reserva pública de quadras e gerenciamento de bookings.",
    endpoints: [
      {
        method: "GET",
        path: "/rest/v1/courts?is_active=eq.true",
        summary: "Listar quadras disponíveis",
        description: "Retorna quadras ativas com nome, localização e tipo de superfície. Pública para fluxo de reserva.",
        auth: "public",
        headers: H_ANON,
        response: `[{ id, name, location, surface_type, is_active }]`,
      },
      {
        method: "POST",
        path: "/rest/v1/court_bookings",
        summary: "Criar solicitação de reserva",
        description: "Cria reserva com status 'requested'. Valida conflitos no frontend via consulta prévia de bookings e class_sessions no mesmo horário. Público (não requer login). Para reserva com validação automática, use a Edge Function court-availability (POST).",
        auth: "public",
        headers: H_ANON,
        params: [
          { name: "court_id", type: "uuid", required: true, description: "ID da quadra" },
          { name: "date", type: "date", required: true, description: "Data da reserva (YYYY-MM-DD)" },
          { name: "start_time", type: "time", required: true, description: "Horário de início (HH:MM)" },
          { name: "end_time", type: "time", required: true, description: "Horário de término (HH:MM)" },
          { name: "requester_name", type: "string", required: true, description: "Nome do solicitante" },
          { name: "requester_phone", type: "string", required: true, description: "Telefone WhatsApp" },
          { name: "price", type: "number", required: false, description: "Valor da reserva (R$)" },
        ],
        response: `{ id, court_id, date, start_time, end_time, status: "requested" }`,
      },
      {
        method: "PATCH",
        path: "/rest/v1/court_bookings?id=eq.{id}",
        summary: "Atualizar status de reserva",
        description: "Admin confirma, cancela ou marca como pago. Fluxo: requested → confirmed → paid | cancelled.",
        auth: "admin",
        headers: H_AUTH_ADMIN,
        params: [
          { name: "status", type: "booking_status", required: true, description: "requested | confirmed | paid | cancelled" },
        ],
      },
    ],
  },
  {
    title: "Faturas & Pagamentos",
    icon: <CreditCard className="h-5 w-5" />,
    description: "Geração de faturas, pagamento via PIX (Mercado Pago) e webhooks.",
    endpoints: [
      {
        method: "GET",
        path: "/rest/v1/invoices?select=*,student_profiles(*,profiles(*))",
        summary: "Listar faturas",
        description: "Admins veem todas as faturas; alunos veem apenas as próprias via RLS. Filtrar por status: ?status=eq.pending. Inclui dados PIX quando gerados.",
        auth: "authenticated",
        headers: H_AUTH_USER,
        response: `[{ id, amount, discount, due_date, reference_month, status, pix_qr_code, pix_copy_paste, student_profiles: { profiles: { full_name, phone } } }]`,
      },
      {
        method: "POST",
        path: "/rest/v1/invoices",
        summary: "Gerar fatura individual",
        description: "Cria fatura para um aluno. Validação anti-duplicidade (mesmo student_id + reference_month + status pending/paid) feita no frontend antes do insert.",
        auth: "admin",
        headers: H_AUTH_ADMIN,
        params: [
          { name: "student_id", type: "uuid", required: true, description: "ID do student_profile" },
          { name: "amount", type: "number", required: true, description: "Valor da fatura (R$)" },
          { name: "due_date", type: "date", required: true, description: "Data de vencimento (YYYY-MM-DD)" },
          { name: "reference_month", type: "string", required: true, description: "Mês referência (YYYY-MM)" },
          { name: "discount", type: "number", required: false, description: "Desconto aplicado (R$)" },
          { name: "notes", type: "string", required: false, description: "Observações" },
        ],
        response: `{ id, amount, due_date, status: "pending" }`,
      },
      {
        method: "POST",
        path: "/functions/v1/create-pix-payment",
        summary: "Gerar pagamento PIX",
        description: "Integra com Mercado Pago para gerar QR Code PIX. Expira em 30 min. Salva pix_qr_code e pix_copy_paste na fatura. Usa chave de idempotência dinâmica (invoice_id + timestamp).",
        auth: "authenticated",
        headers: H_AUTH_USER,
        params: [
          { name: "invoice_id", type: "uuid", required: true, description: "ID da fatura" },
        ],
        response: `{ qr_code, qr_code_base64, copy_paste, payment_id }`,
      },
      {
        method: "POST",
        path: "/functions/v1/mercadopago-webhook",
        summary: "Webhook Mercado Pago",
        description: "Chamado automaticamente pelo Mercado Pago ao confirmar pagamento. Valida assinatura via HMAC SHA256 (header x-signature). Atualiza invoices.status para 'paid'. NÃO chamar manualmente.",
        auth: "webhook",
        headers: [
          { name: "x-signature", value: "ts={timestamp},v1={hmac}", description: "Assinatura HMAC SHA256 enviada pelo Mercado Pago" },
          { name: "Content-Type", value: "application/json", description: "Formato do body" },
        ],
        response: `{ received: true }`,
      },
    ],
  },
  {
    title: "Planos",
    icon: <FileText className="h-5 w-5" />,
    description: "Gerenciamento de planos de assinatura.",
    endpoints: [
      {
        method: "GET",
        path: "/rest/v1/plans?is_active=eq.true",
        summary: "Listar planos ativos",
        description: "Planos ativos visíveis publicamente. Admin pode listar todos removendo o filtro is_active.",
        auth: "public",
        headers: H_ANON,
        response: `[{ id, name, classes_per_week, monthly_price, description, is_active }]`,
      },
      {
        method: "POST",
        path: "/rest/v1/plans",
        summary: "Criar plano",
        auth: "admin",
        description: "Cria novo plano com nome, preço mensal e quantidade de aulas por semana.",
        headers: H_AUTH_ADMIN,
        params: [
          { name: "name", type: "string", required: true, description: "Nome do plano" },
          { name: "classes_per_week", type: "number", required: true, description: "Aulas por semana" },
          { name: "monthly_price", type: "number", required: true, description: "Preço mensal (R$)" },
          { name: "description", type: "string", required: false, description: "Descrição" },
        ],
        response: `{ id, name, classes_per_week, monthly_price, is_active: true }`,
      },
    ],
  },
  {
    title: "WhatsApp",
    icon: <MessageCircle className="h-5 w-5" />,
    description: "Envio de mensagens via WhatsApp (Evolution API). Suporta texto livre, templates e substituição de variáveis {{variavel}}.",
    endpoints: [
      {
        method: "POST",
        path: "/functions/v1/send-whatsapp",
        summary: "Enviar mensagem WhatsApp",
        description: "Envia mensagem de texto para um ou mais destinatários via Evolution API. Suporta template_variables para substituição de {{variavel}} no message_body. Requer role admin.",
        auth: "admin",
        headers: H_AUTH_ADMIN,
        params: [
          { name: "recipients", type: "array", required: true, description: "[{ phone: string, name?: string, student_id?: uuid }]" },
          { name: "message_body", type: "string", required: false, description: "Texto da mensagem. Pode conter {{variavel}} para substituição." },
          { name: "template_id", type: "uuid", required: false, description: "ID do template salvo em whatsapp_templates" },
          { name: "template_variables", type: "object", required: false, description: "Mapa de substituição: { nome: 'João', turma: 'Sub-11', valor: 'R$150,00' }" },
        ],
        response: `{ sent: number, failed: number, results: [{ phone, success, messageId?, error? }] }`,
      },
      {
        method: "GET",
        path: "/rest/v1/whatsapp_messages?select=*&order=sent_at.desc",
        summary: "Histórico de mensagens enviadas",
        description: "Retorna log de todas as mensagens enviadas. Filtrar por status: ?status=eq.failed. Filtrar por aluno: ?student_id=eq.{uuid}.",
        auth: "admin",
        headers: H_AUTH_ADMIN,
        response: `[{ id, recipient_phone, recipient_name, message_body, status, sent_at, error_message, whatsapp_message_id, template_id }]`,
      },
    ],
  },
  {
    title: "Templates de Mensagem",
    icon: <FileText className="h-5 w-5" />,
    description: "Cadastro e gerenciamento de templates com variáveis dinâmicas {{variavel}}. Variáveis disponíveis: {{nome}}, {{turma}}, {{data}}, {{professor}}, {{valor}}, {{data_vencimento}}, {{pix_copy_paste}}, {{quadra}}, {{horario}}.",
    endpoints: [
      {
        method: "GET",
        path: "/rest/v1/whatsapp_templates?is_active=eq.true",
        summary: "Listar templates ativos",
        description: "Retorna todos os templates ativos com nome, corpo e variáveis. Remove o filtro is_active para listar todos (admin).",
        auth: "admin",
        headers: H_AUTH_ADMIN,
        response: `[{ id, name, body, category, variables: string[], is_active }]`,
      },
      {
        method: "POST",
        path: "/rest/v1/whatsapp_templates",
        summary: "Criar template",
        description: "Cria template com corpo e lista de variáveis. As variáveis no body devem estar no formato {{nome_var}}.",
        auth: "admin",
        headers: H_AUTH_ADMIN,
        params: [
          { name: "name", type: "string", required: true, description: "Nome identificador do template" },
          { name: "body", type: "string", required: true, description: "Ex: Olá, {{nome}}! Sua fatura de {{valor}} vence em {{data_vencimento}}." },
          { name: "category", type: "string", required: false, description: "cobranca | cancelamento | agendamento | boas_vindas | geral" },
          { name: "variables", type: "string[]", required: false, description: "['nome', 'valor', 'data_vencimento'] — lista das variáveis usadas no body" },
          { name: "is_active", type: "boolean", required: false, description: "Default: true" },
        ],
        response: `{ id, name, body, category, variables, is_active }`,
      },
      {
        method: "PATCH",
        path: "/rest/v1/whatsapp_templates?id=eq.{id}",
        summary: "Atualizar template",
        description: "Atualiza corpo, categoria ou status. Ao alterar body, atualizar variables para manter consistência.",
        auth: "admin",
        headers: H_AUTH_ADMIN,
        params: [
          { name: "body", type: "string", required: false, description: "Novo corpo com variáveis {{...}}" },
          { name: "variables", type: "string[]", required: false, description: "Nova lista de variáveis" },
          { name: "is_active", type: "boolean", required: false, description: "true | false" },
        ],
      },
    ],
  },
  {
    title: "WhatsApp & IA",
    icon: <Bot className="h-5 w-5" />,
    description: "Edge Functions para automações via IA/bot: webhook receptor de mensagens, disponibilidade de quadra, cobranças automáticas e notificações em batch.",
    endpoints: [
      {
        method: "POST",
        path: "/functions/v1/whatsapp-webhook",
        summary: "Webhook receptor (Evolution API)",
        description: "Receptor de eventos enviados pelo Evolution API. Configurar na Evolution como URL de webhook com evento messages.upsert. Extrai número e texto da mensagem, registra no histórico e contém o ponto de integração para o agente de IA (bloco comentado no código). Validação via header x-webhook-secret (env: WHATSAPP_WEBHOOK_SECRET).",
        auth: "webhook",
        headers: [
          { name: "x-webhook-secret", value: "{WHATSAPP_WEBHOOK_SECRET}", description: "Secret configurado na env var — validação opcional mas recomendada" },
          { name: "Content-Type", value: "application/json", description: "Formato do body enviado pelo Evolution API" },
        ],
        params: [
          { name: "event", type: "string", required: true, description: "messages.upsert — tipo do evento Evolution API" },
          { name: "data.key.remoteJid", type: "string", required: true, description: "Remetente: 5511999999999@s.whatsapp.net" },
          { name: "data.key.fromMe", type: "boolean", required: true, description: "Mensagens do próprio bot são ignoradas automaticamente" },
          { name: "data.message.conversation", type: "string", required: false, description: "Texto da mensagem (ou data.message.extendedTextMessage.text)" },
        ],
        response: `{ status: "processed" | "ignored", phone?: string, message_length?: number }`,
      },
      {
        method: "GET",
        path: "/functions/v1/court-availability?court_id={uuid}&date={YYYY-MM-DD}",
        summary: "Consultar slots disponíveis de quadra",
        description: "Retorna slots horários livres em uma data. Desconta reservas confirmadas/pagas (court_bookings) e sessões de aula agendadas (class_sessions). Horários calculados a partir de business_hours no system_config (padrão: 08h–22h, slots de 1h).",
        auth: "public",
        headers: H_ANON,
        params: [
          { name: "court_id", type: "uuid", required: true, description: "ID da quadra (query string)" },
          { name: "date", type: "string", required: true, description: "Data no formato YYYY-MM-DD (query string)" },
        ],
        response: `{ date, court_id, court_name, available_slots: [{ start: "HH:MM", end: "HH:MM" }] }`,
      },
      {
        method: "POST",
        path: "/functions/v1/court-availability",
        summary: "Reservar quadra via bot",
        description: "Cria reserva com status 'requested' com validação automática de conflito contra court_bookings (requested/confirmed/paid) e class_sessions. Use este endpoint (não o REST direto) quando o agente de IA criar reservas.",
        auth: "public",
        headers: H_ANON,
        params: [
          { name: "court_id", type: "uuid", required: true, description: "ID da quadra" },
          { name: "date", type: "string", required: true, description: "Data (YYYY-MM-DD)" },
          { name: "start_time", type: "string", required: true, description: "Início (HH:MM)" },
          { name: "end_time", type: "string", required: true, description: "Término (HH:MM)" },
          { name: "requester_name", type: "string", required: true, description: "Nome do solicitante" },
          { name: "requester_phone", type: "string", required: true, description: "Telefone com DDI: 5511999999999" },
          { name: "price", type: "number", required: false, description: "Valor da reserva (R$)" },
        ],
        response: `{ booking_id, status: "requested", message: string }`,
      },
      {
        method: "POST",
        path: "/functions/v1/send-invoice-reminders",
        summary: "Disparar lembretes de cobrança",
        description: "Envia WhatsApp para alunos com faturas pendentes. Regras: profiles.status='active' + invoices.status='pending' com due_date = CURRENT_DATE + days_before_due. Variáveis do template: {{nome}}, {{valor}}, {{data_vencimento}}, {{pix_copy_paste}}. Ideal como cron job diário (service role).",
        auth: "service_role",
        headers: [
          { name: "Authorization", value: "Bearer {service_role_key}", description: "Service role key do Supabase — NÃO expor no frontend" },
          { name: "Content-Type", value: "application/json", description: "Formato do body" },
        ],
        params: [
          { name: "days_before_due", type: "number", required: false, description: "Dias antes do vencimento (default: 3)" },
          { name: "template_id", type: "uuid", required: false, description: "ID do template — usa mensagem padrão se omitido" },
        ],
        response: `{ sent: number, skipped: number, failed: number }`,
      },
      {
        method: "POST",
        path: "/functions/v1/notify-class-cancellation",
        summary: "Notificar cancelamento de aula",
        description: "Notifica em batch todos os alunos com attendance confirmed|not_confirmed em uma sessão. Variáveis do template: {{nome}}, {{turma}}, {{data}}, {{professor}}. Atualiza class_sessions.status='cancelled' APÓS enviar todas as notificações.",
        auth: "admin",
        headers: H_AUTH_ADMIN,
        params: [
          { name: "session_id", type: "uuid", required: true, description: "ID da sessão (class_sessions)" },
          { name: "template_id", type: "uuid", required: false, description: "ID do template de cancelamento" },
          { name: "custom_message", type: "string", required: false, description: "Mensagem personalizada — sobrescreve template se fornecida" },
        ],
        response: `{ notified: number, failed: number }`,
      },
    ],
  },
  {
    title: "Aulas Teste",
    icon: <Zap className="h-5 w-5" />,
    description: "Funil de captação via formulário de aula teste na landing page.",
    endpoints: [
      {
        method: "POST",
        path: "/rest/v1/trial_requests",
        summary: "Solicitar aula teste",
        description: "Formulário público na landing page. Cria solicitação com status 'pending'. Não requer login.",
        auth: "public",
        headers: H_ANON,
        params: [
          { name: "name", type: "string", required: true, description: "Nome do interessado" },
          { name: "phone", type: "string", required: true, description: "Telefone WhatsApp" },
          { name: "email", type: "string", required: false, description: "Email" },
          { name: "preferred_class_id", type: "uuid", required: false, description: "ID da turma preferida" },
          { name: "preferred_date", type: "date", required: false, description: "Data preferida (YYYY-MM-DD)" },
        ],
        response: `{ id, name, phone, status: "pending" }`,
      },
      {
        method: "PATCH",
        path: "/rest/v1/trial_requests?id=eq.{id}",
        summary: "Atualizar status da solicitação",
        description: "Admin aprova, rejeita ou marca como concluída/no-show.",
        auth: "admin",
        headers: H_AUTH_ADMIN,
        params: [
          { name: "status", type: "trial_status", required: true, description: "pending | approved | rejected | completed | no_show" },
          { name: "admin_notes", type: "string", required: false, description: "Observações internas do admin" },
        ],
      },
    ],
  },
  {
    title: "Configurações do Sistema",
    icon: <Database className="h-5 w-5" />,
    description: "Configurações globais: horários de funcionamento, landing page e notificações.",
    endpoints: [
      {
        method: "GET",
        path: "/rest/v1/system_config",
        summary: "Listar configurações do sistema",
        description: "Retorna key-value pairs de configuração global. Chave relevante: business_hours (usado por court-availability para calcular slots). Leitura autenticada; escrita apenas admin.",
        auth: "authenticated",
        headers: H_AUTH_USER,
        response: `[{ key: "business_hours", value: '{"open_days":[1,2,3,4,5,6],"open_hour":8,"close_hour":22}' }]`,
      },
      {
        method: "PATCH",
        path: "/rest/v1/system_config?key=eq.{key}",
        summary: "Atualizar configuração",
        description: "Atualiza o valor de uma configuração por chave. Ex: atualizar business_hours para ajustar os slots disponíveis no agendamento de quadras.",
        auth: "admin",
        headers: H_AUTH_ADMIN,
        params: [
          { name: "value", type: "string (JSON)", required: true, description: "Novo valor serializado como JSON string" },
        ],
      },
      {
        method: "GET",
        path: "/rest/v1/landing_page_settings",
        summary: "Configurações da landing page",
        description: "Retorna business_mode, número WhatsApp, Instagram, YouTube, CTA e imagem hero. Pública.",
        auth: "public",
        headers: H_ANON,
        response: `{ whatsapp_number, instagram_url, youtube_url, primary_cta_text, business_mode }`,
      },
      {
        method: "GET",
        path: "/rest/v1/landing_page_config?order=display_order.asc",
        summary: "Seções da landing page",
        description: "Retorna seções configuráveis (hero, about, benefits, etc.) com visibilidade e ordem de exibição.",
        auth: "public",
        headers: H_ANON,
        response: `[{ section_key, title, subtitle, content, image_url, is_visible, display_order }]`,
      },
    ],
  },
];

function EndpointCard({ endpoint }: { endpoint: ApiEndpoint }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left">
          <Badge variant="outline" className={cn("font-mono text-xs shrink-0 px-2", methodColors[endpoint.method])}>
            {endpoint.method}
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground truncate">{endpoint.summary}</p>
            <p className="text-xs text-muted-foreground font-mono truncate">{endpoint.path}</p>
          </div>
          {endpoint.auth && (
            <Badge variant="secondary" className="text-xs shrink-0">{endpoint.auth}</Badge>
          )}
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 pb-4 space-y-3">
          <p className="text-sm text-muted-foreground">{endpoint.description}</p>

          {endpoint.headers && endpoint.headers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Headers</p>
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-2 font-medium">Header</th>
                      <th className="text-left p-2 font-medium">Valor</th>
                      <th className="text-left p-2 font-medium">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoint.headers.map((h) => (
                      <tr key={h.name} className="border-t border-border">
                        <td className="p-2 font-mono text-primary">{h.name}</td>
                        <td className="p-2 font-mono text-muted-foreground">{h.value}</td>
                        <td className="p-2 text-muted-foreground">{h.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {endpoint.params && endpoint.params.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-2">Parâmetros</p>
              <div className="rounded-md border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-2 font-medium">Nome</th>
                      <th className="text-left p-2 font-medium">Tipo</th>
                      <th className="text-left p-2 font-medium">Obrigatório</th>
                      <th className="text-left p-2 font-medium">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {endpoint.params.map((p) => (
                      <tr key={p.name} className="border-t border-border">
                        <td className="p-2 font-mono text-primary">{p.name}</td>
                        <td className="p-2 text-muted-foreground">{p.type}</td>
                        <td className="p-2">{p.required ? "✓" : "—"}</td>
                        <td className="p-2 text-muted-foreground">{p.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {endpoint.response && (
            <div>
              <p className="text-xs font-semibold text-foreground mb-1">Resposta</p>
              <pre className="bg-muted/50 rounded-md p-2 text-xs font-mono text-muted-foreground overflow-x-auto">
                {endpoint.response}
              </pre>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function ApiDocs() {
  const [search, setSearch] = useState("");

  const filteredSections = apiSections
    .map((section) => ({
      ...section,
      endpoints: section.endpoints.filter(
        (e) =>
          !search ||
          e.summary.toLowerCase().includes(search.toLowerCase()) ||
          e.path.toLowerCase().includes(search.toLowerCase()) ||
          e.description.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((s) => s.endpoints.length > 0);

  const totalEndpoints = apiSections.reduce((acc, s) => acc + s.endpoints.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-brand flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Documentação da API
        </h2>
        <p className="text-sm text-muted-foreground">
          Referência completa das funções, endpoints e componentes do sistema — {totalEndpoints} endpoints documentados
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar endpoints..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="space-y-4 pr-4">
          {filteredSections.map((section) => (
            <Card key={section.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  {section.icon}
                  {section.title}
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {section.endpoints.length} endpoint{section.endpoints.length !== 1 ? "s" : ""}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <Separator className="mb-2" />
                <div className="space-y-1">
                  {section.endpoints.map((ep, i) => (
                    <EndpointCard key={i} endpoint={ep} />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredSections.length === 0 && (
            <p className="text-center text-muted-foreground py-12">
              Nenhum endpoint encontrado para "{search}"
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
