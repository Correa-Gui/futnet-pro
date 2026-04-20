import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, Upload, Eye, EyeOff, Pencil, Image as ImageIcon, ExternalLink, Loader2, Clock, Plus, Trash2, GripVertical } from "lucide-react";
import { useBusinessHours, DEFAULT_BUSINESS_HOURS, type BusinessHours } from "@/hooks/useBusinessHours";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LandingSettings {
  id: string;
  business_mode: string;
  hero_image_url: string | null;
  whatsapp_number: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  primary_cta_text: string;
  primary_cta_url: string;
}

interface SectionConfig {
  id: string;
  section_key: string;
  is_visible: boolean;
  title: string | null;
  subtitle: string | null;
  content: any;
  image_url: string | null;
  display_order: number;
}

interface GalleryImage {
  url: string;
  label: string;
}

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero — Topo da página",
  stats: "Estatísticas",
  about: "Sobre Nós",
  gallery: "Galeria — Foto destaque (grande)",
  benefits: "Benefícios",
  how_it_works: "Como Funciona",
  testimonials: "Depoimentos",
  plans: "Planos",
  faq: "FAQ",
  final_cta: "CTA Final",
};

const SECTION_IMAGE_HINTS: Record<string, string> = {
  hero: "Aparece como fundo da tela inicial (fullscreen). Use foto horizontal de alta qualidade, de preferência com atleta em ação.",
  about: "Aparece na seção 'Serviços' como foto do card de Aulas. Mostre um treino ou professor com alunos.",
  gallery: "Foto principal no grid 'O Espaço' (ocupa 2 colunas × 2 linhas). Use uma imagem panorâmica das quadras.",
};

const DAY_NAMES = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

const HOUR_OPTIONS = Array.from({ length: 19 }, (_, i) => i + 5); // 5h to 23h

