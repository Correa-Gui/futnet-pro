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
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "RPC";

interface ApiEndpoint {
  method: HttpMethod;
  path: string;
  summary: string;
  description: string;
  auth?: string;
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

const apiSections: ApiSection[] = [
  {
    title: "Autenticação",
    icon: <Shield className="h-5 w-5" />,
    description: "Login, registro e gerenciamento de sessão via Supabase Auth.",
    endpoints: [
      {
        method: "POST",
        path: "supabase.auth.signUp()",
        summary: "Registrar novo usuário",
        description:
          "Cria um novo usuário com email e senha. Automaticamente cria profile, user_role (student) e student_profile via trigger handle_new_user.",
        params: [
          { name: "email", type: "string", required: true, description: "Email do usuário" },
          { name: "password", type: "string", required: true, description: "Senha (min 6 caracteres)" },
          { name: "full_name", type: "string", required: true, description: "Nome completo (via metadata)" },
        ],
        response: `{ user: { id, email }, session: { access_token } }`,
      },
      {
        method: "POST",
        path: "supabase.auth.signInWithPassword()",
        summary: "Login com email/senha",
        description: "Autentica o usuário e retorna sessão com JWT. O role é verificado via RPC get_user_role para redirecionamento.",
        params: [
          { name: "email", type: "string", required: true, description: "Email cadastrado" },
          { name: "password", type: "string", required: true, description: "Senha do usuário" },
        ],
        response: `{ user, session: { access_token, refresh_token } }`,
      },
      {
        method: "POST",
        path: "supabase.auth.resetPasswordForEmail()",
        summary: "Solicitar reset de senha",
        description: "Envia email com link de redefinição de senha.",
        params: [
          { name: "email", type: "string", required: true, description: "Email cadastrado" },
        ],
      },
      {
        method: "RPC",
        path: "supabase.rpc('get_user_role')",
        summary: "Obter role do usuário",
        description: "Retorna o role (admin, teacher, student) do usuário autenticado. Usa SECURITY DEFINER para evitar recursão RLS.",
        auth: "authenticated",
        params: [
          { name: "_user_id", type: "uuid", required: true, description: "ID do usuário (auth.uid())" },
        ],
        response: `"admin" | "teacher" | "student"`,
      },
      {
        method: "RPC",
        path: "supabase.rpc('has_role')",
        summary: "Verificar role específico",
        description: "Retorna boolean se o usuário possui determinado role. Usado internamente pelas RLS policies.",
        auth: "authenticated",
        params: [
          { name: "_user_id", type: "uuid", required: true, description: "ID do usuário" },
          { name: "_role", type: "app_role", required: true, description: "Role a verificar" },
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
        path: "supabase.from('profiles').select('*, student_profiles(*, plans(*))')",
        summary: "Listar alunos com perfil e plano",
        description: "Retorna todos os perfis de alunos com dados do student_profile e plano associado. Admin only via RLS.",
        auth: "admin",
        response: `[{ id, full_name, email, phone, cpf, status, student_profiles: { skill_level, plan_id, plans: { name, monthly_price } } }]`,
      },
      {
        method: "POST",
        path: "supabase.functions.invoke('create-user')",
        summary: "Criar aluno (Edge Function)",
        description: "Cria usuário via admin com email, nome, plano e turma. Gera senha automática, cria profile, student_profile, enrollment e primeira fatura.",
        auth: "admin",
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
        path: "supabase.from('profiles').update()",
        summary: "Atualizar perfil do aluno",
        description: "Atualiza dados pessoais (nome, telefone, CPF, data de nascimento). Alunos podem editar o próprio perfil; admins podem editar qualquer um.",
        auth: "authenticated",
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
        path: "supabase.from('enrollments').insert()",
        summary: "Matricular aluno em turma",
        description: "Cria enrollment vinculando aluno a uma turma. Verifica max_students da turma antes de criar.",
        auth: "admin",
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
        path: "supabase.from('classes').select('*, courts(*), teacher_profiles(*, profiles(*))')",
        summary: "Listar turmas com detalhes",
        description: "Retorna todas as turmas com quadra, professor e horários. Públicas (active) visíveis para anon.",
        auth: "public (active) / admin (all)",
        response: `[{ id, name, day_of_week, start_time, end_time, level, max_students, status, courts: {...}, teacher_profiles: { profiles: { full_name } } }]`,
      },
      {
        method: "POST",
        path: "supabase.from('classes').insert()",
        summary: "Criar nova turma",
        description: "Cria turma com nome, professor, quadra, dias da semana e horários.",
        auth: "admin",
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
        path: "supabase.functions.invoke('generate-sessions')",
        summary: "Gerar sessões de aula (Edge Function)",
        description: "Gera class_sessions para um período futuro baseado nos day_of_week da turma. Evita duplicatas por (class_id, date).",
        auth: "admin",
        params: [
          { name: "class_id", type: "uuid", required: true, description: "ID da turma" },
          { name: "weeks_ahead", type: "number", required: false, description: "Semanas à frente (default: 4)" },
        ],
        response: `{ created: number }`,
      },
      {
        method: "GET",
        path: "supabase.from('class_sessions').select('*, classes(*)')",
        summary: "Listar sessões de aula",
        description: "Retorna sessões filtradas por data, turma ou status. Públicas para consulta de disponibilidade.",
        auth: "public (read) / admin (manage)",
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
        path: "supabase.from('attendances').select('*, student_profiles(*, profiles(*)), class_sessions(*, classes(*))')",
        summary: "Listar presenças de uma sessão",
        description: "Retorna todas as presenças de uma sessão com dados do aluno. Admins veem tudo; alunos veem apenas as próprias.",
        auth: "authenticated",
      },
      {
        method: "POST",
        path: "supabase.from('attendances').insert()",
        summary: "Registrar presença",
        description: "Cria registro de presença para um aluno em uma sessão. Status inicial: not_confirmed.",
        auth: "admin",
        params: [
          { name: "session_id", type: "uuid", required: true, description: "ID da sessão" },
          { name: "student_id", type: "uuid", required: true, description: "ID do student_profile" },
          { name: "status", type: "attendance_status", required: false, description: "confirmed | cancelled | not_confirmed | present | absent" },
        ],
      },
      {
        method: "PATCH",
        path: "supabase.from('attendances').update()",
        summary: "Atualizar status de presença",
        description: "Atualiza o status da presença. Alunos podem confirmar/cancelar; professores podem marcar present/absent. Trigger update_skill_level_on_attendance atualiza automaticamente o nível do aluno.",
        auth: "authenticated",
        params: [
          { name: "status", type: "attendance_status", required: true, description: "Novo status" },
          { name: "confirmed_at", type: "timestamp", required: false, description: "Data/hora da confirmação" },
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
        path: "supabase.from('courts').select('*').eq('is_active', true)",
        summary: "Listar quadras disponíveis",
        description: "Retorna quadras ativas com nome, localização e tipo de superfície. Pública para fluxo de reserva.",
        auth: "public",
        response: `[{ id, name, location, surface_type, is_active }]`,
      },
      {
        method: "POST",
        path: "supabase.from('court_bookings').insert()",
        summary: "Criar solicitação de reserva",
        description: "Cria reserva com status 'requested'. Valida conflitos via consulta prévia de bookings e class_sessions no mesmo horário. Público (não requer login).",
        auth: "public (anon/authenticated)",
        params: [
          { name: "court_id", type: "uuid", required: true, description: "ID da quadra" },
          { name: "date", type: "date", required: true, description: "Data da reserva (YYYY-MM-DD)" },
          { name: "start_time", type: "time", required: true, description: "Horário de início" },
          { name: "end_time", type: "time", required: true, description: "Horário de término" },
          { name: "requester_name", type: "string", required: true, description: "Nome do solicitante" },
          { name: "requester_phone", type: "string", required: true, description: "Telefone WhatsApp" },
          { name: "price", type: "number", required: true, description: "Valor da reserva" },
        ],
      },
      {
        method: "PATCH",
        path: "supabase.from('court_bookings').update()",
        summary: "Atualizar status de reserva (Admin)",
        description: "Admin confirma, cancela ou marca como pago. Status: requested → confirmed → paid | cancelled.",
        auth: "admin",
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
        path: "supabase.from('invoices').select('*, student_profiles(*, profiles(*))')",
        summary: "Listar faturas",
        description: "Admins veem todas as faturas; alunos veem apenas as próprias. Inclui status, valor, desconto e dados PIX.",
        auth: "authenticated",
        response: `[{ id, amount, discount, due_date, reference_month, status, pix_qr_code, pix_copy_paste, student_profiles: { profiles: { full_name } } }]`,
      },
      {
        method: "POST",
        path: "supabase.from('invoices').insert()",
        summary: "Gerar fatura individual",
        description: "Cria fatura para um aluno com validação anti-duplicidade (mesmo aluno + mês + status pendente/pago/vencido). Trava lógica no frontend.",
        auth: "admin",
        params: [
          { name: "student_id", type: "uuid", required: true, description: "ID do student_profile" },
          { name: "amount", type: "number", required: true, description: "Valor da fatura" },
          { name: "due_date", type: "date", required: true, description: "Data de vencimento" },
          { name: "reference_month", type: "string", required: true, description: "Mês referência (YYYY-MM)" },
          { name: "discount", type: "number", required: false, description: "Desconto aplicado" },
          { name: "notes", type: "string", required: false, description: "Observações" },
        ],
      },
      {
        method: "POST",
        path: "supabase.functions.invoke('create-pix-payment')",
        summary: "Gerar pagamento PIX (Edge Function)",
        description: "Integra com Mercado Pago para gerar QR Code PIX. Expiração de 30 min. Usa chave de idempotência dinâmica (invoice_id + timestamp).",
        auth: "authenticated",
        params: [
          { name: "invoice_id", type: "uuid", required: true, description: "ID da fatura" },
        ],
        response: `{ qr_code, qr_code_base64, copy_paste, payment_id }`,
      },
      {
        method: "POST",
        path: "supabase.functions.invoke('mercadopago-webhook')",
        summary: "Webhook Mercado Pago (Edge Function)",
        description: "Recebe notificações de pagamento do Mercado Pago. Valida x-signature via HMAC SHA256. Atualiza status da fatura para 'paid' automaticamente.",
        auth: "webhook (x-signature)",
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
        path: "supabase.from('plans').select('*')",
        summary: "Listar planos",
        description: "Planos ativos visíveis publicamente. Todos os planos visíveis para admin.",
        auth: "public (active) / admin (all)",
        response: `[{ id, name, classes_per_week, monthly_price, description, is_active }]`,
      },
      {
        method: "POST",
        path: "supabase.from('plans').insert()",
        summary: "Criar plano",
        auth: "admin",
        description: "Cria novo plano com nome, preço mensal e quantidade de aulas por semana.",
        params: [
          { name: "name", type: "string", required: true, description: "Nome do plano" },
          { name: "classes_per_week", type: "number", required: true, description: "Aulas por semana" },
          { name: "monthly_price", type: "number", required: true, description: "Preço mensal (R$)" },
          { name: "description", type: "string", required: false, description: "Descrição" },
        ],
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
        path: "supabase.functions.invoke('send-whatsapp')",
        summary: "Enviar mensagem WhatsApp (Edge Function)",
        description: "Envia mensagem de texto para um ou mais destinatários via Evolution API. Suporta template_variables para substituição de {{variavel}} no message_body. Requer role admin.",
        auth: "admin",
        params: [
          { name: "recipients", type: "array", required: true, description: "[{ phone, name?, student_id? }] — lista de destinatários" },
          { name: "message_body", type: "string", required: false, description: "Texto da mensagem. Pode conter {{variavel}} para substituição." },
          { name: "template_id", type: "uuid", required: false, description: "ID do template salvo em whatsapp_templates" },
          { name: "template_variables", type: "object", required: false, description: "Mapa de variáveis para substituição: { nome: 'João', turma: 'Sub-11', ... }" },
        ],
        response: `{ sent: number, failed: number, results: [{ phone, success, messageId?, error? }] }`,
      },
      {
        method: "GET",
        path: "supabase.from('whatsapp_messages').select('*')",
        summary: "Histórico de mensagens enviadas",
        description: "Retorna log de todas as mensagens enviadas com status (sent/failed/pending) e detalhes de erro.",
        auth: "admin",
        response: `[{ id, recipient_phone, recipient_name, message_body, status, sent_at, error_message, whatsapp_message_id }]`,
      },
    ],
  },
  {
    title: "Templates de Mensagem",
    icon: <FileText className="h-5 w-5" />,
    description: "Cadastro e gerenciamento de templates de mensagem WhatsApp com suporte a variáveis dinâmicas {{variavel}}.",
    endpoints: [
      {
        method: "GET",
        path: "supabase.from('whatsapp_templates').select('*').eq('is_active', true)",
        summary: "Listar templates ativos",
        description: "Retorna todos os templates ativos. Use .eq('is_active', true) para filtrar apenas os habilitados.",
        auth: "admin",
        response: `[{ id, name, body, category, variables: string[], is_active }]`,
      },
      {
        method: "POST",
        path: "supabase.from('whatsapp_templates').insert()",
        summary: "Criar template",
        description: "Cria template com corpo da mensagem e lista de variáveis disponíveis. Variáveis devem estar no formato {{nome_var}} no body.",
        auth: "admin",
        params: [
          { name: "name", type: "string", required: true, description: "Nome identificador do template" },
          { name: "body", type: "string", required: true, description: "Corpo da mensagem com variáveis: Olá, {{nome}}! Sua fatura de {{valor}} vence em {{data_vencimento}}." },
          { name: "category", type: "string", required: false, description: "Categoria: cobranca | cancelamento | agendamento | boas_vindas | geral" },
          { name: "variables", type: "string[]", required: false, description: "Lista de variáveis do template: ['nome', 'valor', 'data_vencimento']" },
          { name: "is_active", type: "boolean", required: false, description: "Default: true" },
        ],
        response: `{ id, name, body, category, variables, is_active }`,
      },
      {
        method: "PATCH",
        path: "supabase.from('whatsapp_templates').update().eq('id', id)",
        summary: "Atualizar template",
        description: "Atualiza corpo, categoria ou status do template. Alterar body pode exigir atualização de variables.",
        auth: "admin",
        params: [
          { name: "body", type: "string", required: false, description: "Novo corpo com variáveis {{...}}" },
          { name: "variables", type: "string[]", required: false, description: "Nova lista de variáveis" },
          { name: "is_active", type: "boolean", required: false, description: "Habilitar/desabilitar template" },
        ],
      },
    ],
  },
  {
    title: "WhatsApp & IA",
    icon: <Bot className="h-5 w-5" />,
    description: "Endpoints para automações via IA/bot no WhatsApp: webhook receptor, disponibilidade de quadra, cobranças automáticas e notificações em batch.",
    endpoints: [
      {
        method: "POST",
        path: "supabase.functions.invoke('whatsapp-webhook')",
        summary: "Webhook Evolution API (Edge Function)",
        description: "Receptor de eventos do Evolution API. Configurar na Evolution como webhook URL. Extrai número e texto da mensagem recebida, registra no histórico e expõe ponto de integração para LLM/agente de IA. Valida x-webhook-secret se WHATSAPP_WEBHOOK_SECRET estiver configurado.",
        auth: "webhook (x-webhook-secret)",
        params: [
          { name: "event", type: "string", required: true, description: "Tipo de evento Evolution API: messages.upsert" },
          { name: "data.key.remoteJid", type: "string", required: true, description: "Número do remetente: 5511999999999@s.whatsapp.net" },
          { name: "data.message.conversation", type: "string", required: false, description: "Texto da mensagem recebida" },
        ],
        response: `{ status: "processed", phone: string, message_length: number }`,
      },
      {
        method: "GET",
        path: "supabase.functions.invoke('court-availability')",
        summary: "Consultar disponibilidade de quadra (Edge Function)",
        description: "Retorna slots horários livres de uma quadra em uma data. Considera reservas confirmadas/pagas (court_bookings) e sessões de aula agendadas (class_sessions). Slots calculados com base no business_hours do system_config (padrão: 08h–22h, slots de 1h).",
        auth: "public (anon)",
        params: [
          { name: "court_id", type: "uuid", required: true, description: "ID da quadra (query param)" },
          { name: "date", type: "string", required: true, description: "Data no formato YYYY-MM-DD (query param)" },
        ],
        response: `{ date, court_id, court_name, available_slots: [{ start: "HH:MM", end: "HH:MM" }] }`,
      },
      {
        method: "POST",
        path: "supabase.functions.invoke('court-availability')",
        summary: "Reservar quadra via bot (Edge Function)",
        description: "Cria solicitação de reserva com status 'requested'. Valida conflito de horário contra reservas existentes (requested/confirmed/paid) e sessões de aula. Ideal para o bot do WhatsApp criar reservas após confirmação do usuário.",
        auth: "public (anon)",
        params: [
          { name: "court_id", type: "uuid", required: true, description: "ID da quadra" },
          { name: "date", type: "string", required: true, description: "Data (YYYY-MM-DD)" },
          { name: "start_time", type: "string", required: true, description: "Horário de início (HH:MM)" },
          { name: "end_time", type: "string", required: true, description: "Horário de término (HH:MM)" },
          { name: "requester_name", type: "string", required: true, description: "Nome do solicitante" },
          { name: "requester_phone", type: "string", required: true, description: "Telefone WhatsApp" },
          { name: "price", type: "number", required: false, description: "Valor da reserva (R$)" },
        ],
        response: `{ booking_id, status: "requested", message: string }`,
      },
      {
        method: "POST",
        path: "supabase.functions.invoke('send-invoice-reminders')",
        summary: "Enviar lembretes de cobrança (Edge Function)",
        description: "Dispara mensagens WhatsApp para alunos com faturas pendentes. Regras: apenas profiles.status='active' + invoices.status='pending' com vencimento em CURRENT_DATE + days_before_due. Usa template com variáveis {{nome}}, {{valor}}, {{data_vencimento}}, {{pix_copy_paste}}. Ideal para cron job diário.",
        auth: "service_role (interno)",
        params: [
          { name: "days_before_due", type: "number", required: false, description: "Dias antes do vencimento (default: 3)" },
          { name: "template_id", type: "uuid", required: false, description: "ID do template a usar (usa padrão se omitido)" },
        ],
        response: `{ sent: number, skipped: number, failed: number }`,
      },
      {
        method: "POST",
        path: "supabase.functions.invoke('notify-class-cancellation')",
        summary: "Notificar cancelamento de aula (Edge Function)",
        description: "Notifica em batch todos os alunos com attendance confirmed|not_confirmed em uma sessão. Envia WhatsApp com template usando {{nome}}, {{turma}}, {{data}}, {{professor}}. Atualiza class_sessions.status='cancelled' APÓS o envio das notificações.",
        auth: "admin",
        params: [
          { name: "session_id", type: "uuid", required: true, description: "ID da sessão de aula (class_sessions)" },
          { name: "template_id", type: "uuid", required: false, description: "ID do template de cancelamento" },
          { name: "custom_message", type: "string", required: false, description: "Mensagem personalizada (substitui template se fornecida)" },
        ],
        response: `{ notified: number, failed: number }`,
      },
    ],
  },
  {
    title: "Webhook Configuração",
    icon: <Webhook className="h-5 w-5" />,
    description: "Referência de configuração da Evolution API para receber mensagens no webhook.",
    endpoints: [
      {
        method: "POST",
        path: "Evolution API → /webhook/set/{instance}",
        summary: "Configurar webhook na Evolution API",
        description: "Configura o endpoint whatsapp-webhook como destino de eventos. URL: https://{SUPABASE_URL}/functions/v1/whatsapp-webhook. Adicionar header x-webhook-secret com o valor de WHATSAPP_WEBHOOK_SECRET. Habilitar evento: messages.upsert.",
        auth: "Evolution API Key",
        params: [
          { name: "url", type: "string", required: true, description: "https://<projeto>.supabase.co/functions/v1/whatsapp-webhook" },
          { name: "webhook_by_events", type: "boolean", required: false, description: "true — receber por tipo de evento" },
          { name: "events", type: "string[]", required: true, description: "['messages.upsert'] — tipos de eventos a receber" },
          { name: "headers", type: "object", required: false, description: "{ 'x-webhook-secret': '<seu-secret>' }" },
        ],
        response: `{ webhook: { url, events, enabled: true } }`,
      },
    ],
  },
  {
    title: "Aulas Teste",
    icon: <Zap className="h-5 w-5" />,
    description: "Funil de captação via formulário de aula teste.",
    endpoints: [
      {
        method: "POST",
        path: "supabase.from('trial_requests').insert()",
        summary: "Solicitar aula teste",
        description: "Formulário público na landing page. Cria solicitação com status 'pending'.",
        auth: "public",
        params: [
          { name: "name", type: "string", required: true, description: "Nome do interessado" },
          { name: "phone", type: "string", required: true, description: "Telefone WhatsApp" },
          { name: "email", type: "string", required: false, description: "Email" },
          { name: "preferred_class_id", type: "uuid", required: false, description: "Turma preferida" },
          { name: "preferred_date", type: "date", required: false, description: "Data preferida" },
        ],
      },
      {
        method: "PATCH",
        path: "supabase.from('trial_requests').update()",
        summary: "Atualizar status da solicitação (Admin)",
        description: "Admin aprova, rejeita ou marca como concluída/no-show.",
        auth: "admin",
        params: [
          { name: "status", type: "trial_status", required: true, description: "pending | approved | rejected | completed | no_show" },
          { name: "admin_notes", type: "string", required: false, description: "Observações do admin" },
        ],
      },
    ],
  },
  {
    title: "Configurações do Sistema",
    icon: <Database className="h-5 w-5" />,
    description: "Configurações globais: horários, landing page, notificações.",
    endpoints: [
      {
        method: "GET",
        path: "supabase.from('system_config').select('*')",
        summary: "Obter configurações do sistema",
        description: "Retorna key-value pairs. Ex: business_hours (JSON com open_days, open_hour, close_hour), usado pelo hook useBusinessHours.",
        auth: "authenticated (read) / admin (write)",
        response: `[{ key: "business_hours", value: '{"open_days":[1,2,3,4,5,6],"open_hour":6,"close_hour":22}' }]`,
      },
      {
        method: "GET",
        path: "supabase.from('landing_page_settings').select('*')",
        summary: "Configurações da landing page",
        description: "Retorna business_mode, WhatsApp, Instagram, YouTube, CTA e imagem hero.",
        auth: "public",
      },
      {
        method: "GET",
        path: "supabase.from('landing_page_config').select('*')",
        summary: "Seções da landing page",
        description: "Retorna seções configuráveis (hero, about, benefits, etc.) com visibilidade e ordem.",
        auth: "public",
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
