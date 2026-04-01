import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Crie templates reutilizáveis com variáveis como <code className="bg-muted px-1 rounded">{"{{nome}}"}</code>, <code className="bg-muted px-1 rounded">{"{{turma}}"}</code>
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
                  placeholder={"Olá {{nome}}! Sua aula de {{turma}} é amanhã às {{horario}}. Não esqueça! 🏐"}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use {"{{variavel}}"} para dados dinâmicos. Variáveis disponíveis: nome, turma, horario, dia, professor, quadra
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
