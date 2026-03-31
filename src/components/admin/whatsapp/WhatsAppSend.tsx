import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, Users, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDaysOfWeek } from "@/lib/whatsapp";
import { useWhatsAppProviderConfig } from "@/hooks/useWhatsAppProviderConfig";

interface StudentWithProfile {
  studentId: string;
  fullName: string;
  phone: string | null;
  classIds: string[];
}

export default function WhatsAppSend() {
  const [mode, setMode] = useState<"class" | "individual">("class");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [templateId, setTemplateId] = useState<string>("");
  const [messageBody, setMessageBody] = useState("");
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

      const userIds = studentProfiles.map((student) => student.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);

      const profileMap = Object.fromEntries((profiles || []).map((profile) => [profile.user_id, profile]));
      const enrollMap: Record<string, string[]> = {};
      (enrollments || []).forEach((enrollment) => {
        if (!enrollMap[enrollment.student_id]) enrollMap[enrollment.student_id] = [];
        enrollMap[enrollment.student_id].push(enrollment.class_id);
      });

      return studentProfiles
        .map((studentProfile): StudentWithProfile => ({
          studentId: studentProfile.id,
          fullName: profileMap[studentProfile.user_id]?.full_name || "Aluno",
          phone: profileMap[studentProfile.user_id]?.phone || null,
          classIds: enrollMap[studentProfile.id] || [],
        }))
        .filter((student) => student.phone);
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
        .in("user_id", teachers.map((teacher) => teacher.user_id));

      const profilesMap = Object.fromEntries((profiles || []).map((profile) => [profile.user_id, profile.full_name]));
      const map: Record<string, string> = {};
      teachers.forEach((teacher) => {
        map[teacher.id] = profilesMap[teacher.user_id] || "Professor";
      });
      return map;
    },
  });

  const { data: courtMap = {} } = useQuery({
    queryKey: ["wa-court-map"],
    queryFn: async () => {
      const { data } = await supabase.from("courts").select("id, name");
      return Object.fromEntries((data || []).map((court) => [court.id, court.name]));
    },
  });

  const filteredStudents = useMemo(() => {
    if (mode === "class" && selectedClassId) {
      return students.filter((student) => student.classIds.includes(selectedClassId));
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

  const selectAll = () => {
    setSelectedStudents(new Set(filteredStudents.map((student) => student.studentId)));
  };

  const deselectAll = () => setSelectedStudents(new Set());

  const applyTemplate = (tplId: string) => {
    setTemplateId(tplId);
    const template = templates.find((item) => item.id === tplId);
    if (template) setMessageBody(template.body);
  };

  const resolveVars = (body: string, student: StudentWithProfile): string => {
    const classInfo = selectedClassId ? classes.find((item) => item.id === selectedClassId) : null;
    return body
      .replace(/\{\{nome\}\}/g, student.fullName)
      .replace(/\{\{turma\}\}/g, classInfo?.name || "")
      .replace(/\{\{horario\}\}/g, classInfo ? `${classInfo.start_time.slice(0, 5)} às ${classInfo.end_time.slice(0, 5)}` : "")
      .replace(/\{\{dia\}\}/g, classInfo ? formatDaysOfWeek(classInfo.day_of_week) : "")
      .replace(/\{\{professor\}\}/g, classInfo ? teacherMap[classInfo.teacher_id] || "" : "")
      .replace(/\{\{quadra\}\}/g, classInfo ? courtMap[classInfo.court_id] || "" : "");
  };

  const handleSend = async () => {
    const selected = filteredStudents.filter((student) => selectedStudents.has(student.studentId));
    if (selected.length === 0) return toast.error("Selecione ao menos um aluno.");
    if (!providerConfig?.baseUrl.trim()) return toast.error("Configure a URL do serviço na aba Configurações.");
    if (!providerConfig?.instanceName.trim()) return toast.error("Configure o nome da instância na aba Configurações.");
    if (!messageBody.trim()) return toast.error("Escreva a mensagem.");

    setSending(true);
    try {
      const recipients = selected.map((student) => ({
        phone: student.phone!,
        name: student.fullName,
        student_id: student.studentId,
      }));
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

          if (error) {
            failCount++;
            continue;
          }

          sentCount += data?.sent || 0;
        }

        toast.success(`${sentCount} mensagem(ns) enviada(s)${failCount > 0 ? `, ${failCount} falha(s)` : ""}`);
      } else {
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
    filteredStudents.find((student) => selectedStudents.has(student.studentId)) || filteredStudents[0];
  const previewMessage = previewStudent ? resolveVars(messageBody, previewStudent) : messageBody;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div>
              <Label>Template local (opcional)</Label>
              <Select value={templateId} onValueChange={applyTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolher template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                O painel resolve as variáveis do template e envia o texto final para o seu endpoint configurado.
              </p>
            </div>

            <div>
              <Label>Mensagem</Label>
              <Textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Escreva sua mensagem ou selecione um template..."
                rows={6}
              />
            </div>

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
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" /> Enviar para {selectedStudents.size} aluno(s)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={mode === "class" ? "default" : "outline"}
                onClick={() => {
                  setMode("class");
                  setSelectedStudents(new Set());
                }}
              >
                <Users className="mr-1 h-4 w-4" /> Por Turma
              </Button>
              <Button
                size="sm"
                variant={mode === "individual" ? "default" : "outline"}
                onClick={() => {
                  setMode("individual");
                  setSelectedClassId("");
                  setSelectedStudents(new Set());
                }}
              >
                <User className="mr-1 h-4 w-4" /> Individual
              </Button>
            </div>

            {mode === "class" && (
              <Select
                value={selectedClassId}
                onValueChange={(value) => {
                  setSelectedClassId(value);
                  setSelectedStudents(new Set());
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar turma..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((classItem) => (
                    <SelectItem key={classItem.id} value={classItem.id}>
                      {classItem.name} - {formatDaysOfWeek(classItem.day_of_week)} {classItem.start_time.slice(0, 5)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{filteredStudents.length} aluno(s)</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={selectAll}>
                  Todos
                </Button>
                <Button size="sm" variant="ghost" onClick={deselectAll}>
                  Nenhum
                </Button>
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
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      Selecionado
                    </Badge>
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
