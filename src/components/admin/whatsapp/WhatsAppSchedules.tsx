import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, CalendarClock } from "lucide-react";
import { toast } from "sonner";

interface Schedule {
  id: string;
  name: string;
  template_id: string | null;
  trigger_event: string;
  days_before: number;
  is_active: boolean;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
}

const TRIGGER_EVENTS: { value: string; label: string }[] = [
  { value: "student_enrolled", label: "Novo aluno cadastrado" },
  { value: "class_reminder", label: "Lembrete de aula" },
  { value: "payment_due", label: "Fatura a vencer" },
  { value: "payment_confirmed", label: "Pagamento confirmado" },
  { value: "booking_confirmed", label: "Agendamento confirmado" },
  { value: "trial_feedback", label: "Feedback pós aula teste" },
];

const defaultForm = { name: "", trigger_event: "payment_due", days_before: 3, template_id: "", is_active: true };

export default function WhatsAppSchedules() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [form, setForm] = useState(defaultForm);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["whatsapp-schedules"],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_schedules")
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as Schedule[];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_templates" as any)
        .select("id, name")
        .order("name");
      return (data || []) as Template[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form & { id?: string }) => {
      const row = {
        name: payload.name,
        trigger_event: payload.trigger_event,
        days_before: payload.days_before,
        template_id: payload.template_id || null,
        is_active: payload.is_active,
      };
      if (payload.id) {
        const { error } = await supabase.from("whatsapp_schedules").update(row).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("whatsapp_schedules").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-schedules"] });
      toast.success(editing ? "Agendamento atualizado!" : "Agendamento criado!");
      resetForm();
    },
    onError: (e: Error) => toast.error("Erro ao salvar", { description: e.message }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("whatsapp_schedules").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-schedules"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["whatsapp-schedules"] });
      toast.success("Agendamento removido!");
    },
  });

  const resetForm = () => {
    setForm(defaultForm);
    setEditing(null);
    setDialogOpen(false);
  };

  const openEdit = (s: Schedule) => {
    setEditing(s);
    setForm({
      name: s.name,
      trigger_event: s.trigger_event,
      days_before: s.days_before,
      template_id: s.template_id || "",
      is_active: s.is_active,
    });
    setDialogOpen(true);
  };

  const getTriggerLabel = (value: string) =>
    TRIGGER_EVENTS.find((e) => e.value === value)?.label || value;

  const getTemplateName = (id: string | null) =>
    templates.find((t) => t.id === id)?.name || "—";

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Configure envios automáticos de mensagens por evento, com antecedência dinâmica.
        </p>
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Lembrete de vencimento"
                />
              </div>
              <div className="space-y-2">
                <Label>Evento gatilho</Label>
                <Select
                  value={form.trigger_event}
                  onValueChange={(v) => setForm((f) => ({ ...f, trigger_event: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_EVENTS.map((e) => (
                      <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dias antes do evento</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.days_before}
                  onChange={(e) => setForm((f) => ({ ...f, days_before: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-muted-foreground">0 = enviar no dia do evento</p>
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Select
                  value={form.template_id}
                  onValueChange={(v) => setForm((f) => ({ ...f, template_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                />
                <Label>Ativo</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button
                  onClick={() => saveMutation.mutate({ ...form, id: editing?.id })}
                  disabled={!form.name || !form.trigger_event || saveMutation.isPending}
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
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CalendarClock className="mx-auto h-10 w-10 mb-3 opacity-40" />
            Nenhum agendamento configurado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {schedules.map((s) => (
            <Card key={s.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{s.name}</CardTitle>
                  <Badge variant={s.is_active ? "default" : "outline"}>
                    {s.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={s.is_active}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: s.id, is_active: v })}
                  />
                  <Button size="icon" variant="ghost" onClick={() => openEdit(s)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => { if (confirm("Remover este agendamento?")) deleteMutation.mutate(s.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <p><span className="font-medium text-foreground">Evento:</span> {getTriggerLabel(s.trigger_event)}</p>
                <p><span className="font-medium text-foreground">Antecedência:</span> {s.days_before === 0 ? "No dia do evento" : `${s.days_before} dia(s) antes`}</p>
                <p><span className="font-medium text-foreground">Template:</span> {getTemplateName(s.template_id)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
