import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";

const BOOKING_CLIENT_DEFAULT =
  `Olá *{nome}*! ✅ Sua reserva foi confirmada!\n\n📍 *{quadra}*\n📅 *{data}*\n🕐 *{horario_inicio}* às *{horario_fim}*\n\nQualquer dúvida, estamos à disposição!`;

const BOOKING_GROUP_DEFAULT =
  `🏐 *Nova reserva!*\n\n👤 {nome}\n📱 {telefone}\n📍 {quadra}\n📅 {data}\n🕐 {horario_inicio} às {horario_fim}\n💰 R$ {valor}`;

function BookingTemplatesSection() {
  const qc = useQueryClient();

  const { data: cfg } = useQuery({
    queryKey: ["system-config-booking-templates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_config")
        .select("key, value")
        .in("key", ["booking_confirmation_template", "booking_group_template"]);
      return Object.fromEntries((data || []).map((r: any) => [r.key, r.value]));
    },
    staleTime: 0,
  });

  const [clientTpl, setClientTpl] = useState("");
  const [groupTpl, setGroupTpl] = useState("");

  useEffect(() => {
    if (!cfg) return;
    setClientTpl(cfg.booking_confirmation_template || BOOKING_CLIENT_DEFAULT);
    setGroupTpl(cfg.booking_group_template || BOOKING_GROUP_DEFAULT);
  }, [cfg]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("system_config").upsert([
        { key: "booking_confirmation_template", value: clientTpl },
        { key: "booking_group_template", value: groupTpl },
      ], { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["system-config-booking-templates"] });
      toast.success("Templates de reserva salvos!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Templates de Reserva de Quadra</CardTitle>
        <CardDescription>
          Mensagens enviadas automaticamente quando uma reserva é criada.
          Variáveis disponíveis: <code className="bg-muted px-1 rounded text-xs">{"{nome}"}</code>{" "}
          <code className="bg-muted px-1 rounded text-xs">{"{quadra}"}</code>{" "}
          <code className="bg-muted px-1 rounded text-xs">{"{data}"}</code>{" "}
          <code className="bg-muted px-1 rounded text-xs">{"{horario_inicio}"}</code>{" "}
          <code className="bg-muted px-1 rounded text-xs">{"{horario_fim}"}</code>{" "}
          <code className="bg-muted px-1 rounded text-xs">{"{telefone}"}</code>{" "}
          <code className="bg-muted px-1 rounded text-xs">{"{valor}"}</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Mensagem para o cliente</Label>
          <Textarea
            value={clientTpl}
            onChange={(e) => setClientTpl(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
        </div>
        <Separator />
        <div className="space-y-2">
          <Label>Notificação para o grupo de admins</Label>
          <Textarea
            value={groupTpl}
            onChange={(e) => setGroupTpl(e.target.value)}
            rows={6}
            className="font-mono text-sm"
          />
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Salvando..." : "Salvar templates"}
        </Button>
      </CardContent>
    </Card>
  );
}

const STARTER_TEMPLATES = [
  {
    name: "Boas-vindas ao aluno",
    category: "onboarding",
    body: `🏐 Olá, {{nome}}! Seja muito bem-vindo(a) à {{turma}}!

Ficamos felizes em ter você com a gente. Sua primeira aula é {{dia}} às {{horario}} na {{quadra}}.

📍 Lembre-se de chegar com 10 minutos de antecedência e trazer água.

Qualquer dúvida, é só chamar! 😊`,
  },
  {
    name: "Lembrete de aula",
    category: "reminder",
    body: `⏰ Oi, {{nome}}! Lembrete da sua aula de amanhã.

🗓 {{dia}} às {{horario}}
📍 {{quadra}}
👨‍🏫 Prof. {{professor}}

Confirme sua presença respondendo esta mensagem. Nos vemos lá! 🏐`,
  },
  {
    name: "Cobrança de mensalidade",
    category: "billing",
    body: `💰 Olá, {{nome}}! Tudo bem?

Sua mensalidade de {{mes}} no valor de *R$ {{valor}}* vence em {{data_vencimento}}.

Para pagar, acesse: {{app_url}}

Qualquer dúvida estamos à disposição! 🙏`,
  },
  {
    name: "Mensalidade vencida",
    category: "billing",
    body: `⚠️ Oi, {{nome}}! Notamos que sua mensalidade de {{mes}} (R$ {{valor}}) está em aberto.

Para regularizar e continuar aproveitando suas aulas, acesse: {{app_url}}

Se já realizou o pagamento, por favor ignore esta mensagem. Obrigado! 😊`,
  },
  {
    name: "Confirmação de reserva de quadra",
    category: "booking",
    body: `✅ Reserva confirmada, {{nome}}!

🏟️ Quadra: {{quadra}}
📅 Data: {{dia}}
🕐 Horário: {{horario}}

Chegue alguns minutinhos antes para não perder nenhum tempo de jogo. 🎯

Qualquer alteração, entre em contato conosco!`,
  },
  {
    name: "Aula cancelada",
    category: "schedule",
    body: `📢 Oi, {{nome}}! Informamos que a aula de {{turma}} de {{dia}} às {{horario}} foi *cancelada*.

Pedimos desculpas pelo transtorno. Em breve entraremos em contato para remarcar.

Obrigado pela compreensão! 🙏`,
  },
  {
    name: "Convite para Day Use",
    category: "marketing",
    body: `🌟 Oi, {{nome}}! Temos uma ótima notícia pra você!

Estamos com vagas disponíveis para **Day Use** na {{quadra}}. Venha jogar com a gente!

📍 Local: {{quadra}}
📅 Consulte os horários disponíveis: {{app_url}}

Chame os amigos e garanta sua vaga! 🏐⚽`,
  },
  {
    name: "Parabéns de aniversário",
    category: "engagement",
    body: `🎂 Feliz aniversário, {{nome}}!

A equipe toda deseja um dia incrível cheio de alegria e muita bola boa! 🏐🎉

Como presente especial, temos uma surpresa pra você. Fale com a gente!`,
  },
];


interface Template {
  id: string;
  name: string;
  category: string;
  body: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

export default function WhatsAppTemplates() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState({ name: "", body: "", category: "custom" });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_templates" as any)
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as unknown as Template[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { name: string; body: string; category: string; id?: string }) => {
      // Extract variables like {{nome}}, {{turma}}
      const vars = [...payload.body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);

      if (payload.id) {
        await supabase
          .from("whatsapp_templates" as any)
          .update({ name: payload.name, body: payload.body, category: payload.category, variables: vars })
          .eq("id", payload.id);
      } else {
        await supabase
          .from("whatsapp_templates" as any)
          .insert({ name: payload.name, body: payload.body, category: payload.category, variables: vars });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      toast.success(editing ? "Template atualizado!" : "Template criado!");
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("whatsapp_templates" as any).delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      toast.success("Template removido!");
    },
  });

  const resetForm = () => {
    setForm({ name: "", body: "", category: "custom" });
    setEditing(null);
    setDialogOpen(false);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setForm({ name: t.name, body: t.body, category: t.category });
    setDialogOpen(true);
  };

  const useStarter = (t: typeof STARTER_TEMPLATES[0]) => {
    setForm({ name: t.name, body: t.body, category: t.category });
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* System booking templates */}
      <BookingTemplatesSection />

      <Separator />

      {/* Starter templates */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Modelos prontos</p>
          <span className="text-xs text-muted-foreground">— clique para usar como base</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {STARTER_TEMPLATES.map((t) => (
            <button
              key={t.name}
              onClick={() => useStarter(t)}
              className="text-left rounded-lg border border-border bg-muted/30 px-3 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-colors group"
            >
              <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">{t.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                {t.body.slice(0, 80)}…
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Templates salvos com variáveis como <code className="bg-muted px-1 rounded">{"{{nome}}"}</code>, <code className="bg-muted px-1 rounded">{"{{turma}}"}</code>
        </p>
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Novo Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Template" : "Novo Template"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Boas-vindas, Lembrete de aula"
                />
              </div>
              <div>
                <Label>Mensagem</Label>
                <Textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder={"⏰ Oi, {{nome}}! Lembrete da sua aula de amanhã.\n\n🗓 {{dia}} às {{horario}}\n📍 {{quadra}}\n\nNos vemos lá! 🏐"}
                  rows={8}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use {"{{variavel}}"} para dados dinâmicos. Disponíveis: <span className="font-medium">nome, turma, horario, dia, professor, quadra, valor, mes, data_vencimento, app_url</span>
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button
                  onClick={() => saveMutation.mutate({ ...form, id: editing?.id })}
                  disabled={!form.name || !form.body || saveMutation.isPending}
                >
                  {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="mx-auto h-10 w-10 mb-3 opacity-40" />
            Nenhum template criado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-sm bg-muted rounded-lg p-3 whitespace-pre-wrap font-body">{t.body}</pre>
                {(t.variables ?? []).length > 0 && (
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {(t.variables ?? []).map((v) => (
                      <Badge key={v} variant="secondary" className="text-xs">{`{{${v}}}`}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
