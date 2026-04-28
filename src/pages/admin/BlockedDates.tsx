import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CalendarOff, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type BlockedDate = { date: string; reason: string };

const CONFIG_KEY = "blocked_dates";

function useBlockedDates() {
  return useQuery({
    queryKey: [CONFIG_KEY],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", CONFIG_KEY)
        .maybeSingle();
      try {
        return (JSON.parse(data?.value || "[]") as BlockedDate[])
          .sort((a, b) => a.date.localeCompare(b.date));
      } catch {
        return [] as BlockedDate[];
      }
    },
    staleTime: 0,
  });
}

function useSaveBlockedDates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dates: BlockedDate[]) => {
      const { error } = await supabase
        .from("system_config")
        .upsert({ key: CONFIG_KEY, value: JSON.stringify(dates) }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [CONFIG_KEY] }),
  });
}

export default function BlockedDates() {
  const { data: blockedDates = [], isLoading } = useBlockedDates();
  const save = useSaveBlockedDates();

  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");

  const existingDates = useMemo(() => new Set(blockedDates.map((b) => b.date)), [blockedDates]);

  async function handleAdd() {
    if (!newDate) { toast.error("Selecione uma data"); return; }
    if (existingDates.has(newDate)) { toast.error("Essa data já está bloqueada"); return; }
    const updated = [...blockedDates, { date: newDate, reason: newReason.trim() || "Bloqueado" }]
      .sort((a, b) => a.date.localeCompare(b.date));
    await save.mutateAsync(updated);
    toast.success("Data bloqueada com sucesso");
    setNewDate("");
    setNewReason("");
  }

  async function handleRemove(date: string) {
    const updated = blockedDates.filter((b) => b.date !== date);
    await save.mutateAsync(updated);
    toast.success("Data desbloqueada");
  }

  function formatDate(dateStr: string) {
    try {
      return format(parseISO(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <CalendarOff className="h-6 w-6 text-destructive" />
        <div>
          <h1 className="text-2xl font-bold">Dias Bloqueados</h1>
          <p className="text-sm text-muted-foreground">
            Datas marcadas aqui ficam indisponíveis para reservas, aulas e day use.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionar data bloqueada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="blocked-date">Data</Label>
              <Input
                id="blocked-date"
                type="date"
                min={today}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="blocked-reason">Motivo</Label>
              <Input
                id="blocked-reason"
                placeholder="Ex: Alugado para evento"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              />
            </div>
          </div>
          <Button onClick={handleAdd} disabled={save.isPending || !newDate} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Bloquear data
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datas bloqueadas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!isLoading && blockedDates.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma data bloqueada.</p>
          )}
          <ul className="divide-y">
            {blockedDates.map((b) => (
              <li key={b.date} className="flex items-center justify-between py-3 gap-4">
                <div>
                  <p className="font-medium text-sm">{formatDate(b.date)}</p>
                  <p className="text-xs text-muted-foreground">{b.reason}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive h-8 w-8"
                  onClick={() => handleRemove(b.date)}
                  disabled={save.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
