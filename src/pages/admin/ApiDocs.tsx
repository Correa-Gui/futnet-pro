import { useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  Copy,
  Layers3,
  Link2,
  MessageCircle,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  API_BASE_URLS,
  API_ENDPOINTS,
  API_SECTIONS,
  API_OVERVIEW_CARDS,
  getEndpointsByIds,
  matchesEndpointSearch,
  type ApiDocSection,
  type ApiEndpointDoc,
  type EndpointApplication,
  type EndpointAudience,
  type EndpointDomain,
  type EndpointLifecycle,
  type HttpMethod,
} from "@/data/apiDocs";

const methodColors: Record<HttpMethod, string> = {
  GET: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  POST: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  PATCH: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  DELETE: "bg-red-500/15 text-red-300 border-red-500/30",
};

const appBadgeColors: Record<EndpointApplication, string> = {
  FutPro: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  Chatbot: "border-primary/30 bg-primary/10 text-primary",
  Sistema: "border-violet-500/30 bg-violet-500/10 text-violet-300",
};

const audienceBadgeColors: Record<EndpointAudience, string> = {
  "Público": "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  "Interno": "border-slate-500/30 bg-slate-500/10 text-slate-300",
  Admin: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

const lifecycleBadgeColors: Record<EndpointLifecycle, string> = {
  Ativo: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  Legado: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  Novo: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  TODO: "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300",
  Stub: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

const domainBadgeColors: Record<EndpointDomain, string> = {
  Infra: "border-slate-500/30 bg-slate-500/10 text-slate-200",
  WhatsApp: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  "Sessão": "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
  "Usuário": "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  Reserva: "border-primary/30 bg-primary/10 text-primary",
  Quadra: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  Pagamento: "border-pink-500/30 bg-pink-500/10 text-pink-300",
  "Configuração": "border-violet-500/30 bg-violet-500/10 text-violet-300",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handle = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handle}>
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function EndpointBadge({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <Badge variant="outline" className={cn("gap-1 rounded-full px-2.5 py-1 text-[11px]", className)}>
      {children}
    </Badge>
  );
}

function MetadataRow({ endpoint }: { endpoint: ApiEndpointDoc }) {
  return (
    <div className="flex flex-wrap gap-2">
      <EndpointBadge className={appBadgeColors[endpoint.application]}>{endpoint.application}</EndpointBadge>
      <EndpointBadge className={domainBadgeColors[endpoint.domain]}>{endpoint.domain}</EndpointBadge>
      <EndpointBadge className={audienceBadgeColors[endpoint.audience]}>{endpoint.audience}</EndpointBadge>
      <EndpointBadge className={lifecycleBadgeColors[endpoint.lifecycle]}>{endpoint.lifecycle}</EndpointBadge>
      {endpoint.recommendedForNewFlow && (
        <EndpointBadge className="border-primary/30 bg-primary/10 text-primary">Caminho recomendado</EndpointBadge>
      )}
      {endpoint.writerOfficial && (
        <EndpointBadge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">Writer oficial</EndpointBadge>
      )}
      {endpoint.fallback && (
        <EndpointBadge className="border-amber-500/30 bg-amber-500/10 text-amber-300">Fallback</EndpointBadge>
      )}
      {endpoint.usedByChatbot && (
        <EndpointBadge className="border-sky-500/30 bg-sky-500/10 text-sky-300">Consumido pelo chatbot</EndpointBadge>
      )}
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: ApiEndpointDoc }) {
  const [open, setOpen] = useState(false);
  const [activeResponse, setActiveResponse] = useState(0);
  const baseUrl = API_BASE_URLS.find((item) => item.id === endpoint.baseUrlKey);

  const statusColor = (status: number) => {
    if (status < 300) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    if (status < 500) return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    return "bg-red-500/15 text-red-300 border-red-500/30";
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className="rounded-xl px-4 py-4 text-left transition-colors hover:bg-muted/40">
          <div className="flex items-start gap-3">
            <Badge
              variant="outline"
              className={cn("mt-0.5 w-14 shrink-0 justify-center font-mono text-xs", methodColors[endpoint.method])}
            >
              {endpoint.method}
            </Badge>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{endpoint.title}</p>
                  <code className="block truncate text-xs text-muted-foreground">{endpoint.path}</code>
                </div>
                <ChevronDown
                  className={cn(
                    "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    open && "rotate-180",
                  )}
                />
              </div>
              <MetadataRow endpoint={endpoint} />
            </div>
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="space-y-5 border-t border-border px-4 pb-6 pt-4">
          <p className="text-sm leading-relaxed text-muted-foreground">{endpoint.description}</p>

          <div className="grid gap-3 rounded-xl border border-border bg-muted/20 p-4 md:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Aplicação responsável</p>
              <p className="mt-1 text-sm font-medium text-foreground">{endpoint.application}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Autenticação</p>
              <p className="mt-1 text-sm font-medium text-foreground">{endpoint.authType}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Base URL</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">{baseUrl?.label}</span>
                {baseUrl && <CopyButton text={baseUrl.url} />}
              </div>
            </div>
          </div>

          {endpoint.notes && endpoint.notes.length > 0 && (
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="mb-2 text-sm font-semibold text-foreground">Observações operacionais</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                {endpoint.notes.map((note) => (
                  <p key={note}>• {note}</p>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">Headers</p>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Nome</th>
                    <th className="px-3 py-2 text-left font-medium">Obrigatório</th>
                    <th className="px-3 py-2 text-left font-medium">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {endpoint.headers.length === 0 ? (
                    <tr className="border-t border-border">
                      <td colSpan={3} className="px-3 py-3 text-xs text-muted-foreground">
                        Nenhum header obrigatório documentado.
                      </td>
                    </tr>
                  ) : (
                    endpoint.headers.map((header) => (
                      <tr key={header.name} className="border-t border-border">
                        <td className="px-3 py-2.5 font-mono text-xs text-primary">{header.name}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {header.required ? "Sim" : "Não"}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{header.description}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {endpoint.body && (
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Request body</p>
                <CopyButton text={endpoint.body} />
              </div>
              <div className="rounded-xl border border-border bg-muted/20">
                <pre className="overflow-x-auto p-4 text-xs text-muted-foreground">{endpoint.body}</pre>
              </div>
            </div>
          )}

          <div>
            <p className="mb-3 text-sm font-semibold text-foreground">Respostas</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {endpoint.responses.map((response, index) => (
                <button
                  key={`${endpoint.id}-response-${response.status}-${index}`}
                  onClick={() => setActiveResponse(index)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    activeResponse === index
                      ? statusColor(response.status)
                      : "border-border text-muted-foreground hover:border-muted-foreground",
                  )}
                >
                  <span className="font-mono">{response.status}</span> {response.label}
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-muted/20">
              <div className="flex items-center justify-end p-2">
                <CopyButton text={endpoint.responses[activeResponse]?.body ?? ""} />
              </div>
              <pre className="overflow-x-auto px-4 pb-4 text-xs text-muted-foreground">
                {endpoint.responses[activeResponse]?.body}
              </pre>
            </div>
          </div>

          {endpoint.curl && (
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">Exemplo cURL</p>
                <CopyButton text={endpoint.curl} />
              </div>
              <div className="rounded-xl border border-border bg-muted/20">
                <pre className="overflow-x-auto p-4 text-xs text-muted-foreground">{endpoint.curl}</pre>
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function DetailedSection({ section, query }: { section: ApiDocSection; query: string }) {
  const groups = section.groups
    .map((group) => ({
      ...group,
      endpoints: getEndpointsByIds(group.endpointIds).filter((endpoint) => matchesEndpointSearch(endpoint, query)),
    }))
    .filter((group) => group.endpoints.length > 0);

  if (groups.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold text-foreground">{section.title}</h3>
        <p className="text-sm text-muted-foreground">{section.description}</p>
      </div>

      <Accordion type="multiple" className="rounded-2xl border border-border bg-background px-4">
        {groups.map((group) => (
          <AccordionItem value={group.id} key={group.id}>
            <AccordionTrigger className="py-5 hover:no-underline">
              <div className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-foreground">{group.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{group.description}</p>
                </div>
                <Badge variant="outline" className="shrink-0 border-border text-xs text-muted-foreground">
                  {group.endpoints.length} endpoint{group.endpoints.length > 1 ? "s" : ""}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              <div className="divide-y divide-border rounded-xl border border-border">
                {group.endpoints.map((endpoint) => (
                  <EndpointCard key={endpoint.id} endpoint={endpoint} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function ReferenceSection({ section, query }: { section: ApiDocSection; query: string }) {
  const groups = section.groups
    .map((group) => ({
      ...group,
      endpoints: getEndpointsByIds(group.endpointIds).filter((endpoint) => matchesEndpointSearch(endpoint, query)),
    }))
    .filter((group) => group.endpoints.length > 0);

  if (groups.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-xl font-semibold text-foreground">{section.title}</h3>
        <p className="text-sm text-muted-foreground">{section.description}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((group) => (
          <div key={group.id} className="rounded-2xl border border-border bg-background p-5">
            <div className="space-y-1">
              <p className="text-base font-semibold text-foreground">{group.title}</p>
              <p className="text-sm text-muted-foreground">{group.description}</p>
            </div>

            <div className="mt-4 space-y-3">
              {group.endpoints.map((endpoint) => (
                <div key={endpoint.id} className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-start gap-3">
                    <Badge
                      variant="outline"
                      className={cn("mt-0.5 w-14 shrink-0 justify-center font-mono text-xs", methodColors[endpoint.method])}
                    >
                      {endpoint.method}
                    </Badge>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{endpoint.title}</p>
                        <code className="block break-all text-xs text-muted-foreground">{endpoint.path}</code>
                      </div>
                      <MetadataRow endpoint={endpoint} />
                      <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                      {endpoint.notes && endpoint.notes.length > 0 && (
                        <div className="space-y-1 text-xs text-muted-foreground">
                          {endpoint.notes.slice(0, 2).map((note) => (
                            <p key={note}>• {note}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ApiDocs() {
  const [query, setQuery] = useState("");

  const filteredCount = useMemo(
    () => API_ENDPOINTS.filter((endpoint) => matchesEndpointSearch(endpoint, query)).length,
    [query],
  );

  return (
    <div className="max-w-7xl space-y-10">
      <section className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h2 className="text-3xl font-bold font-brand text-foreground">API Docs</h2>
          </div>
          <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">
            Documentação operacional do ecossistema FutPro + Chatbot + Evolution, organizada por aplicação,
            responsabilidade e ciclo de vida. Aqui fica claro o que é negócio, o que é orquestração e o que é infraestrutura do canal.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-2xl border border-border bg-background p-5">
            <div className="flex items-center gap-2 text-foreground">
              <Layers3 className="h-4 w-4 text-primary" />
              <p className="font-semibold">Visão Geral do Ecossistema</p>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {API_OVERVIEW_CARDS.map((card, index) => {
                const icons = [Server, Bot, MessageCircle];
                const Icon = icons[index] ?? Server;
                return (
                  <div key={card.id} className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{card.title}</p>
                        <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {card.bullets.map((bullet) => (
                        <p key={bullet}>• {bullet}</p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center gap-2 text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="font-semibold">Caminho recomendado do fluxo novo</p>
            </div>
            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
              <p>1. WhatsApp / Evolution envia o webhook.</p>
              <p>2. Chatbot / FastAPI interpreta a conversa e mantém sessão.</p>
              <p>3. FutPro responde disponibilidade, usuários e reserva.</p>
              <p>4. Chatbot decide a resposta e usa a Evolution para entregar no canal.</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <EndpointBadge className="border-primary/30 bg-primary/10 text-primary">Novo fluxo</EndpointBadge>
              <EndpointBadge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">Ativo hoje</EndpointBadge>
              <EndpointBadge className="border-slate-500/30 bg-slate-500/10 text-slate-300">Sem duplicação</EndpointBadge>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-foreground">Base URL e Convenções</h3>
          <p className="text-sm text-muted-foreground">
            Endereços-base e convenções de autenticação mais usados na operação do ecossistema.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {API_BASE_URLS.map((item) => (
            <div key={item.id} className="rounded-2xl border border-border bg-background p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-foreground">{item.label}</p>
                <CopyButton text={item.url} />
              </div>
              <code className="mt-3 block break-all rounded-lg bg-muted/30 px-3 py-2 text-xs text-foreground">
                {item.url}
              </code>
              <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-background p-5">
          <div className="flex items-center gap-2 text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p className="font-semibold">Semântica visual usada nesta página</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <EndpointBadge className={appBadgeColors.FutPro}>FutPro</EndpointBadge>
            <EndpointBadge className={appBadgeColors.Chatbot}>Chatbot</EndpointBadge>
            <EndpointBadge className={appBadgeColors.Sistema}>Sistema</EndpointBadge>
            <EndpointBadge className={audienceBadgeColors["Público"]}>Público</EndpointBadge>
            <EndpointBadge className={audienceBadgeColors.Interno}>Interno</EndpointBadge>
            <EndpointBadge className={audienceBadgeColors.Admin}>Admin</EndpointBadge>
            <EndpointBadge className={lifecycleBadgeColors.Ativo}>Ativo</EndpointBadge>
            <EndpointBadge className={lifecycleBadgeColors.Legado}>Legado</EndpointBadge>
            <EndpointBadge className={lifecycleBadgeColors.Novo}>Novo</EndpointBadge>
            <EndpointBadge className={lifecycleBadgeColors.TODO}>TODO</EndpointBadge>
            <EndpointBadge className={lifecycleBadgeColors.Stub}>Stub</EndpointBadge>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-foreground">Busca rápida</h3>
          <p className="text-sm text-muted-foreground">
            Procure por rota, método, aplicativo, domínio ou observação operacional.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex.: booking-user, webhook, Evolution, legado, PIX..."
              className="pl-9"
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {filteredCount} endpoint{filteredCount !== 1 ? "s" : ""} correspondente{filteredCount !== 1 ? "s" : ""}.
          </p>
        </div>
      </section>

      {API_SECTIONS.map((section) =>
        section.kind === "detailed" ? (
          <DetailedSection key={section.id} section={section} query={query} />
        ) : (
          <ReferenceSection key={section.id} section={section} query={query} />
        ),
      )}

      {filteredCount === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/40 text-muted-foreground">
            <Link2 className="h-5 w-5" />
          </div>
          <p className="mt-4 text-base font-semibold text-foreground">Nenhum endpoint encontrado</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Tente buscar por outro termo, como o nome da rota, da aplicação ou do domínio funcional.
          </p>
        </div>
      )}
    </div>
  );
}
