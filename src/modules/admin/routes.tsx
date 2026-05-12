import type { RouteObject } from "react-router-dom";
import { ProtectedRoute } from "@/core/auth/ProtectedRoute";
import { AdminLayout } from "@/core/layout";
import {
  AdminAnalytics,
  AdminApiDocs,
  AdminAttendance,
  AdminBlockedDates,
  AdminBookings,
  AdminBookingsTable,
  AdminBookingUsers,
  AdminDashboard,
  AdminInvoices,
  AdminPresentation,
  AdminReports,
  AdminRoles,
  AdminSettings,
  AdminSystemUsers,
  AdminTeacherPayments,
  AdminWhatsApp,
  ChatbotIntents,
  Classes,
  Courts,
  LandingPageEditor,
  Plans,
  Students,
  Teachers,
  TrialRequests,
} from "./pages";

export const adminRoutes: RouteObject[] = [
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "quadras", element: <Courts /> },
      { path: "planos", element: <Plans /> },
      { path: "professores", element: <Teachers /> },
      { path: "turmas", element: <Classes /> },
      { path: "alunos", element: <Students /> },
      { path: "aulas-teste", element: <TrialRequests /> },
      { path: "presenca", element: <AdminAttendance /> },
      { path: "faturas", element: <AdminInvoices /> },
      { path: "landing-page", element: <LandingPageEditor /> },
      { path: "chatbot-intents", element: <ChatbotIntents /> },
      { path: "agendamentos", element: <AdminBookings /> },
      { path: "agendamentos-lista", element: <AdminBookingsTable /> },
      { path: "analytics", element: <AdminAnalytics /> },
      { path: "pagamentos-professores", element: <AdminTeacherPayments /> },
      { path: "configuracoes", element: <AdminSettings /> },
      { path: "whatsapp", element: <AdminWhatsApp /> },
      { path: "apresentacao", element: <AdminPresentation /> },
      { path: "api-docs", element: <AdminApiDocs /> },
      { path: "usuarios", element: <AdminBookingUsers /> },
      { path: "dias-bloqueados", element: <AdminBlockedDates /> },
      { path: "relatorios", element: <AdminReports /> },
      { path: "roles", element: <AdminRoles /> },
      { path: "system-users", element: <AdminSystemUsers /> },
    ],
  },
];
