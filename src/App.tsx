import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import Courts from "./pages/admin/Courts";
import Plans from "./pages/admin/Plans";
import Teachers from "./pages/admin/Teachers";
import Classes from "./pages/admin/Classes";
import Students from "./pages/admin/Students";

import StudentLayout from "./layouts/StudentLayout";
import StudentHome from "./pages/student/Home";
import StudentClasses from "./pages/student/Classes";
import StudentAttendance from "./pages/student/Attendance";

import TeacherLayout from "./layouts/TeacherLayout";
import TeacherHome from "./pages/teacher/Home";
import TeacherClasses from "./pages/teacher/Classes";
import TeacherAttendance from "./pages/teacher/Attendance";

import AdminAttendance from "./pages/admin/Attendance";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Root - redirects by role */}
            <Route path="/" element={<Index />} />

            {/* Admin routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="quadras" element={<Courts />} />
              <Route path="planos" element={<Plans />} />
              <Route path="professores" element={<Teachers />} />
              <Route path="turmas" element={<Classes />} />
              <Route path="alunos" element={<Students />} />
              <Route path="presenca" element={<AdminAttendance />} />
            </Route>

            {/* Student routes */}
            <Route path="/aluno" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentLayout />
              </ProtectedRoute>
            }>
              <Route index element={<StudentHome />} />
              <Route path="aulas" element={<StudentClasses />} />
              <Route path="presenca" element={<StudentAttendance />} />
            </Route>

            {/* Teacher routes */}
            <Route path="/professor" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherLayout />
              </ProtectedRoute>
            }>
              <Route index element={<TeacherHome />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
