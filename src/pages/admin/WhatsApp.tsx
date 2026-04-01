import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle } from "lucide-react";
import WhatsAppTemplates from "@/components/admin/whatsapp/WhatsAppTemplates";
import WhatsAppSend from "@/components/admin/whatsapp/WhatsAppSend";
import WhatsAppHistory from "@/components/admin/whatsapp/WhatsAppHistory";
import WhatsAppSettings from "@/components/admin/whatsapp/WhatsAppSettings";
import WhatsAppSchedules from "@/components/admin/whatsapp/WhatsAppSchedules";

export default function WhatsApp() {
  const [activeTab, setActiveTab] = useState("send");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-brand flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-emerald-500" />
          WhatsApp
        </h2>
        <p className="text-sm text-muted-foreground">
          Gerencie templates, configurações e envios para seus alunos
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 max-w-3xl">
          <TabsTrigger value="send">Enviar</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="schedules">Agendamentos</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-6">
          <WhatsAppSend />
        </TabsContent>
        <TabsContent value="templates" className="mt-6">
          <WhatsAppTemplates />
        </TabsContent>
        <TabsContent value="schedules" className="mt-6">
          <WhatsAppSchedules />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <WhatsAppSettings />
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <WhatsAppHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