export default function LandingPageEditor() {
  const [settings, setSettings] = useState<LandingSettings | null>(null);
  const [sections, setSections] = useState<SectionConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editSection, setEditSection] = useState<SectionConfig | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const { data: fetchedHours } = useBusinessHours();
  const { toast } = useToast();

  // Day use price
  const [dayUsePrice, setDayUsePrice] = useState("");
  const [savingDayUse, setSavingDayUse] = useState(false);

  // Gallery images
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [savingGallery, setSavingGallery] = useState(false);
  const [newGalleryLabel, setNewGalleryLabel] = useState("");
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [hoursLoaded, setHoursLoaded] = useState(false);
  if (fetchedHours && !hoursLoaded) {
    setBusinessHours(fetchedHours);
    setHoursLoaded(true);
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [settingsRes, sectionsRes, dayUsePriceRes, galleryRes] = await Promise.all([
      supabase.from("landing_page_settings").select("*").limit(1).single(),
      supabase.from("landing_page_config").select("*").order("display_order"),
      supabase.from("system_config").select("value").eq("key", "day_use_price").maybeSingle(),
      supabase.from("system_config").select("value").eq("key", "gallery_images").maybeSingle(),
    ]);
    if (settingsRes.data) setSettings(settingsRes.data as unknown as LandingSettings);
    if (sectionsRes.data) setSections(sectionsRes.data as unknown as SectionConfig[]);
    if (dayUsePriceRes.data?.value) setDayUsePrice(dayUsePriceRes.data.value);
    if (galleryRes.data?.value) {
      try {
        const parsed = JSON.parse(galleryRes.data.value);
        if (Array.isArray(parsed)) setGalleryImages(parsed);
      } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const saveSettingsAndHours = async () => {
    if (!settings) return;
    setSaving(true);
    const [settingsRes, hoursRes] = await Promise.all([
      supabase
        .from("landing_page_settings")
        .update({
          business_mode: settings.business_mode,
          hero_image_url: settings.hero_image_url,
          whatsapp_number: settings.whatsapp_number,
          instagram_url: settings.instagram_url,
          youtube_url: settings.youtube_url,
          primary_cta_text: settings.primary_cta_text,
          primary_cta_url: settings.primary_cta_url,
        })
        .eq("id", settings.id),
      supabase
        .from("system_config")
        .upsert({ key: "business_hours", value: JSON.stringify(businessHours) }, { onConflict: "key" }),
    ]);
    setSaving(false);
    if (settingsRes.error || hoursRes.error) {
      toast({ title: "Erro ao salvar", description: (settingsRes.error || hoursRes.error)?.message, variant: "destructive" });
    } else {
      toast({ title: "Configurações salvas!" });
    }
  };

  const saveDayUsePrice = async () => {
    setSavingDayUse(true);
    const { error } = await supabase
      .from("system_config")
      .upsert({ key: "day_use_price", value: dayUsePrice.trim() }, { onConflict: "key" });
    setSavingDayUse(false);
    if (error) {
      toast({ title: "Erro ao salvar preço", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Preço Day Use salvo!" });
    }
  };

  const saveGalleryImages = async (images: GalleryImage[]) => {
    setSavingGallery(true);
    const { error } = await supabase
      .from("system_config")
      .upsert({ key: "gallery_images", value: JSON.stringify(images) }, { onConflict: "key" });
    setSavingGallery(false);
    if (error) {
      toast({ title: "Erro ao salvar galeria", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Galeria atualizada!" });
    }
  };

  const uploadGalleryImage = async (file: File) => {
    setUploadingGallery(true);
    const ext = file.name.split(".").pop();
    const path = `gallery/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("landing-images").upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      setUploadingGallery(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("landing-images").getPublicUrl(path);
    const updated = [...galleryImages, { url: urlData.publicUrl, label: newGalleryLabel.trim() || "Imagem" }];
    setGalleryImages(updated);
    setNewGalleryLabel("");
    setUploadingGallery(false);
    await saveGalleryImages(updated);
  };

  const handleGalleryFileInput = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) uploadGalleryImage(file);
    };
    input.click();
  };

  const removeGalleryImage = async (index: number) => {
    const updated = galleryImages.filter((_, i) => i !== index);
    setGalleryImages(updated);
    await saveGalleryImages(updated);
  };

  const moveGalleryImage = async (from: number, to: number) => {
    if (to < 0 || to >= galleryImages.length) return;
    const updated = [...galleryImages];
    const [item] = updated.splice(from, 1);
    updated.splice(to, 0, item);
    setGalleryImages(updated);
    await saveGalleryImages(updated);
  };

  const toggleVisibility = async (section: SectionConfig) => {
    const newVal = !section.is_visible;
    setSections((prev) => prev.map((s) => (s.id === section.id ? { ...s, is_visible: newVal } : s)));
    await supabase.from("landing_page_config").update({ is_visible: newVal }).eq("id", section.id);
  };

  const saveSection = async () => {
    if (!editSection) return;
    setSaving(true);
    const { error } = await supabase
      .from("landing_page_config")
      .update({
        title: editSection.title,
        subtitle: editSection.subtitle,
        content: editSection.content,
      })
      .eq("id", editSection.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar seção", description: error.message, variant: "destructive" });
    } else {
      setSections((prev) => prev.map((s) => (s.id === editSection.id ? editSection : s)));
      setEditDialogOpen(false);
      toast({ title: "Seção atualizada!" });
    }
  };

  const uploadImage = async (file: File, target: "hero" | string) => {
    setUploadingFor(target);
    const ext = file.name.split(".").pop();
    const path = `${target}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("landing-images").upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      setUploadingFor(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("landing-images").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    if (target === "hero") {
      setSettings((prev) => prev ? { ...prev, hero_image_url: publicUrl } : prev);
      await supabase.from("landing_page_settings").update({ hero_image_url: publicUrl }).eq("id", settings!.id);
    } else {
      setSections((prev) =>
        prev.map((s) => (s.section_key === target ? { ...s, image_url: publicUrl } : s))
      );
      await supabase.from("landing_page_config").update({ image_url: publicUrl }).eq("section_key", target);
    }
    setUploadingFor(null);
    toast({ title: "Imagem enviada!" });
  };

  const handleFileInput = (target: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) uploadImage(file, target);
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editor da Landing Page</h1>
          <p className="text-muted-foreground text-sm">Personalize a página pública do seu negócio</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/landing" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" /> Ver Landing Page
          </a>
        </Button>
      </div>

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Configurações Gerais</TabsTrigger>
          <TabsTrigger value="secoes">Seções</TabsTrigger>
        </TabsList>

        {/* ── TAB: General Settings ── */}
        <TabsContent value="geral" className="space-y-6">
          {settings && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Modo de Negócio</CardTitle>
                  <CardDescription>Escolha quais serviços aparecem na landing page</CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={settings.business_mode}
                    onValueChange={(v) => setSettings({ ...settings, business_mode: v })}
                    className="flex flex-col gap-3"
                  >
                    {[
                      { value: "classes", label: "Apenas Aulas" },
                      { value: "rentals", label: "Apenas Aluguel de Quadras" },
                      { value: "both", label: "Aulas + Aluguel de Quadras" },
                    ].map((opt) => (
                      <div key={opt.value} className="flex items-center gap-3">
                        <RadioGroupItem value={opt.value} id={opt.value} />
                        <Label htmlFor={opt.value} className="cursor-pointer">{opt.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Imagem do Hero</CardTitle>
                  <CardDescription>
                    Aparece como fundo fullscreen na primeira tela da landing page. Use uma foto horizontal (mínimo 1800×900px), de preferência com atleta em ação ou vista panorâmica da arena.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {settings.hero_image_url && (
                    <img
                      src={settings.hero_image_url}
                      alt="Hero"
                      className="rounded-lg max-h-48 object-cover w-full"
                    />
                  )}
                  <Button
                    variant="outline"
                    onClick={() => handleFileInput("hero")}
                    disabled={uploadingFor === "hero"}
                  >
                    {uploadingFor === "hero" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    {settings.hero_image_url ? "Trocar Imagem" : "Enviar Imagem"}
                  </Button>
                </CardContent>
              </Card>

              {/* Day Use Price */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Preço do Day Use</CardTitle>
                  <CardDescription>
                    Valor por pessoa exibido na landing page. Use apenas o número (ex: 120) ou com casas decimais (ex: 120.00).
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm font-medium">R$</span>
                    <Input
                      value={dayUsePrice}
                      onChange={(e) => setDayUsePrice(e.target.value)}
                      placeholder="120"
                      className="max-w-[160px]"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={saveDayUsePrice}
                    disabled={savingDayUse}
                  >
                    {savingDayUse ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Preço
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Contato & Redes Sociais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>WhatsApp (com DDD e código do país)</Label>
                    <Input
                      value={settings.whatsapp_number || ""}
                      onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                      placeholder="5511999999999"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Instagram URL</Label>
                    <Input
                      value={settings.instagram_url || ""}
                      onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })}
                      placeholder="https://instagram.com/seu_perfil"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>YouTube URL</Label>
                    <Input
                      value={settings.youtube_url || ""}
                      onChange={(e) => setSettings({ ...settings, youtube_url: e.target.value })}
                      placeholder="https://youtube.com/@seucanal"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Botão Principal (CTA)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Texto do botão</Label>
                    <Input
                      value={settings.primary_cta_text}
                      onChange={(e) => setSettings({ ...settings, primary_cta_text: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Link do botão</Label>
                    <Input
                      value={settings.primary_cta_url}
                      onChange={(e) => setSettings({ ...settings, primary_cta_url: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5" /> Horário de Funcionamento
                  </CardTitle>
                  <CardDescription>Define os dias e horários exibidos nos agendamentos</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Dias abertos</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {DAY_NAMES.map((day) => (
                        <label key={day.value} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={businessHours.open_days.includes(day.value)}
                            onCheckedChange={(checked) => {
                              setBusinessHours((prev) => ({
                                ...prev,
                                open_days: checked
                                  ? [...prev.open_days, day.value].sort()
                                  : prev.open_days.filter((d) => d !== day.value),
                              }));
                            }}
                          />
                          <span className="text-sm">{day.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Abertura</Label>
                      <Select
                        value={String(businessHours.open_hour)}
                        onValueChange={(v) => setBusinessHours((prev) => ({ ...prev, open_hour: parseInt(v) }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {HOUR_OPTIONS.map((h) => (
                            <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")}:00</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Fechamento</Label>
                      <Select
                        value={String(businessHours.close_hour)}
                        onValueChange={(v) => setBusinessHours((prev) => ({ ...prev, close_hour: parseInt(v) }))}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {HOUR_OPTIONS.map((h) => (
                            <SelectItem key={h} value={String(h)}>{String(h).padStart(2, "0")}:00</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button onClick={saveSettingsAndHours} disabled={saving} className="w-full sm:w-auto">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Configurações
              </Button>
            </>
          )}
        </TabsContent>

        {/* ── TAB: Sections ── */}
        <TabsContent value="secoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Galeria — O Espaço</CardTitle>
              <CardDescription>
                Imagens exibidas na seção "O Espaço". A primeira ocupa o espaço maior (2×2). Se vazio, usa imagens padrão.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {galleryImages.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma imagem adicionada. Usando imagens padrão.</p>
              )}

              {galleryImages.map((img, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                    <img src={img.url} alt={img.label} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{img.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{img.url}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={i === 0} onClick={() => moveGalleryImage(i, i - 1)} title="Mover para cima">↑</Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={i === galleryImages.length - 1} onClick={() => moveGalleryImage(i, i + 1)} title="Mover para baixo">↓</Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeGalleryImage(i)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}

              <div className="rounded-lg border border-dashed p-4 space-y-3">
                <p className="text-sm font-medium">Adicionar foto</p>
                <div className="space-y-2">
                  <Label className="text-xs">Legenda (opcional)</Label>
                  <Input value={newGalleryLabel} onChange={(e) => setNewGalleryLabel(e.target.value)} placeholder="Quadras premium" />
                </div>
                <Button size="sm" onClick={handleGalleryFileInput} disabled={uploadingGallery || savingGallery}>
                  {uploadingGallery || savingGallery ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Enviar foto
                </Button>
              </div>
            </CardContent>
          </Card>
          {sections.map((section) => (
            <Card key={section.id}>
              <CardContent className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-16 h-12 rounded-md bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {section.image_url ? (
                      <img src={section.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {SECTION_LABELS[section.section_key] || section.section_key}
                    </p>
                    {SECTION_IMAGE_HINTS[section.section_key] ? (
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {SECTION_IMAGE_HINTS[section.section_key]}
                      </p>
                    ) : section.title ? (
                      <p className="text-xs text-muted-foreground truncate">{section.title}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleFileInput(section.section_key)}
                    disabled={uploadingFor === section.section_key}
                    title="Enviar imagem"
                  >
                    {uploadingFor === section.section_key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setEditSection({ ...section }); setEditDialogOpen(true); }}
                    title="Editar textos"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Switch
                    checked={section.is_visible}
                    onCheckedChange={() => toggleVisibility(section)}
                  />
                  {section.is_visible ? (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* ── Edit Section Dialog ── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Editar: {editSection ? SECTION_LABELS[editSection.section_key] || editSection.section_key : ""}
            </DialogTitle>
          </DialogHeader>
          {editSection && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input
                  value={editSection.title || ""}
                  onChange={(e) => setEditSection({ ...editSection, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Subtítulo / Label</Label>
                <Input
                  value={editSection.subtitle || ""}
                  onChange={(e) => setEditSection({ ...editSection, subtitle: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Conteúdo extra (JSON)</Label>
                <Textarea
                  rows={6}
                  value={editSection.content ? JSON.stringify(editSection.content, null, 2) : ""}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setEditSection({ ...editSection, content: parsed });
                    } catch {
                      // keep raw value during typing
                    }
                  }}
                  placeholder='Ex: {"items": ["item1", "item2"]}'
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveSection} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
