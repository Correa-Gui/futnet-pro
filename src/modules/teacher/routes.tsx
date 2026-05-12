import type { RouteObject } from "react-router-dom";
import { ProtectedRoute } from "@/core/auth/ProtectedRoute";
import { TeacherLayout } from "@/core/layout";
import { TeacherAttendance, TeacherClasses, TeacherHome } from "./pages";

export const teacherRoutes: RouteObject[] = [
  {
    path: "/professor",
    element: (
      <ProtectedRoute allowedRoles={["teacher"]}>
        <TeacherLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <TeacherHome /> },
      { path: "turmas", element: <TeacherClasses /> },
      { path: "presenca", element: <TeacherAttendance /> },
    ],
  },
];
