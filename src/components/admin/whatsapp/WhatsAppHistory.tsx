import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Message {
  id: string;
  recipient_phone: string;
  recipient_name: string | null;
  message_body: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

const statusIcon: Record<string, JSX.Element> = {
  sent: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  failed: <XCircle className="h-4 w-4 text-destructive" />,
  pending: <Clock className="h-4 w-4 text-amber-500" />,
};

const statusLabel: Record<string, string> = {
  sent: "Enviada",
  failed: "Falhou",
  pending: "Pendente",
};

export default function WhatsAppHistory() {
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["whatsapp-history"],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_messages" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return (data || []) as unknown as Message[];
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;

  if (messages.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <History className="mx-auto h-10 w-10 mb-3 opacity-40" />
          Nenhuma mensagem enviada ainda.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <Card key={m.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {statusIcon[m.status] || statusIcon.pending}
                  <span className="font-medium text-sm">{m.recipient_name || m.recipient_phone}</span>
                  <Badge variant={m.status === "sent" ? "default" : "destructive"} className="text-xs">
                    {statusLabel[m.status] || m.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{m.recipient_phone}</p>
                <p className="text-sm bg-muted rounded-lg p-2 whitespace-pre-wrap">{m.message_body}</p>
                {m.error_message && (
                  <p className="text-xs text-destructive mt-1">Erro: {m.error_message}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(m.sent_at || m.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
