import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Clock, DollarSign, Loader2, Percent, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBusinessHours, type BusinessHours, DEFAULT_BUSINESS_HOURS } from "@/hooks/useBusinessHours";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptions, useTenant } from "@/core/tenant";
import { toast } from "sonner";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const MODULE_OPTIONS = [
  {
    id: "admin",
    label: "Painel administrativo",
    description: "Libera o backoffice e as rotas /admin para este tenant.",
  },
  {
    id: "teacher",
    label: "Portal do professor",
    description: "Libera as rotas /professor e a area operacional do docente.",
  },
  {
    id: "student",
    label: "Portal do aluno",
    description: "Libera as rotas /aluno e a experiencia do aluno.",
  },
] as const;

type ConfigRow = { key: string; value: string };
type ModuleState = Record<string, boolean>;

function useSystemConfig(keys: string[]) {
  return useQuery({
    queryKey: ["system-config", ...keys],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_config")
        .select("key, value")
        .in("key", keys);

      return Object.fromEntries((data || []).map((row: ConfigRow) => [row.key, row.value]));
    },
    staleTime: 5 * 60 * 1000,
  });
}

function saveConfigs(entries: { key: string; value: string }[]) {
  return supabase.from("system_config").upsert(entries, { onConflict: "key" });
}

