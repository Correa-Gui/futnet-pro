import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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

interface StudentWithProfile {
  studentId: string;
  userId: string;
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

  // Fetch classes
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

  // Fetch all students with enrollments
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
          userId: sp.user_id,
          fullName: profileMap[sp.user_id]?.full_name || "Aluno",
          phone: profileMap[sp.user_id]?.phone || null,
          classIds: enrollMap[sp.id] || [],
        }))
        .filter((s) => s.phone);
    },
  });

  // Fetch templates
  const { data: templates = [] } = useQuery({
    queryKey: ["wa-templates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_templates" as any)
        .select("id, name, body, variables")
        .eq("is_active", true)
        .order("name");
      return (data || []) as { id: string; name: string; body: string; variables: string[] }[];
    },
  });

  // Fetch teacher/court maps for variable substitution
  const { data: teacherMap = {} } = useQuery({
    queryKey: ["wa-teacher-map"],
    queryFn: async () => {
      const { data: teachers } = await supabase.from("teacher_profiles").select("id, user_id");
      if (!teachers?.length) return {};
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", teachers.map((t) => t.user_id));
      const pm = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name]));
      const map: Record<string, string> = {};
      teachers.forEach((t) => (map[t.id] = pm[t.user_id] || "Professor"));
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

  const selectAll = () => {
    setSelectedStudents(new Set(filteredStudents.map((s) => s.studentId)));
  };

  const deselectAll = () => setSelectedStudents(new Set());

  const applyTemplate = (tplId: string) => {
    setTemplateId(tplId);
    const tpl = templates.find((t) => t.id === tplId);
    if (tpl) setMessageBody(tpl.body);
  };

  const resolveVars = (body: string, student: StudentWithProfile): string => {
    const classInfo = selectedClassId ? classes.find((c) => c.id === selectedClassId) : null;
    return body
      .replace(/\{\{nome\}\}/g, student.fullName)
      .replace(/\{\{turma\}\}/g, classInfo?.name || "")
      .replace(/\{\{horario\}\}/g, classInfo ? `${classInfo.start_time.slice(0, 5)} às ${classInfo.end_time.slice(0, 5)}` : "")
      .replace(/\{\{dia\}\}/g, classInfo ? formatDaysOfWeek(classInfo.day_of_week) : "")
      .replace(/\{\{professor\}\}/g, classInfo ? teacherMap[classInfo.teacher_id] || "" : "")
      .replace(/\{\{quadra\}\}/g, classInfo ? courtMap[classInfo.court_id] || "" : "");
  };

  const handleSend = async () => {
    const selected = filteredStudents.filter((s) => selectedStudents.has(s.studentId));
    if (selected.length === 0) return toast.error("Selecione ao menos um aluno.");
    if (!messageBody.trim()) return toast.error("Escreva a mensagem.");

    setSending(true);
    try {
      // Send each with resolved variables
      const recipients = selected.map((s) => ({
        phone: s.phone!,
        name: s.fullName,
        student_id: s.studentId,
      }));

      // Resolve the message for the first student as preview (API sends same body)
      // For per-student variable resolution, we send individually
      const hasVars = /\{\{\w+\}\}/.test(messageBody);

      if (hasVars) {
        // Send one by one for variable resolution
        let sentCount = 0;
        let failCount = 0;
        for (const student of selected) {
          const resolved = resolveVars(messageBody, student);
          const { data, error } = await supabase.functions.invoke("send-whatsapp", {
            body: {
              recipients: [{ phone: student.phone!, name: student.fullName, student_id: student.studentId }],
              message_body: resolved,
              template_id: templateId || null,
            },
          });
          if (error) failCount++;
          else sentCount += data?.sent || 0;
        }
        toast.success(`${sentCount} mensagem(ns) enviada(s)${failCount > 0 ? `, ${failCount} falha(s)` : ""}`);
      } else {
        const { data, error } = await supabase.functions.invoke("send-whatsapp", {
          body: {
            recipients,
            message_body: messageBody,
            template_id: templateId || null,
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

  // Preview
  const previewStudent = filteredStudents.find((s) => selectedStudents.has(s.studentId)) || filteredStudents[0];
  const previewMessage = previewStudent ? resolveVars(messageBody, previewStudent) : messageBody;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Left: Compose */}
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <Label>Template (opcional)</Label>
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
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-sm whitespace-pre-wrap border border-emerald-200 dark:border-emerald-800">
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

      {/* Right: Recipients */}
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
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
              <Select value={selectedClassId} onValueChange={(v) => { setSelectedClassId(v); setSelectedStudents(new Set()); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar turma..." />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {formatDaysOfWeek(c.day_of_week)} {c.start_time.slice(0, 5)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{filteredStudents.length} aluno(s)</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={selectAll}>Todos</Button>
                <Button size="sm" variant="ghost" onClick={deselectAll}>Nenhum</Button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1">
              {filteredStudents.map((s) => (
                <label
                  key={s.studentId}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                >
                  <Checkbox
                    checked={selectedStudents.has(s.studentId)}
                    onCheckedChange={() => toggleStudent(s.studentId)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.fullName}</p>
                    <p className="text-xs text-muted-foreground">{s.phone}</p>
                  </div>
                  {selectedStudents.has(s.studentId) && (
                    <Badge variant="secondary" className="text-xs shrink-0">Selecionado</Badge>
                  )}
                </label>
              ))}
              {filteredStudents.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
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
