import type { RouteObject } from "react-router-dom";
import { ProtectedRoute } from "@/core/auth/ProtectedRoute";
import { StudentLayout } from "@/core/layout";
import {
  StudentAttendanceHistory,
  StudentClasses,
  StudentHome,
  StudentInvoices,
  StudentPlanSelection,
  StudentProfile,
} from "./pages";

export const studentRoutes: RouteObject[] = [
  {
    path: "/aluno/escolher-plano",
    element: (
      <ProtectedRoute allowedRoles={["student"]}>
        <StudentPlanSelection />
      </ProtectedRoute>
    ),
  },
  {
    path: "/aluno",
    element: (
      <ProtectedRoute allowedRoles={["student"]}>
        <StudentLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <StudentHome /> },
      { path: "aulas", element: <StudentClasses /> },
      { path: "historico", element: <StudentAttendanceHistory /> },
      { path: "faturas", element: <StudentInvoices /> },
      { path: "perfil", element: <StudentProfile /> },
    ],
  },
];