function buildModuleState(activeModules: string[]): ModuleState {
  return Object.fromEntries(
    MODULE_OPTIONS.map((moduleOption) => [moduleOption.id, activeModules.includes(moduleOption.id)])
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { tenant } = useTenant();
  const { data: subscriptions, isLoading: subscriptionsLoading } = useSubscriptions(
    MODULE_OPTIONS.map((moduleOption) => moduleOption.id)
  );
  const { data: businessHoursData } = useBusinessHours();
  const hours: BusinessHours = businessHoursData || DEFAULT_BUSINESS_HOURS;

  const { data: identityConfig, isLoading: identityLoading } = useSystemConfig([
    "company_name",
    "company_logo_url",
    "app_url",
    "company_address",
    "tenant_primary_color",
  ]);
  const { data: priceConfig, isLoading: priceLoading } = useSystemConfig([
    "court_rental_price",
    "day_use_price",
  ]);
  const { data: whatsappConfig, isLoading: whatsappLoading } = useSystemConfig(["admin_group_jid"]);
  const { data: reservationConfig, isLoading: reservationLoading } = useSystemConfig([
    "reservation_deposit_percentage",
  ]);

  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [appUrl, setAppUrl] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [logoUploading, setLogoUploading] = useState(false);
  const [rentalPrice, setRentalPrice] = useState("");
  const [dayUsePrice, setDayUsePrice] = useState("");
  const [adminGroupJid, setAdminGroupJid] = useState("");
  const [depositPct, setDepositPct] = useState("");
  const [moduleStates, setModuleStates] = useState<ModuleState>(() =>
    buildModuleState(MODULE_OPTIONS.map((moduleOption) => moduleOption.id))
  );

  useEffect(() => {
    setCompanyName(tenant?.config.companyName || identityConfig?.company_name || "");
    setLogoUrl(tenant?.config.companyLogoUrl || identityConfig?.company_logo_url || "");
    setAppUrl(tenant?.config.appUrl || identityConfig?.app_url || "");
    setCompanyAddress(tenant?.config.companyAddress || identityConfig?.company_address || "");
    setPrimaryColor(tenant?.config.primaryColor || identityConfig?.tenant_primary_color || "");
  }, [identityConfig, tenant]);

  useEffect(() => {
    if (!priceConfig) return;
    setRentalPrice(priceConfig.court_rental_price || "");
    setDayUsePrice(priceConfig.day_use_price || "");
  }, [priceConfig]);

  useEffect(() => {
    if (!whatsappConfig) return;
    setAdminGroupJid(whatsappConfig.admin_group_jid || "");
  }, [whatsappConfig]);

  useEffect(() => {
    if (!reservationConfig) return;
    setDepositPct(reservationConfig.reservation_deposit_percentage || "");
  }, [reservationConfig]);

  useEffect(() => {
    if (!subscriptions) return;
    setModuleStates(buildModuleState(subscriptions.activeModules));
  }, [subscriptions]);

  async function handleLogoUpload(file: File) {
    setLogoUploading(true);

    try {
      const extension = file.name.split(".").pop();
      const path = `logos/company-logo.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("landing-images")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("landing-images").getPublicUrl(path);
      setLogoUrl(`${data.publicUrl}?t=${Date.now()}`);
      toast.success("Logo enviada com sucesso.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao enviar a logo.";
      toast.error(message);
    } finally {
      setLogoUploading(false);
    }
  }

  const identityMutation = useMutation({
    mutationFn: async () => {
      const trimmedCompanyName = companyName.trim();
      const trimmedLogoUrl = logoUrl.trim();
      const trimmedAppUrl = appUrl.trim();
      const trimmedCompanyAddress = companyAddress.trim();
      const trimmedPrimaryColor = primaryColor.trim();

      const { error: configError } = await saveConfigs([
        { key: "company_name", value: trimmedCompanyName },
        { key: "company_logo_url", value: trimmedLogoUrl },
        { key: "app_url", value: trimmedAppUrl },
        { key: "company_address", value: trimmedCompanyAddress },
        { key: "tenant_primary_color", value: trimmedPrimaryColor },
      ]);
      if (configError) throw configError;

      if (!tenant?.id) return;

      const { error: tenantError } = await supabase
        .from("tenants")
        .update({ nome: trimmedCompanyName || tenant.nome })
        .eq("id", tenant.id);
      if (tenantError) throw tenantError;

      const { error: tenantSettingsError } = await supabase
        .from("tenant_settings")
        .upsert(
          {
            tenant_id: tenant.id,
            config: {
              nome_exibido: trimmedCompanyName,
              logo_url: trimmedLogoUrl,
              app_url: trimmedAppUrl,
              company_address: trimmedCompanyAddress,
              cor_primaria: trimmedPrimaryColor,
            },
          },
          { onConflict: "tenant_id" }
        );
      if (tenantSettingsError) throw tenantSettingsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-config"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-config"] });
      toast.success("Identidade do tenant salva.");
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar identidade.", { description: error.message });
    },
  });

  const modulesMutation = useMutation({
    mutationFn: async () => {
      const activeModules = MODULE_OPTIONS.filter((moduleOption) => moduleStates[moduleOption.id]).map(
        (moduleOption) => moduleOption.id
      );

      if (tenant?.id) {
        const { error } = await supabase.from("subscriptions").upsert(
          MODULE_OPTIONS.map((moduleOption) => ({
            tenant_id: tenant.id!,
            module: moduleOption.id,
            active: moduleStates[moduleOption.id] ?? false,
          })),
          { onConflict: "tenant_id,module" }
        );

        if (error) throw error;
        return;
      }

      const { error } = await saveConfigs([
        { key: "active_modules", value: JSON.stringify(activeModules) },
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-modules"] });
      toast.success("Modulos do tenant atualizados.");
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar modulos.", { description: error.message });
    },
  });

  const priceMutation = useMutation({
    mutationFn: async () => {
      const { error } = await saveConfigs([
        { key: "court_rental_price", value: rentalPrice },
        { key: "day_use_price", value: dayUsePrice },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-config"] });
      toast.success("Precos salvos.");
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar precos.", { description: error.message });
    },
  });

  const whatsappMutation = useMutation({
    mutationFn: async () => {
      const { error } = await saveConfigs([{ key: "admin_group_jid", value: adminGroupJid.trim() }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-config"] });
      toast.success("JID do grupo salvo.");
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar JID do grupo.", { description: error.message });
    },
  });

  const reservationMutation = useMutation({
    mutationFn: async () => {
      const { error } = await saveConfigs([
        { key: "reservation_deposit_percentage", value: depositPct },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-config"] });
      toast.success("Configuracao de reserva salva.");
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar configuracao de reserva.", { description: error.message });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-brand text-2xl font-bold">Configuracoes</h2>
        <p className="text-sm text-muted-foreground">
          Ajustes gerais do sistema e do tenant atual.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start gap-3">
          <Building2 className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">Tenant atual</CardTitle>
            <CardDescription>
              Resumo do tenant resolvido pelo dominio atual.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tenant-slug">Slug</Label>
              <Input
                id="tenant-slug"
                value={tenant?.slug || "legacy"}
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{tenant?.plano || "essencial"}</Badge>
                <Badge variant={tenant?.status === "ativo" ? "default" : "outline"}>
                  {tenant?.status || "ativo"}
                </Badge>
                <Badge variant="outline">{tenant?.id ? "tenant_settings ativo" : "modo legacy"}</Badge>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            As configuracoes visuais abaixo salvam em <code>tenant_settings</code> e tambem
            mantem <code>system_config</code> sincronizado para compatibilidade com o fluxo atual.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start gap-3">
          <Building2 className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">Identidade da empresa</CardTitle>
            <CardDescription>
              Nome, logo, cor primaria e URL usados nas telas e mensagens.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Nome exibido</Label>
            <Input
              id="company-name"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="FutVolei Arena"
              disabled={identityLoading || identityMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label>Logo da empresa</Label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-16 w-16 rounded-lg border bg-muted p-1 object-contain"
                />
              ) : null}
              <div className="flex flex-1 flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={logoUploading || identityLoading || identityMutation.isPending}
                  onClick={() => logoInputRef.current?.click()}
                  className="w-fit"
                >
                  {logoUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Fazer upload
                    </>
                  )}
                </Button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleLogoUpload(file);
                    event.target.value = "";
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  PNG, JPG ou SVG. A logo tambem pode ser usada como favicon.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenant-primary-color">Cor primaria</Label>
            <div className="flex gap-3">
              <Input
                id="tenant-primary-color"
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
                placeholder="#F97316"
                disabled={identityLoading || identityMutation.isPending}
              />
              <div
                className="h-10 w-10 rounded-md border"
                style={{ backgroundColor: primaryColor || "transparent" }}
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="app-url">URL do app</Label>
            <Input
              id="app-url"
              value={appUrl}
              onChange={(event) => setAppUrl(event.target.value)}
              placeholder="https://tenant.futnetpro.app"
              disabled={identityLoading || identityMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-address">Endereco</Label>
            <Input
              id="company-address"
              value={companyAddress}
              onChange={(event) => setCompanyAddress(event.target.value)}
              placeholder="Rua Exemplo, 123 - Bairro, Cidade/UF"
              disabled={identityLoading || identityMutation.isPending}
            />
          </div>

          <Button onClick={() => identityMutation.mutate()} disabled={identityMutation.isPending}>
            {identityMutation.isPending ? "Salvando..." : "Salvar identidade"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modulos ativos</CardTitle>
          <CardDescription>
            Controla quais areas do app ficam disponiveis para o tenant atual.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!tenant?.id ? (
            <p className="text-xs text-muted-foreground">
              Nenhum tenant foi resolvido via tabela nova. Enquanto isso, a configuracao continua
              sendo gravada em <code>system_config.active_modules</code>.
            </p>
          ) : null}

          <div className="space-y-3">
            {MODULE_OPTIONS.map((moduleOption) => (
              <div
                key={moduleOption.id}
                className="flex items-center justify-between gap-4 rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{moduleOption.label}</p>
                  <p className="text-xs text-muted-foreground">{moduleOption.description}</p>
                </div>
                <Switch
                  checked={moduleStates[moduleOption.id] ?? false}
                  onCheckedChange={(checked) =>
                    setModuleStates((currentState) => ({
                      ...currentState,
                      [moduleOption.id]: checked,
                    }))
                  }
                  disabled={subscriptionsLoading || modulesMutation.isPending}
                />
              </div>
            ))}
          </div>

          <Button onClick={() => modulesMutation.mutate()} disabled={modulesMutation.isPending}>
            {modulesMutation.isPending ? "Salvando..." : "Salvar modulos"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start gap-3">
          <DollarSign className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">Precos</CardTitle>
            <CardDescription>
              Valores usados nos agendamentos e no day use.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rental-price">Aluguel de quadra (R$ / hora)</Label>
              <Input
                id="rental-price"
                type="number"
                min={0}
                step={0.01}
                value={rentalPrice}
                onChange={(event) => setRentalPrice(event.target.value)}
                placeholder="150.00"
                disabled={priceLoading || priceMutation.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="day-use-price">Day use (R$)</Label>
              <Input
                id="day-use-price"
                type="number"
                min={0}
                step={0.01}
                value={dayUsePrice}
                onChange={(event) => setDayUsePrice(event.target.value)}
                placeholder="50.00"
                disabled={priceLoading || priceMutation.isPending}
              />
            </div>
          </div>

          <Button onClick={() => priceMutation.mutate()} disabled={priceMutation.isPending}>
            {priceMutation.isPending ? "Salvando..." : "Salvar precos"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start gap-3">
          <Percent className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">Reservas</CardTitle>
            <CardDescription>
              Percentual minimo cobrado via PIX para confirmar reserva.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deposit-pct">Percentual de deposito (%)</Label>
            <Input
              id="deposit-pct"
              type="number"
              min={0}
              max={100}
              step={1}
              value={depositPct}
              onChange={(event) => setDepositPct(event.target.value)}
              placeholder="30"
              disabled={reservationLoading || reservationMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Ex.: 30 = cobra 30% do valor total da reserva no PIX de confirmacao.
            </p>
          </div>

          <Button onClick={() => reservationMutation.mutate()} disabled={reservationMutation.isPending}>
            {reservationMutation.isPending ? "Salvando..." : "Salvar configuracao"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start gap-3">
          <div className="mt-0.5 flex h-5 w-5 items-center justify-center text-xs font-bold text-primary">
            WA
          </div>
          <div>
            <CardTitle className="text-base">Notificacoes WhatsApp</CardTitle>
            <CardDescription>
              Grupo que recebera alertas operacionais de novas reservas.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-group-jid">JID do grupo</Label>
            <Input
              id="admin-group-jid"
              value={adminGroupJid}
              onChange={(event) => setAdminGroupJid(event.target.value)}
              placeholder="120363430535428937@g.us"
              disabled={whatsappLoading || whatsappMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Formato <code>{"<id>@g.us"}</code>. Deixe vazio para desativar.
            </p>
          </div>

          <Button onClick={() => whatsappMutation.mutate()} disabled={whatsappMutation.isPending}>
            {whatsappMutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">Horario de funcionamento</CardTitle>
            <CardDescription>
              Continue ajustando os horarios detalhados pela tela de Landing Page.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2">
            {DAY_LABELS.map((label, index) => (
              <Badge key={label} variant={hours.open_days.includes(index) ? "default" : "outline"}>
                {label}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Aberto das <strong>{String(hours.open_hour).padStart(2, "0")}:00</strong> as{" "}
            <strong>{String(hours.close_hour).padStart(2, "0")}:00</strong>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
