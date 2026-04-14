import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bot, KeyRound, Pencil, Plus, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";

type IntentExample = {
  id: string;
  category_id: string;
  example_text: string;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
};

type IntentCategory = {
  id: string;
  key: string;
  title: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
  examples: IntentExample[];
};

type CategoryForm = {
  key: string;
  title: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

type ExampleForm = {
  example_text: string;
  sort_order: number;
  is_active: boolean;
};

type AIConfigForm = {
  intentPromptId: string;
  institutionalPromptId: string;
  vectorStoreId: string;
  apiKeyReference: string;
};

const EMPTY_CATEGORY_FORM: CategoryForm = {
  key: "",
  title: "",
  description: "",
  sort_order: 0,
  is_active: true,
};

const EMPTY_EXAMPLE_FORM: ExampleForm = {
  example_text: "",
  sort_order: 0,
  is_active: true,
};

const EMPTY_AI_CONFIG_FORM: AIConfigForm = {
  intentPromptId: "",
  institutionalPromptId: "",
  vectorStoreId: "",
  apiKeyReference: "",
};

function normalizeKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_ -]+/g, "")
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_")
    .replace(/_+/g, "_");
}

export default function ChatbotIntents() {
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryEditing, setCategoryEditing] = useState<IntentCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(EMPTY_CATEGORY_FORM);
  const [exampleDialogOpen, setExampleDialogOpen] = useState(false);
  const [exampleEditing, setExampleEditing] = useState<IntentExample | null>(null);
  const [exampleForm, setExampleForm] = useState<ExampleForm>(EMPTY_EXAMPLE_FORM);
  const [aiConfigForm, setAiConfigForm] = useState<AIConfigForm>(EMPTY_AI_CONFIG_FORM);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["chatbot-intent-catalog"],
    queryFn: async () => {
      const { data: categoryRows, error: categoryError } = await supabase
        .from("chatbot_intent_categories" as any)
        .select("id, key, title, description, is_active, sort_order, updated_at")
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });

      if (categoryError) throw categoryError;

      const { data: exampleRows, error: exampleError } = await supabase
        .from("chatbot_intent_examples" as any)
        .select("id, category_id, example_text, is_active, sort_order, updated_at")
        .order("sort_order", { ascending: true })
        .order("example_text", { ascending: true });

      if (exampleError) throw exampleError;

      const examplesByCategory = new Map<string, IntentExample[]>();
      for (const example of (exampleRows || []) as IntentExample[]) {
        const bucket = examplesByCategory.get(example.category_id) || [];
        bucket.push(example);
        examplesByCategory.set(example.category_id, bucket);
      }

      return (categoryRows || []).map((category: any) => ({
        ...category,
        examples: examplesByCategory.get(category.id) || [],
      })) as IntentCategory[];
    },
  });

  const { data: aiConfig, isLoading: aiConfigLoading } = useQuery({
    queryKey: ["chatbot-ai-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_config")
        .select("key, value")
        .in("key", [
          "chatbot_openai_intent_prompt_id",
          "chatbot_openai_institutional_prompt_id",
          "chatbot_openai_vector_store_id",
          "chatbot_openai_api_key_reference",
        ]);

      if (error) throw error;

      const map = Object.fromEntries((data || []).map((row: any) => [row.key, row.value]));
      return {
        intentPromptId: map.chatbot_openai_intent_prompt_id || "",
        institutionalPromptId: map.chatbot_openai_institutional_prompt_id || "",
        vectorStoreId: map.chatbot_openai_vector_store_id || "",
        apiKeyReference: map.chatbot_openai_api_key_reference || "",
      } satisfies AIConfigForm;
    },
  });

  useEffect(() => {
    if (!selectedCategoryId && categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    if (!aiConfig) return;
    setAiConfigForm(aiConfig);
  }, [aiConfig]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) || categories[0] || null,
    [categories, selectedCategoryId],
  );

  useEffect(() => {
    if (selectedCategory && selectedCategory.id !== selectedCategoryId) {
      setSelectedCategoryId(selectedCategory.id);
    }
  }, [selectedCategory, selectedCategoryId]);

  const saveCategoryMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        key: normalizeKey(categoryForm.key),
        title: categoryForm.title.trim(),
        description: categoryForm.description.trim() || null,
        sort_order: Number(categoryForm.sort_order) || 0,
        is_active: categoryForm.is_active,
      };

      if (!payload.key || !payload.title) {
        throw new Error("Chave e titulo sao obrigatorios.");
      }

      if (categoryEditing) {
        const { error } = await supabase
          .from("chatbot_intent_categories" as any)
          .update(payload)
          .eq("id", categoryEditing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("chatbot_intent_categories" as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-intent-catalog"] });
      toast.success(categoryEditing ? "Categoria atualizada." : "Categoria criada.");
      closeCategoryDialog();
    },
    onError: (error: Error) => toast.error("Erro ao salvar categoria", { description: error.message }),
  });

  const saveExampleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCategory && !exampleEditing) {
        throw new Error("Selecione uma categoria antes de salvar.");
      }

      const payload = {
        category_id: exampleEditing?.category_id || selectedCategory?.id,
        example_text: exampleForm.example_text.trim(),
        sort_order: Number(exampleForm.sort_order) || 0,
        is_active: exampleForm.is_active,
      };

      if (!payload.category_id || !payload.example_text) {
        throw new Error("Exemplo e categoria sao obrigatorios.");
      }

      if (exampleEditing) {
        const { error } = await supabase
          .from("chatbot_intent_examples" as any)
          .update(payload)
          .eq("id", exampleEditing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("chatbot_intent_examples" as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-intent-catalog"] });
      toast.success(exampleEditing ? "Exemplo atualizado." : "Exemplo criado.");
      closeExampleDialog();
    },
    onError: (error: Error) => toast.error("Erro ao salvar exemplo", { description: error.message }),
  });

  const saveAiConfigMutation = useMutation({
    mutationFn: async () => {
      const entries = [
        { key: "chatbot_openai_intent_prompt_id", value: aiConfigForm.intentPromptId.trim() },
        { key: "chatbot_openai_institutional_prompt_id", value: aiConfigForm.institutionalPromptId.trim() },
        { key: "chatbot_openai_vector_store_id", value: aiConfigForm.vectorStoreId.trim() },
        { key: "chatbot_openai_api_key_reference", value: aiConfigForm.apiKeyReference.trim() },
      ];

      const { error } = await supabase.from("system_config").upsert(entries, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-ai-config"] });
      toast.success("Configuracao da IA salva.");
    },
    onError: (error: Error) => toast.error("Erro ao salvar configuracao da IA", { description: error.message }),
  });

  const toggleCategoryActive = async (category: IntentCategory) => {
    const { error } = await supabase
      .from("chatbot_intent_categories" as any)
      .update({ is_active: !category.is_active })
      .eq("id", category.id);

    if (error) {
      toast.error("Erro ao atualizar categoria", { description: error.message });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["chatbot-intent-catalog"] });
    toast.success(category.is_active ? "Categoria inativada." : "Categoria ativada.");
  };

  const toggleExampleActive = async (example: IntentExample) => {
    const { error } = await supabase
      .from("chatbot_intent_examples" as any)
      .update({ is_active: !example.is_active })
      .eq("id", example.id);

    if (error) {
      toast.error("Erro ao atualizar exemplo", { description: error.message });
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["chatbot-intent-catalog"] });
    toast.success(example.is_active ? "Exemplo inativado." : "Exemplo ativado.");
  };

  const openCategoryDialog = (category?: IntentCategory) => {
    if (category) {
      setCategoryEditing(category);
      setCategoryForm({
        key: category.key,
        title: category.title,
        description: category.description || "",
        sort_order: category.sort_order,
        is_active: category.is_active,
      });
    } else {
      setCategoryEditing(null);
      setCategoryForm(EMPTY_CATEGORY_FORM);
    }
    setCategoryDialogOpen(true);
  };

  const closeCategoryDialog = () => {
    setCategoryDialogOpen(false);
    setCategoryEditing(null);
    setCategoryForm(EMPTY_CATEGORY_FORM);
  };

  const openExampleDialog = (example?: IntentExample) => {
    if (example) {
      setExampleEditing(example);
      setExampleForm({
        example_text: example.example_text,
        sort_order: example.sort_order,
        is_active: example.is_active,
      });
    } else {
      setExampleEditing(null);
      setExampleForm(EMPTY_EXAMPLE_FORM);
    }
    setExampleDialogOpen(true);
  };

  const closeExampleDialog = () => {
    setExampleDialogOpen(false);
    setExampleEditing(null);
    setExampleForm(EMPTY_EXAMPLE_FORM);
  };

  const activeCount = categories.filter((category) => category.is_active).length;
  const exampleCount = categories.reduce((total, category) => total + category.examples.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-brand">IA</h2>
        <p className="text-sm text-muted-foreground">
          Configure o classificador local e os identificadores da OpenAI consumidos pelo chatbot.
        </p>
      </div>

      <Tabs defaultValue="intents" className="space-y-6">
        <TabsList>
          <TabsTrigger value="intents">Intencoes</TabsTrigger>
          <TabsTrigger value="settings">Configuracao IA</TabsTrigger>
        </TabsList>

        <TabsContent value="intents" className="space-y-6">
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Bot className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xl font-bold">{categories.length}</p>
                  <p className="text-xs text-muted-foreground">Categorias</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xl font-bold">{activeCount}</p>
                  <p className="text-xs text-muted-foreground">Ativas</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <Save className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xl font-bold">{exampleCount}</p>
                  <p className="text-xs text-muted-foreground">Exemplos</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Categorias</CardTitle>
                  <p className="text-sm text-muted-foreground">Ative, inative e edite as intencoes do classificador.</p>
                </div>
                <Button variant="outline" onClick={() => openCategoryDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar categoria
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chave</TableHead>
                      <TableHead>Titulo</TableHead>
                      <TableHead>Exemplos</TableHead>
                      <TableHead>Ordem</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-32">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Carregando...</TableCell>
                      </TableRow>
                    ) : categories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          Nenhuma categoria cadastrada
                        </TableCell>
                      </TableRow>
                    ) : (
                      categories.map((category) => (
                        <TableRow
                          key={category.id}
                          className={selectedCategoryId === category.id ? "bg-muted/40" : ""}
                          onClick={() => setSelectedCategoryId(category.id)}
                        >
                          <TableCell className="font-mono text-xs">{category.key}</TableCell>
                          <TableCell>
                            <div className="font-medium">{category.title}</div>
                            <div className="line-clamp-2 text-xs text-muted-foreground">{category.description || "-"}</div>
                          </TableCell>
                          <TableCell>{category.examples.filter((example) => example.is_active).length}</TableCell>
                          <TableCell>{category.sort_order}</TableCell>
                          <TableCell>
                            <Badge variant={category.is_active ? "default" : "secondary"}>
                              {category.is_active ? "Ativa" : "Inativa"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openCategoryDialog(category);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Switch
                                checked={category.is_active}
                                onCheckedChange={() => toggleCategoryActive(category)}
                                onClick={(event) => event.stopPropagation()}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Exemplos</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedCategory ? `Categoria selecionada: ${selectedCategory.title}` : "Selecione uma categoria"}
                  </p>
                </div>
                <Button variant="outline" onClick={() => openExampleDialog()} disabled={!selectedCategory}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo exemplo
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {!selectedCategory ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Selecione uma categoria para editar seus exemplos.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exemplo</TableHead>
                        <TableHead>Ordem</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-32">Acoes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCategory.examples.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                            Nenhum exemplo cadastrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedCategory.examples.map((example) => (
                          <TableRow key={example.id}>
                            <TableCell>{example.example_text}</TableCell>
                            <TableCell>{example.sort_order}</TableCell>
                            <TableCell>
                              <Badge variant={example.is_active ? "default" : "secondary"}>
                                {example.is_active ? "Ativo" : "Inativo"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openExampleDialog(example)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Switch checked={example.is_active} onCheckedChange={() => toggleExampleActive(example)} />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader className="flex flex-row items-start gap-3">
              <KeyRound className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base">Configuracao da IA</CardTitle>
                <p className="text-sm text-muted-foreground">
                  IDs de prompt/agente e `vector_store_id` consumidos pelo chatbot via `chatbot-settings`.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="intent-prompt-id">Prompt/Agent ID - interpretacao</Label>
                  <Input
                    id="intent-prompt-id"
                    value={aiConfigForm.intentPromptId}
                    onChange={(event) => setAiConfigForm({ ...aiConfigForm, intentPromptId: event.target.value })}
                    placeholder="pmpt_..."
                    disabled={aiConfigLoading || saveAiConfigMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institutional-prompt-id">Prompt/Agent ID - institucional</Label>
                  <Input
                    id="institutional-prompt-id"
                    value={aiConfigForm.institutionalPromptId}
                    onChange={(event) => setAiConfigForm({ ...aiConfigForm, institutionalPromptId: event.target.value })}
                    placeholder="pmpt_..."
                    disabled={aiConfigLoading || saveAiConfigMutation.isPending}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vector-store-id">Vector Store ID</Label>
                  <Input
                    id="vector-store-id"
                    value={aiConfigForm.vectorStoreId}
                    onChange={(event) => setAiConfigForm({ ...aiConfigForm, vectorStoreId: event.target.value })}
                    placeholder="vs_..."
                    disabled={aiConfigLoading || saveAiConfigMutation.isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-key-reference">Referencia da chave OpenAI</Label>
                  <Input
                    id="api-key-reference"
                    value={aiConfigForm.apiKeyReference}
                    onChange={(event) => setAiConfigForm({ ...aiConfigForm, apiKeyReference: event.target.value })}
                    placeholder="openai-project-prod"
                    disabled={aiConfigLoading || saveAiConfigMutation.isPending}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                A chave real continua fora do painel. Aqui fica apenas a referencia operacional e os IDs usados pelo chatbot.
              </div>

              <Button onClick={() => saveAiConfigMutation.mutate()} disabled={saveAiConfigMutation.isPending}>
                {saveAiConfigMutation.isPending ? "Salvando..." : "Salvar configuracao da IA"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={categoryDialogOpen} onOpenChange={(open) => (open ? setCategoryDialogOpen(true) : closeCategoryDialog())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{categoryEditing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveCategoryMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Chave *</Label>
              <Input
                value={categoryForm.key}
                onChange={(event) => setCategoryForm({ ...categoryForm, key: event.target.value })}
                placeholder="greeting"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Titulo *</Label>
              <Input
                value={categoryForm.title}
                onChange={(event) => setCategoryForm({ ...categoryForm, title: event.target.value })}
                placeholder="Saudacao"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Descricao</Label>
              <Textarea
                value={categoryForm.description}
                onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })}
                placeholder="Mensagens de cumprimento e abertura da conversa."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={categoryForm.sort_order}
                  onChange={(event) => setCategoryForm({ ...categoryForm, sort_order: Number(event.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-3 pt-7">
                <Switch
                  checked={categoryForm.is_active}
                  onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, is_active: checked })}
                />
                <Label>Ativa</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCategoryDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveCategoryMutation.isPending}>
                {saveCategoryMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={exampleDialogOpen} onOpenChange={(open) => (open ? setExampleDialogOpen(true) : closeExampleDialog())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{exampleEditing ? "Editar exemplo" : "Novo exemplo"}</DialogTitle>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveExampleMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label>Exemplo *</Label>
              <Textarea
                value={exampleForm.example_text}
                onChange={(event) => setExampleForm({ ...exampleForm, example_text: event.target.value })}
                placeholder="tem horario na segunda as 16?"
                rows={3}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={exampleForm.sort_order}
                  onChange={(event) => setExampleForm({ ...exampleForm, sort_order: Number(event.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center gap-3 pt-7">
                <Switch
                  checked={exampleForm.is_active}
                  onCheckedChange={(checked) => setExampleForm({ ...exampleForm, is_active: checked })}
                />
                <Label>Ativo</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeExampleDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveExampleMutation.isPending || !selectedCategory}>
                {saveExampleMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
