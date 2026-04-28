import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building2, DollarSign, Percent, Clock, Upload, Loader2 } from 'lucide-react';
import { useBusinessHours, type BusinessHours, DEFAULT_BUSINESS_HOURS } from '@/hooks/useBusinessHours';
import { toast } from 'sonner';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

type ConfigRow = { key: string; value: string };

function useSystemConfig(keys: string[]) {
  return useQuery({
    queryKey: ['system-config', ...keys],
    queryFn: async () => {
      const { data } = await supabase
        .from('system_config')
        .select('key, value')
        .in('key', keys);
      return Object.fromEntries((data || []).map((r: ConfigRow) => [r.key, r.value]));
    },
    staleTime: 5 * 60 * 1000,
  });
}

function saveConfigs(entries: { key: string; value: string }[]) {
  return supabase.from('system_config').upsert(entries, { onConflict: 'key' });
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: bh } = useBusinessHours();
  const hours: BusinessHours = bh || DEFAULT_BUSINESS_HOURS;

  // --- Identity ---
  const { data: identityConfig, isLoading: identityLoading } = useSystemConfig([
    'company_name', 'company_logo_url', 'app_url', 'company_address',
  ]);
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [appUrl, setAppUrl] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoUpload(file: File) {
    setLogoUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `logos/company-logo.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('landing-images')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('landing-images').getPublicUrl(path);
      setLogoUrl(`${data.publicUrl}?t=${Date.now()}`);
      toast.success('Logo enviado com sucesso');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar logo');
    } finally {
      setLogoUploading(false);
    }
  }

  useEffect(() => {
    if (!identityConfig) return;
    setCompanyName(identityConfig.company_name || '');
    setLogoUrl(identityConfig.company_logo_url || '');
    setAppUrl(identityConfig.app_url || '');
    setCompanyAddress(identityConfig.company_address || '');
  }, [identityConfig]);

  const identityMutation = useMutation({
    mutationFn: async () => {
      const { error } = await saveConfigs([
        { key: 'company_name', value: companyName.trim() },
        { key: 'company_logo_url', value: logoUrl.trim() },
        { key: 'app_url', value: appUrl.trim() },
        { key: 'company_address', value: companyAddress.trim() },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Identidade da empresa salva.');
    },
    onError: (e: Error) => toast.error('Erro ao salvar', { description: e.message }),
  });

  // --- Prices ---
  const { data: priceConfig, isLoading: priceLoading } = useSystemConfig([
    'court_rental_price', 'day_use_price',
  ]);
  const [rentalPrice, setRentalPrice] = useState('');
  const [dayUsePrice, setDayUsePrice] = useState('');

  useEffect(() => {
    if (!priceConfig) return;
    setRentalPrice(priceConfig.court_rental_price || '');
    setDayUsePrice(priceConfig.day_use_price || '');
  }, [priceConfig]);

  const priceMutation = useMutation({
    mutationFn: async () => {
      const { error } = await saveConfigs([
        { key: 'court_rental_price', value: rentalPrice },
        { key: 'day_use_price', value: dayUsePrice },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Preços salvos.');
    },
    onError: (e: Error) => toast.error('Erro ao salvar', { description: e.message }),
  });

  // --- WhatsApp grupo de admins ---
  const { data: waConfig, isLoading: waLoading } = useSystemConfig(['admin_group_jid']);
  const [adminGroupJid, setAdminGroupJid] = useState('');

  useEffect(() => {
    if (!waConfig) return;
    setAdminGroupJid(waConfig.admin_group_jid || '');
  }, [waConfig]);

  const waMutation = useMutation({
    mutationFn: async () => {
      const { error } = await saveConfigs([
        { key: 'admin_group_jid', value: adminGroupJid.trim() },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('JID do grupo salvo.');
    },
    onError: (e: Error) => toast.error('Erro ao salvar', { description: e.message }),
  });

  // --- Reservation ---
  const { data: reservationConfig, isLoading: reservationLoading } = useSystemConfig([
    'reservation_deposit_percentage',
  ]);
  const [depositPct, setDepositPct] = useState('');

  useEffect(() => {
    if (!reservationConfig) return;
    setDepositPct(reservationConfig.reservation_deposit_percentage || '');
  }, [reservationConfig]);

  const reservationMutation = useMutation({
    mutationFn: async () => {
      const { error } = await saveConfigs([
        { key: 'reservation_deposit_percentage', value: depositPct },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-config'] });
      toast.success('Configuração de reserva salva.');
    },
    onError: (e: Error) => toast.error('Erro ao salvar', { description: e.message }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-brand">Configurações</h2>
        <p className="text-sm text-muted-foreground">Configurações gerais do sistema</p>
      </div>

      {/* Identity */}
      <Card>
        <CardHeader className="flex flex-row items-start gap-3">
          <Building2 className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">Identidade da Empresa</CardTitle>
            <CardDescription>Nome, logo e URL do app usados em mensagens e telas</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Nome da empresa</Label>
            <Input
              id="company-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="FutVôlei Arena"
              disabled={identityLoading || identityMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label>Logo da empresa</Label>
            <div className="flex items-center gap-4">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-16 w-16 rounded-lg border object-contain bg-muted p-1"
                />
              )}
              <div className="flex flex-col gap-2 flex-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={logoUploading || identityLoading || identityMutation.isPending}
                  onClick={() => logoInputRef.current?.click()}
                  className="w-fit"
                >
                  {logoUploading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                  ) : (
                    <><Upload className="mr-2 h-4 w-4" /> Fazer upload</>
                  )}
                </Button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                    e.target.value = '';
                  }}
                />
                <p className="text-xs text-muted-foreground">PNG, JPG ou SVG. Será usado como favicon e logo.</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="app-url">URL do app (usado nos links do WhatsApp)</Label>
            <Input
              id="app-url"
              value={appUrl}
              onChange={(e) => setAppUrl(e.target.value)}
              placeholder="https://futnetpro.app"
              disabled={identityLoading || identityMutation.isPending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-address">Endereço (usado nas mensagens de confirmação)</Label>
            <Input
              id="company-address"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              placeholder="Rua Exemplo, 123 — Bairro, Cidade/UF"
              disabled={identityLoading || identityMutation.isPending}
            />
          </div>
          <Button onClick={() => identityMutation.mutate()} disabled={identityMutation.isPending}>
            {identityMutation.isPending ? 'Salvando...' : 'Salvar identidade'}
          </Button>
        </CardContent>
      </Card>

      {/* Prices */}
      <Card>
        <CardHeader className="flex flex-row items-start gap-3">
          <DollarSign className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">Preços</CardTitle>
            <CardDescription>Valores usados nos agendamentos e day use</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rental-price">Aluguel de quadra (R$ / hora)</Label>
              <Input
                id="rental-price"
                type="number"
                min={0}
                step={0.01}
                value={rentalPrice}
                onChange={(e) => setRentalPrice(e.target.value)}
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
                onChange={(e) => setDayUsePrice(e.target.value)}
                placeholder="50.00"
                disabled={priceLoading || priceMutation.isPending}
              />
            </div>
          </div>
          <Button onClick={() => priceMutation.mutate()} disabled={priceMutation.isPending}>
            {priceMutation.isPending ? 'Salvando...' : 'Salvar preços'}
          </Button>
        </CardContent>
      </Card>

      {/* Reservation */}
      <Card>
        <CardHeader className="flex flex-row items-start gap-3">
          <Percent className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">Reservas</CardTitle>
            <CardDescription>Percentual mínimo cobrado via PIX para confirmar reserva</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="deposit-pct">Percentual de depósito (%)</Label>
            <Input
              id="deposit-pct"
              type="number"
              min={0}
              max={100}
              step={1}
              value={depositPct}
              onChange={(e) => setDepositPct(e.target.value)}
              placeholder="30"
              disabled={reservationLoading || reservationMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Ex: 30 = cobra 30% do valor total da reserva no PIX de confirmação.
            </p>
          </div>
          <Button onClick={() => reservationMutation.mutate()} disabled={reservationMutation.isPending}>
            {reservationMutation.isPending ? 'Salvando...' : 'Salvar configuração'}
          </Button>
        </CardContent>
      </Card>

      {/* WhatsApp grupo admins */}
      <Card>
        <CardHeader className="flex flex-row items-start gap-3">
          <div className="mt-0.5 h-5 w-5 flex items-center justify-center text-primary font-bold text-xs">WA</div>
          <div>
            <CardTitle className="text-base">Notificações WhatsApp (Grupo)</CardTitle>
            <CardDescription>JID do grupo que receberá alertas de novas reservas</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-group-jid">JID do grupo</Label>
            <Input
              id="admin-group-jid"
              value={adminGroupJid}
              onChange={(e) => setAdminGroupJid(e.target.value)}
              placeholder="120363430535428937@g.us"
              disabled={waLoading || waMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">
              Formato: <code>{'<id>@g.us'}</code>. Deixe em branco para desativar.
            </p>
          </div>
          <Button onClick={() => waMutation.mutate()} disabled={waMutation.isPending}>
            {waMutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">Horário de Funcionamento</CardTitle>
            <CardDescription>
              Configure na aba <strong>Landing Page</strong> do menu lateral
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-3">
            {DAY_LABELS.map((label, i) => (
              <Badge key={i} variant={hours.open_days.includes(i) ? 'default' : 'outline'}>
                {label}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Aberto das <strong>{String(hours.open_hour).padStart(2, '0')}:00</strong> às{' '}
            <strong>{String(hours.close_hour).padStart(2, '0')}:00</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
