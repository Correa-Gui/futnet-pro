import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Phone, Calendar } from "lucide-react";

type BookingUser = {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  booking_count: number;
};

export default function BookingUsers() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["booking-users"],
    queryFn: async () => {
      // Busca usuários e conta reservas por telefone
      const { data: bookingUsers, error } = await supabase
        .from("booking_users" as any)
        .select("id, name, phone, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Busca contagem de reservas por telefone
      const { data: bookings } = await supabase
        .from("court_bookings")
        .select("requester_phone")
        .neq("status", "cancelled");

      const countMap: Record<string, number> = {};
      for (const b of bookings ?? []) {
        const phone = String(b.requester_phone).replace(/\D/g, "");
        countMap[phone] = (countMap[phone] ?? 0) + 1;
      }

      return (bookingUsers ?? []).map((u: any) => ({
        ...u,
        booking_count: countMap[String(u.phone).replace(/\D/g, "")] ?? 0,
      })) as BookingUser[];
    },
  });

  const stats = {
    total: users.length,
    withMultipleBookings: users.filter((u) => u.booking_count > 1).length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-brand">Usuários</h2>
        <p className="text-sm text-muted-foreground">
          Pessoas que realizaram reservas de quadra via chatbot
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 max-w-xs">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Calendar className="h-5 w-5 text-success" />
            <div>
              <p className="text-xl font-bold">{stats.withMultipleBookings}</p>
              <p className="text-xs text-muted-foreground">Recorrentes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Lista de Usuários</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-12 text-sm">
              Carregando...
            </p>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-12 text-sm">
              Nenhum usuário encontrado. Os usuários aparecem após a primeira reserva via chatbot.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> Telefone
                    </span>
                  </TableHead>
                  <TableHead className="text-center">Reservas</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {user.phone}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={user.booking_count > 1 ? "default" : "outline"}
                        className="tabular-nums"
                      >
                        {user.booking_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
