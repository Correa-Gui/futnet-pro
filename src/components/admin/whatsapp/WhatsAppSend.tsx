import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, Users, User, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { formatDaysOfWeek } from "@/lib/whatsapp";
import { useWhatsAppProviderConfig } from "@/hooks/useWhatsAppProviderConfig";

interface StudentWithProfile {
  studentId: string;
  fullName: string;
  phone: string | null;
  classIds: string[];
}

// Variables resolved automatically from context (no manual input needed)
const AUTO_VARS = new Set(["nome", "turma", "horario", "dia", "professor", "quadra", "app_url"]);

// Variables auto-resolved from the student's pending invoice (fallback to manual)
const INVOICE_VARS = new Set(["valor", "mes", "data_vencimento"]);

// Human-friendly labels for common manual variables
const VAR_LABELS: Record<string, string> = {
  valor: "Valor (ex: R$ 150,00)",
  mes: "Mês de referência (ex: Abril/2026)",
  data_vencimento: "Data de vencimento (ex: 10/04/2026)",
  data: "Data (ex: 05/04/2026)",
  horario_inicio: "Horário início (ex: 09:00)",
  horario_fim: "Horário fim (ex: 10:00)",
  quadra: "Quadra",
};

export default function WhatsAppSend() {
  const [mode, setMode] = useState<"class" | "individual">("class");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [templateId, setTemplateId] = useState<string>("");
  const [messageBody, setMessageBody] = useState("");
  const [manualVars, setManualVars] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const { data: providerConfig } = useWhatsAppProviderConfig();

  const { data: classes = [] } = useQuery({
    queryKey: ["wa-classes"],
    queryFn: async () => {
      const { data } = await supabase
        .from("classes")
        .select("id, name, day_of_week, start_time, end_time, teacher_id, court_id")
        .eq("status", "active")
        .order("name");
      return data || [];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ["wa-students"],
    queryFn: async () => {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id, class_id")
        .eq("status", "active");

      const { data: studentProfiles } = await supabase
        .from("student_profiles")
        .select("id, user_id");

      if (!studentProfiles) return [];

      const userIds = studentProfiles.map((s) => s.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);

      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p]));
      const enrollMap: Record<string, string[]> = {};
      (enrollments || []).forEach((e) => {
        if (!enrollMap[e.student_id]) enrollMap[e.student_id] = [];
        enrollMap[e.student_id].push(e.class_id);
      });

      return studentProfiles
        .map((sp): StudentWithProfile => ({
          studentId: sp.id,
          fullName: profileMap[sp.user_id]?.full_name || "Aluno",
          phone: profileMap[sp.user_id]?.phone || null,
          classIds: enrollMap[sp.id] || [],
        }))
        .filter((s) => s.phone);
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["wa-templates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_templates" as any)
        .select("id, name, body, variables")
        .eq("is_active", true)
        .order("name");
      return (data || []) as unknown as { id: string; name: string; body: string; variables: string[] }[];
    },
  });

  const { data: teacherMap = {} } = useQuery({
    queryKey: ["wa-teacher-map"],
    queryFn: async () => {
      const { data: teachers } = await supabase.from("teacher_profiles").select("id, user_id");
      if (!teachers?.length) return {};
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", teachers.map((t) => t.user_id));
      const profilesMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name]));
      const map: Record<string, string> = {};
      teachers.forEach((t) => { map[t.id] = profilesMap[t.user_id] || "Professor"; });
      return map;
    },
  });

  const { data: courtMap = {} } = useQuery({
    queryKey: ["wa-court-map"],
    queryFn: async () => {
      const { data } = await supabase.from("courts").select("id, name");
      return Object.fromEntries((data || []).map((c) => [c.id, c.name]));
    },
  });

  // Load app_url from system_config for automatic resolution
  const { data: appUrl = "" } = useQuery({
    queryKey: ["wa-app-url"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "app_url")
        .maybeSingle();
      return data?.value || "";
    },
  });

  // Pending/overdue invoices keyed by student_id — used for auto-filling financial vars
  const { data: invoiceMap = {} } = useQuery({
    queryKey: ["wa-invoice-map"],
    queryFn: async () => {
      const { data } = await supabase
        .from("invoices")
        .select("student_id, amount, discount, reference_month, due_date")
        .in("status", ["pending", "overdue"] as any)
        .order("due_date", { ascending: true });
      const map: Record<string, { amount: number; reference_month: string; due_date: string }> = {};
      (data || []).forEach((inv: any) => {
        if (!map[inv.student_id]) {
          map[inv.student_id] = {
            amount: Number(inv.amount) - Number(inv.discount || 0),
            reference_month: inv.reference_month,
            due_date: inv.due_date,
          };
        }
      });
      return map;
    },
  });

  // Detect variables in the message that are NOT auto-resolvable → need manual input
  const pendingVarNames = useMemo(() => {
    const matches = [...messageBody.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
    const unique = [...new Set(matches)];
    return unique.filter((v) => !AUTO_VARS.has(v) && !INVOICE_VARS.has(v));
  }, [messageBody]);

  // Invoice vars present in the current message (auto-resolved per student)
  const invoiceVarNames = useMemo(() => {
    const matches = [...messageBody.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
    return [...new Set(matches)].filter((v) => INVOICE_VARS.has(v));
  }, [messageBody]);

  const filteredStudents = useMemo(() => {
    if (mode === "class" && selectedClassId) {
      return students.filter((s) => s.classIds.includes(selectedClassId));
    }
    return students;
  }, [students, mode, selectedClassId]);

  const toggleStudent = (id: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () =>
    setSelectedStudents(new Set(filteredStudents.map((s) => s.studentId)));
  const deselectAll = () => setSelectedStudents(new Set());

  const applyTemplate = (tplId: string) => {
    setTemplateId(tplId);
    const template = templates.find((t) => t.id === tplId);
    if (template) {
      setMessageBody(template.body);
      setManualVars({}); // reset manual vars when template changes
    }
  };

  const resolveVars = (body: string, student: StudentWithProfile): string => {
    const classInfo = selectedClassId
      ? classes.find((c) => c.id === selectedClassId)
      : classes.find((c) => student.classIds.includes(c.id)) || null;

    let resolved = body
      .replace(/\{\{nome\}\}/g, student.fullName)
      .replace(/\{\{turma\}\}/g, classInfo?.name || "")
      .replace(/\{\{horario\}\}/g, classInfo ? `${classInfo.start_time.slice(0, 5)} às ${classInfo.end_time.slice(0, 5)}` : "")
      .replace(/\{\{dia\}\}/g, classInfo ? formatDaysOfWeek(classInfo.day_of_week) : "")
      .replace(/\{\{professor\}\}/g, classInfo ? teacherMap[classInfo.teacher_id] || "" : "")
      .replace(/\{\{quadra\}\}/g, classInfo ? courtMap[classInfo.court_id] || "" : "")
      .replace(/\{\{app_url\}\}/g, appUrl);

    // Apply invoice variables: use the student's pending invoice, fallback to manual input
    const invoice = invoiceMap[student.studentId];
    const formatDueDate = (iso: string) => {
      const parts = iso.split("-");
      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso;
    };
    const invoiceValues: Record<string, string> = {
      valor: invoice
        ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(invoice.amount)
        : manualVars["valor"] || "",
      mes: invoice ? invoice.reference_month : manualVars["mes"] || "",
      data_vencimento: invoice ? formatDueDate(invoice.due_date) : manualVars["data_vencimento"] || "",
    };
    for (const [key, value] of Object.entries(invoiceValues)) {
      if (value) resolved = resolved.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }

    // Apply other manually filled variables (non-invoice)
    for (const [key, value] of Object.entries(manualVars)) {
      if (!INVOICE_VARS.has(key)) {
        resolved = resolved.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
      }
    }

    return resolved;
  };

  const handleSend = async () => {
    const selected = filteredStudents.filter((s) => selectedStudents.has(s.studentId));
    if (selected.length === 0) return toast.error("Selecione ao menos um aluno.");
    if (!providerConfig?.baseUrl.trim()) return toast.error("Configure a URL do serviço na aba Configurações.");
    if (!providerConfig?.instanceName.trim()) return toast.error("Configure o nome da instância na aba Configurações.");
    if (!messageBody.trim()) return toast.error("Escreva a mensagem.");

    // Block if truly manual vars are empty
    const emptyVars = pendingVarNames.filter((v) => !manualVars[v]?.trim());
    if (emptyVars.length > 0) {
      toast.warning(`Preencha as variáveis: ${emptyVars.map((v) => `{{${v}}}`).join(", ")}`);
      return;
    }

    // Warn (non-blocking) if invoice vars have no fallback and some students lack invoices
    if (invoiceVarNames.length > 0) {
      const withoutInvoice = selected.filter((s) => !invoiceMap[s.studentId]);
      const emptyFallback = invoiceVarNames.filter((v) => !manualVars[v]?.trim());
      if (withoutInvoice.length > 0 && emptyFallback.length > 0) {
        toast.warning(
          `${withoutInvoice.length} aluno(s) sem fatura pendente — variáveis ${emptyFallback.map((v) => `{{${v}}}`).join(", ")} ficarão em branco para eles.`
        );
      }
    }

    setSending(true);
    try {
      const hasVars = /\{\{\w+\}\}/.test(messageBody);

      if (hasVars) {
        let sentCount = 0;
        let failCount = 0;
        for (const student of selected) {
          const resolvedMessage = resolveVars(messageBody, student);
          const { data, error } = await supabase.functions.invoke("send-whatsapp", {
            body: {
              recipients: [{ phone: student.phone!, name: student.fullName, student_id: student.studentId }],
              message_body: resolvedMessage,
              template_id: templateId || null,
              provider_base_url: providerConfig.baseUrl,
              provider_instance_name: providerConfig.instanceName,
            },
          });
          if (error) { failCount++; continue; }
          sentCount += data?.sent || 0;
        }
        toast.success(`${sentCount} mensagem(ns) enviada(s)${failCount > 0 ? `, ${failCount} falha(s)` : ""}`);
      } else {
        const recipients = selected.map((s) => ({
          phone: s.phone!,
          name: s.fullName,
          student_id: s.studentId,
        }));
        const { data, error } = await supabase.functions.invoke("send-whatsapp", {
          body: {
            recipients,
            message_body: messageBody,
            template_id: templateId || null,
            provider_base_url: providerConfig.baseUrl,
            provider_instance_name: providerConfig.instanceName,
          },
        });
        if (error) throw error;
        toast.success(`${data.sent} enviada(s), ${data.failed} falha(s)`);
      }

      setSelectedStudents(new Set());
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar mensagens");
    } finally {
      setSending(false);
    }
  };

  const previewStudent =
    filteredStudents.find((s) => selectedStudents.has(s.studentId)) || filteredStudents[0];
  const previewMessage = previewStudent ? resolveVars(messageBody, previewStudent) : messageBody;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4 p-4">
            {/* Template selector */}
            <div>
              <Label>Template local (opcional)</Label>
              <Select value={templateId} onValueChange={applyTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolher template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                O painel resolve as variáveis do template e envia o texto final para o seu endpoint configurado.
              </p>
            </div>

            {/* Invoice variable section — auto-filled per student, fallback input shown */}
            {invoiceVarNames.length > 0 && (() => {
              const selected = filteredStudents.filter((s) => selectedStudents.has(s.studentId));
              const withInvoice = selected.filter((s) => invoiceMap[s.studentId]).length;
              const withoutInvoice = selected.length - withInvoice;
              return (
                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3 space-y-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-400">
                        Variáveis financeiras — preenchidas automaticamente pela fatura pendente de cada aluno
                      </p>
                      {selected.length > 0 && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                          {withInvoice} aluno(s) com fatura detectada
                          {withoutInvoice > 0 && ` · ${withoutInvoice} sem fatura (usarão o valor padrão abaixo)`}
                        </p>
                      )}
                    </div>
                  </div>
                  {(withoutInvoice > 0 || selected.length === 0) && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Valor padrão (usado quando o aluno não tem fatura pendente):
                      </p>
                      {invoiceVarNames.map((varName) => (
                        <div key={varName} className="space-y-1">
                          <Label className="text-xs">
                            {`{{${varName}}}`}
                            <span className="ml-1 text-muted-foreground font-normal">
                              — {VAR_LABELS[varName] || varName}
                            </span>
                          </Label>
                          <Input
                            value={manualVars[varName] || ""}
                            onChange={(e) =>
                              setManualVars((prev) => ({ ...prev, [varName]: e.target.value }))
                            }
                            placeholder={VAR_LABELS[varName] || `Valor de {{${varName}}}`}
                            className="h-8 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Manual variable inputs — shown only when there are unresolved vars */}
            {pendingVarNames.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3 space-y-3">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Preencha as variáveis da mensagem:
                </p>
                {pendingVarNames.map((varName) => (
                  <div key={varName} className="space-y-1">
                    <Label className="text-xs">
                      {`{{${varName}}}`}
                      <span className="ml-1 text-muted-foreground font-normal">
                        — {VAR_LABELS[varName] || varName}
                      </span>
                    </Label>
                    <Input
                      value={manualVars[varName] || ""}
                      onChange={(e) =>
                        setManualVars((prev) => ({ ...prev, [varName]: e.target.value }))
                      }
                      placeholder={VAR_LABELS[varName] || `Valor de {{${varName}}}`}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Message textarea */}
            <div>
              <Label>Mensagem</Label>
              <Textarea
                value={messageBody}
                onChange={(e) => {
                  setMessageBody(e.target.value);
                  setManualVars({}); // reset when message changes manually
                }}
                placeholder="Escreva sua mensagem ou selecione um template..."
                rows={6}
              />
            </div>

            {/* Preview */}
            {messageBody && previewStudent && (
              <div>
                <Label className="text-xs text-muted-foreground">Pré-visualização</Label>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm whitespace-pre-wrap dark:border-emerald-800 dark:bg-emerald-950/30">
                  {previewMessage}
                </div>
              </div>
            )}

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              onClick={handleSend}
              disabled={sending || selectedStudents.size === 0 || !messageBody.trim()}
            >
              {sending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Enviar para {selectedStudents.size} aluno(s)</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recipient selector */}
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={mode === "class" ? "default" : "outline"}
                onClick={() => { setMode("class"); setSelectedStudents(new Set()); }}
              >
                <Users className="mr-1 h-4 w-4" /> Por Turma
              </Button>
              <Button
                size="sm"
                variant={mode === "individual" ? "default" : "outline"}
                onClick={() => { setMode("individual"); setSelectedClassId(""); setSelectedStudents(new Set()); }}
              >
                <User className="mr-1 h-4 w-4" /> Individual
              </Button>
            </div>

            {mode === "class" && (
              <Select
                value={selectedClassId}
                onValueChange={(value) => {
                  setSelectedClassId(value);
                  const inClass = students.filter((s) => s.classIds.includes(value));
                  setSelectedStudents(new Set(inClass.map((s) => s.studentId)));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar turma..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} - {formatDaysOfWeek(c.day_of_week)} {c.start_time.slice(0, 5)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{filteredStudents.length} aluno(s)</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={selectAll}>Todos</Button>
                <Button size="sm" variant="ghost" onClick={deselectAll}>Nenhum</Button>
              </div>
            </div>

            <div className="max-h-80 space-y-1 overflow-y-auto">
              {filteredStudents.map((student) => (
                <label
                  key={student.studentId}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedStudents.has(student.studentId)}
                    onCheckedChange={() => toggleStudent(student.studentId)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{student.fullName}</p>
                    <p className="text-xs text-muted-foreground">{student.phone}</p>
                  </div>
                  {selectedStudents.has(student.studentId) && (
                    <Badge variant="secondary" className="shrink-0 text-xs">Selecionado</Badge>
                  )}
                </label>
              ))}

              {filteredStudents.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {mode === "class" && !selectedClassId
                    ? "Selecione uma turma"
                    : "Nenhum aluno com telefone cadastrado"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
