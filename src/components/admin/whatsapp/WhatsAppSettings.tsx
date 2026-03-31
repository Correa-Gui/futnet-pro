import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_WHATSAPP_PROVIDER_CONFIG,
  useWhatsAppProviderConfig,
} from "@/hooks/useWhatsAppProviderConfig";

export default function WhatsAppSettings() {
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useWhatsAppProviderConfig();
  const [baseUrl, setBaseUrl] = useState(DEFAULT_WHATSAPP_PROVIDER_CONFIG.baseUrl);
  const [instanceName, setInstanceName] = useState(DEFAULT_WHATSAPP_PROVIDER_CONFIG.instanceName);

  useEffect(() => {
    if (!config) return;
    setBaseUrl(config.baseUrl);
    setInstanceName(config.instanceName);
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("system_config").upsert(
        [
          { key: "whatsapp_service_base_url", value: baseUrl.trim() },
          { key: "whatsapp_instance_name", value: instanceName.trim() },
        ],
        { onConflict: "key" }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-provider-config"] });
      toast.success("Configurações do WhatsApp salvas.");
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar configurações", { description: error.message });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3">
        <Settings2 className="mt-0.5 h-5 w-5 text-primary" />
        <div>
          <CardTitle>Configurações do serviço</CardTitle>
          <CardDescription>
            Informe a URL base do seu FastAPI. O sistema usará automaticamente o endpoint
            <code className="ml-1 rounded bg-muted px-1 py-0.5 text-xs">/messages/send</code>.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="wa-base-url">URL base do serviço</Label>
          <Input
            id="wa-base-url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://seu-servico.exemplo.com"
            disabled={isLoading || saveMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">
            Exemplo de destino final:
            <code className="ml-1 rounded bg-muted px-1 py-0.5">https://seu-servico.exemplo.com/messages/send</code>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wa-instance-name">Nome da instância</Label>
          <Input
            id="wa-instance-name"
            value={instanceName}
            onChange={(e) => setInstanceName(e.target.value)}
            placeholder="SB Tech"
            disabled={isLoading || saveMutation.isPending}
          />
          <p className="text-xs text-muted-foreground">
            Este valor será enviado no campo <code className="rounded bg-muted px-1 py-0.5">instance_name</code>.
          </p>
        </div>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!baseUrl.trim() || !instanceName.trim() || saveMutation.isPending}
        >
          {saveMutation.isPending ? "Salvando..." : "Salvar configurações"}
        </Button>
      </CardContent>
    </Card>
  );
}
