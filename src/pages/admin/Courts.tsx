import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

type Court = {
  id: string;
  name: string;
  location: string | null;
  surface_type: string | null;
  photo_url: string | null;
  is_active: boolean;
};

type CourtForm = {
  name: string;
  location: string;
  surface_type: string;
  photo_url: string;
  is_active: boolean;
};

const EMPTY_FORM: CourtForm = {
  name: "",
  location: "",
  surface_type: "",
  photo_url: "",
  is_active: true,
};

export default function Courts() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Court | null>(null);
  const [form, setForm] = useState<CourtForm>(EMPTY_FORM);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const { data: courts = [], isLoading } = useQuery({
    queryKey: ["courts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Court[];
    },
  });

  const uploadCourtPhoto = async (courtId: string, file: File) => {
    setUploadingPhoto(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${courtId}/photo-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("court-images")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("court-images").getPublicUrl(path);
      return publicUrlData.publicUrl;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: CourtForm & { id?: string }) => {
      const payload = {
        name: data.name,
        location: data.location || null,
        surface_type: data.surface_type || null,
        photo_url: data.photo_url || null,
        is_active: data.is_active,
      };

      if (data.id) {
        const { data: updatedCourt, error } = await supabase
          .from("courts")
          .update(payload)
          .eq("id", data.id)
          .select("id, photo_url")
          .single();

        if (error) throw error;

        if (selectedPhoto) {
          const photoUrl = await uploadCourtPhoto(updatedCourt.id, selectedPhoto);
          const { error: photoUpdateError } = await supabase
            .from("courts")
            .update({ photo_url: photoUrl })
            .eq("id", updatedCourt.id);

          if (photoUpdateError) throw photoUpdateError;
        }
      } else {
        const { data: insertedCourt, error } = await supabase
          .from("courts")
          .insert(payload)
          .select("id")
          .single();

        if (error) throw error;

        if (selectedPhoto) {
          const photoUrl = await uploadCourtPhoto(insertedCourt.id, selectedPhoto);
          const { error: photoUpdateError } = await supabase
            .from("courts")
            .update({ photo_url: photoUrl })
            .eq("id", insertedCourt.id);

          if (photoUpdateError) throw photoUpdateError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] });
      toast.success(editing ? "Quadra atualizada!" : "Quadra criada!");
      handleClose();
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar quadra", { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courts"] });
      toast.success("Quadra removida!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover quadra", { description: error.message });
    },
  });

  const handleOpen = (court?: Court) => {
    if (court) {
      setEditing(court);
      setForm({
        name: court.name,
        location: court.location || "",
        surface_type: court.surface_type || "",
        photo_url: court.photo_url || "",
        is_active: court.is_active,
      });
      setPhotoPreview(court.photo_url);
    } else {
      setEditing(null);
      setForm(EMPTY_FORM);
      setPhotoPreview(null);
    }

    setSelectedPhoto(null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setSelectedPhoto(null);
    setPhotoPreview(null);
  };

  const handlePhotoSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Arquivo invalido", { description: "Selecione apenas imagens." });
      return;
    }

    setSelectedPhoto(file);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setForm((current) => ({ ...current, photo_url: "" }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    saveMutation.mutate({ ...form, id: editing?.id });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-brand text-2xl font-bold">Quadras</h2>
          <p className="text-sm text-muted-foreground">Gerencie as quadras do seu estabelecimento</p>
        </div>
        <Button onClick={() => handleOpen()}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Quadra
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Foto</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Localizacao</TableHead>
                <TableHead>Tipo de Piso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : courts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhuma quadra cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                courts.map((court) => (
                  <TableRow key={court.id}>
                    <TableCell>
                      <div className="flex h-14 w-20 items-center justify-center overflow-hidden rounded-md bg-muted">
                        {court.photo_url ? (
                          <img
                            src={court.photo_url}
                            alt={`Foto da quadra ${court.name}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{court.name}</TableCell>
                    <TableCell>{court.location || "-"}</TableCell>
                    <TableCell>{court.surface_type || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={court.is_active ? "default" : "secondary"}>
                        {court.is_active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpen(court)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Remover esta quadra?")) {
                              deleteMutation.mutate(court.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Quadra" : "Nova Quadra"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Quadra Principal"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Localizacao</Label>
              <Input
                value={form.location}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
                placeholder="Praia de Copacabana"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Piso</Label>
              <Input
                value={form.surface_type}
                onChange={(event) => setForm({ ...form, surface_type: event.target.value })}
                placeholder="Areia"
              />
            </div>

            <div className="space-y-3">
              <Label>Foto da Quadra</Label>
              <div className="flex items-start gap-4">
                <div className="flex h-28 w-40 items-center justify-center overflow-hidden rounded-md border bg-muted">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview da quadra" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ImageIcon className="h-6 w-6" />
                      <span className="text-xs">Sem foto</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="court-photo"
                    className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {photoPreview ? "Trocar foto" : "Enviar foto"}
                  </Label>
                  <Input
                    id="court-photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelection}
                    className="hidden"
                  />
                  {photoPreview && (
                    <Button type="button" variant="outline" onClick={handleRemovePhoto}>
                      Remover foto
                    </Button>
                  )}
                  <p className="max-w-xs text-xs text-muted-foreground">
                    Envie apenas uma imagem para representar a quadra.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label>Quadra ativa</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending || uploadingPhoto}>
                {saveMutation.isPending || uploadingPhoto ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
