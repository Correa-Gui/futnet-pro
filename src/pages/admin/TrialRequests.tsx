import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  CalendarCheck, Phone, Mail, Clock, Copy, MessageCircle,
  Check, X, UserCheck, UserX, ChevronDown,
} from "lucide-react";
import { formatWhatsAppLink, formatDaysOfWeek } from "@/lib/whatsapp";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

type TrialStatus = "pending" | "approved" | "rejected" | "completed" | "no_show";

interface TrialRequest {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  preferred_class_id: string | null;
  preferred_date: string | null;
  status: TrialStatus;
  admin_notes: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
}

interface ClassInfo {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  day_of_week: number[];
  court_id: string;
  teacher_id: string;
}

const statusConfig: Record<TrialStatus, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  approved: { label: "Aprovada", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  rejected: { label: "Rejeitada", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  completed: { label: "Realizada", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  no_show: { label: "Não compareceu", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

const filterOptions: { value: TrialStatus | "all"; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "approved", label: "Aprovadas" },
  { value: "rejected", label: "Rejeitadas" },
  { value: "completed", label: "Realizadas" },
  { value: "no_show", label: "Não compareceu" },
];

export default function TrialRequests() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<TrialStatus | "all">("all");
  const [expandedNotes, setExpandedNotes] = useState<Record<string, string>>({});
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    trial: TrialRequest | null;
    classId: string;
  }>({ open: false, trial: null, classId: "" });

  const { data: trials = [] } = useQuery({
    queryKey: ["admin-trial-requests"],
    queryFn: async () => {
      const { data } = await supabase
        .from("trial_requests" as any)
        .select("*")
        .order("created_at", { ascending: false });
      return (data || []) as unknown as TrialRequest[];
    },
  });

  const { data: classMap = {} } = useQuery({
    queryKey: ["admin-classes-map"],
    queryFn: async () => {
      const { data } = await supabase
        .from("classes")
        .select("id, name, start_time, end_time, day_of_week, court_id, teacher_id");
      const map: Record<string, ClassInfo> = {};
      (data || []).forEach((c) => (map[c.id] = c as ClassInfo));
      return map;
    },
  });

  const { data: courtMap = {} } = useQuery({
    queryKey: ["admin-courts-map"],
    queryFn: async () => {
      const { data } = await supabase.from("courts").select("id, name");
      const map: Record<string, string> = {};
      (data || []).forEach((c) => (map[c.id] = c.name));
      return map;
    },
  });

  const { data: teacherMap = {} } = useQuery({
    queryKey: ["admin-teachers-name-map"],
    queryFn: async () => {
      const { data: teachers } = await supabase.from("teacher_profiles").select("id, user_id");
      if (!teachers || teachers.length === 0) return {};
      const userIds = teachers.map((t) => t.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name]));
      const map: Record<string, string> = {};
      teachers.forEach((t) => (map[t.id] = profileMap[t.user_id] || "Professor"));
      return map;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, notes, phone, recipientName, message, preferred_class_id }: { id: string; status: TrialStatus; notes?: string; phone?: string; recipientName?: string; message?: string; preferred_class_id?: string }) => {
      const updates: Record<string, any> = { status };
      if (status === "approved") {
        updates.approved_at = new Date().toISOString();
        updates.approved_by = user?.id;
      }
      if (notes !== undefined) updates.admin_notes = notes;
      if (preferred_class_id) updates.preferred_class_id = preferred_class_id;
      await supabase.from("trial_requests" as any).update(updates).eq("id", id);
      if (status === "approved" && phone && message) {
        await supabase.functions.invoke("send-whatsapp", {
          body: { recipients: [{ phone, name: recipientName }], message_body: message },
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-trial-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-trial-pending-count"] });
      toast.success("Status atualizado! Mensagem enviada via WhatsApp.");
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ["admin-trial-requests"] });
      toast.success("Status atualizado!", { description: "Falha ao enviar WhatsApp — verifique as configurações." });
    },
  });

  const filtered = filter === "all" ? trials : trials.filter((t) => t.status === filter);
  const pendingCount = trials.filter((t) => t.status === "pending").length;

  const getClassLabel = (classId: string | null) => {
    if (!classId || !classMap[classId]) return null;
    const c = classMap[classId];
    return `${c.name} — ${formatDaysOfWeek(c.day_of_week)} ${c.start_time.slice(0, 5)}-${c.end_time.slice(0, 5)}`;
  };

  const getNextClassDate = (daysOfWeek: number[]): string => {
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const next = new Date(today);
      next.setDate(today.getDate() + i);
      if (daysOfWeek.includes(next.getDay())) {
        return next.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
      }
    }
    return "a definir";
  };

  const classList = useMemo(
    () => Object.values(classMap).sort((a, b) => a.name.localeCompare(b.name)),
    [classMap],
  );

  const buildApprovalMessageForClass = (t: TrialRequest, classId: string) => {
    const c = classId ? classMap[classId] : null;
    const courtName = c ? courtMap[c.court_id] || "Quadra" : "";
    const teacherName = c ? teacherMap[c.teacher_id] || "Professor" : "";
    const dateStr = t.preferred_date
      ? new Date(t.preferred_date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
      : c ? getNextClassDate(c.day_of_week) : "a definir";

    return `Oi ${t.name}! 🏐 Sua aula teste tá confirmada!\n\n📋 Turma: ${c?.name || "A definir"}\n📅 Data: ${dateStr}\n🕐 Horário: ${c ? `${c.start_time.slice(0, 5)} às ${c.end_time.slice(0, 5)}` : "A definir"}\n👨‍🏫 Professor: ${teacherName}\n📍 Local: ${courtName}\n\nTraga roupa leve e venha com vontade! Nos vemos na quadra! 💪`;
  };

  const buildApprovalMessage = (t: TrialRequest) =>
    buildApprovalMessageForClass(t, t.preferred_class_id || "");

  const buildConversionMessage = (t: TrialRequest) => {
    return `E aí ${t.name}, curtiu a aula? 🔥\n\nPra continuar treinando, escolha seu plano e crie sua conta no app:\n👉 ${window.location.origin}/cadastro\n\nQualquer dúvida, é só chamar!`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Mensagem copiada!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-brand flex items-center gap-2">
          <CalendarCheck className="h-6 w-6 text-secondary" />
          Aulas Teste
        </h2>
        <p className="text-sm text-muted-foreground">
          {pendingCount} solicitação{pendingCount !== 1 ? "ões" : ""} pendente{pendingCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {filterOptions.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
            {f.value === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-xs">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma solicitação encontrada.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((t) => {
            const sc = statusConfig[t.status];
            return (
              <Card key={t.id} className="overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold truncate">{t.name}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${sc.color}`}>
                          {sc.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <a href={`tel:${t.phone}`} className="flex items-center gap-1 hover:text-foreground">
                          <Phone size={14} /> {t.phone}
                        </a>
                        {t.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={14} /> {t.email}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={14} />{" "}
                          {formatDistanceToNow(new Date(t.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      {getClassLabel(t.preferred_class_id) && (
                        <p className="text-sm mt-1">
                          <span className="text-muted-foreground">Turma:</span>{" "}
                          <span className="font-medium">{getClassLabel(t.preferred_class_id)}</span>
                        </p>
                      )}
                      {t.preferred_date && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Data:</span>{" "}
                          <span className="font-medium">
                            {new Date(t.preferred_date + "T12:00:00").toLocaleDateString("pt-BR")}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions by status */}
                  {t.status === "pending" && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      <Textarea
                        placeholder="Notas do admin (opcional)"
                        value={expandedNotes[t.id] || t.admin_notes || ""}
                        onChange={(e) => setExpandedNotes((prev) => ({ ...prev, [t.id]: e.target.value }))}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          disabled={updateStatus.isPending}
                          onClick={() =>
                            setApprovalDialog({
                              open: true,
                              trial: t,
                              classId: t.preferred_class_id || "",
                            })
                          }
                        >
                          <Check className="mr-1 h-4 w-4" /> Aprovar & Enviar WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() =>
                            updateStatus.mutate({
                              id: t.id,
                              status: "rejected",
                              notes: expandedNotes[t.id],
                            })
                          }
                        >
                          <X className="mr-1 h-4 w-4" /> Rejeitar
                        </Button>
                      </div>
                    </div>
                  )}

                  {t.status === "approved" && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      <p className="text-sm font-medium">Enviar confirmação por WhatsApp:</p>
                      <pre className="text-xs bg-muted rounded-lg p-3 whitespace-pre-wrap font-body">
                        {buildApprovalMessage(t)}
                      </pre>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => copyToClipboard(buildApprovalMessage(t))}>
                          <Copy className="mr-1 h-4 w-4" /> Copiar
                        </Button>
                        <a
                          href={formatWhatsAppLink(t.phone, buildApprovalMessage(t))}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                            <MessageCircle className="mr-1 h-4 w-4" /> Abrir WhatsApp
                          </Button>
                        </a>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          onClick={() => updateStatus.mutate({ id: t.id, status: "completed" })}
                        >
                          <UserCheck className="mr-1 h-4 w-4" /> Marcar como Realizada
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          onClick={() => updateStatus.mutate({ id: t.id, status: "no_show" })}
                        >
                          <UserX className="mr-1 h-4 w-4" /> Não compareceu
                        </Button>
                      </div>
                    </div>
                  )}

                  {t.status === "completed" && (
                    <div className="mt-4 pt-4 border-t border-border space-y-3">
                      <p className="text-sm font-medium">Converter em aluno — enviar link de cadastro:</p>
                      <pre className="text-xs bg-muted rounded-lg p-3 whitespace-pre-wrap font-body">
                        {buildConversionMessage(t)}
                      </pre>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => copyToClipboard(buildConversionMessage(t))}>
                          <Copy className="mr-1 h-4 w-4" /> Copiar
                        </Button>
                        <a
                          href={formatWhatsAppLink(t.phone, buildConversionMessage(t))}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                            <MessageCircle className="mr-1 h-4 w-4" /> Abrir WhatsApp
                          </Button>
                        </a>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {/* Dialog de aprovação com seleção de turma */}
      <Dialog
        open={approvalDialog.open}
        onOpenChange={(open) => setApprovalDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Aprovar aula teste — {approvalDialog.trial?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Turma / Horário</Label>
              <Select
                value={approvalDialog.classId}
                onValueChange={(v) =>
                  setApprovalDialog((prev) => ({ ...prev, classId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a turma (obrigatório)" />
                </SelectTrigger>
                <SelectContent>
                  {classList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {formatDaysOfWeek(c.day_of_week)} {c.start_time.slice(0, 5)}-{c.end_time.slice(0, 5)}
                      {teacherMap[c.teacher_id] ? ` · ${teacherMap[c.teacher_id]}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {approvalDialog.trial && (
              <div className="space-y-1">
                <Label className="text-muted-foreground text-xs">Prévia da mensagem</Label>
                <pre className="text-xs bg-muted rounded-lg p-3 whitespace-pre-wrap font-body">
                  {buildApprovalMessageForClass(approvalDialog.trial, approvalDialog.classId)}
                </pre>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setApprovalDialog({ open: false, trial: null, classId: "" })}
            >
              Cancelar
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!approvalDialog.classId || updateStatus.isPending}
              onClick={() => {
                if (!approvalDialog.trial || !approvalDialog.classId) return;
                const t = approvalDialog.trial;
                const msg = buildApprovalMessageForClass(t, approvalDialog.classId);
                updateStatus.mutate({
                  id: t.id,
                  status: "approved",
                  notes: expandedNotes[t.id],
                  phone: t.phone,
                  recipientName: t.name,
                  message: msg,
                  preferred_class_id: approvalDialog.classId,
                });
                setApprovalDialog({ open: false, trial: null, classId: "" });
              }}
            >
              <Check className="mr-1 h-4 w-4" />
              {updateStatus.isPending ? "Enviando..." : "Confirmar & Enviar WhatsApp"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
