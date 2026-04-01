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
import LandingPage from "./pages/LandingPage";

import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import Courts from "./pages/admin/Courts";
import Plans from "./pages/admin/Plans";
import Teachers from "./pages/admin/Teachers";
import Classes from "./pages/admin/Classes";
import Students from "./pages/admin/Students";
import TrialRequests from "./pages/admin/TrialRequests";

import StudentLayout from "./layouts/StudentLayout";
import StudentHome from "./pages/student/Home";
import StudentClasses from "./pages/student/Classes";
import StudentProfile from "./pages/student/Profile";
import StudentAttendanceHistory from "./pages/student/AttendanceHistory";

import TeacherLayout from "./layouts/TeacherLayout";
import TeacherHome from "./pages/teacher/Home";
import TeacherClasses from "./pages/teacher/Classes";
import TeacherAttendance from "./pages/teacher/Attendance";

import AdminAttendance from "./pages/admin/Attendance";
import AdminInvoices from "./pages/admin/Invoices";
import LandingPageEditor from "./pages/admin/LandingPageEditor";
import AdminBookings from "./pages/admin/Bookings";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminTeacherPayments from "./pages/admin/TeacherPayments";
import AdminSettings from "./pages/admin/Settings";
import AdminWhatsApp from "./pages/admin/WhatsApp";
import AdminPresentation from "./pages/admin/Presentation";
import AdminApiDocs from "./pages/admin/ApiDocs";
import AdminBookingUsers from "./pages/admin/BookingUsers";
import StudentInvoices from "./pages/student/Invoices";
import CourtBooking from "./pages/CourtBooking";

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
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/reservar" element={<CourtBooking />} />
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
              <Route path="aulas-teste" element={<TrialRequests />} />
              <Route path="presenca" element={<AdminAttendance />} />
              <Route path="faturas" element={<AdminInvoices />} />
              <Route path="landing-page" element={<LandingPageEditor />} />
              <Route path="agendamentos" element={<AdminBookings />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="pagamentos-professores" element={<AdminTeacherPayments />} />
              <Route path="configuracoes" element={<AdminSettings />} />
              <Route path="whatsapp" element={<AdminWhatsApp />} />
              <Route path="apresentacao" element={<AdminPresentation />} />
              <Route path="api-docs" element={<AdminApiDocs />} />
              <Route path="usuarios" element={<AdminBookingUsers />} />
            </Route>

            {/* Student routes */}
            <Route path="/aluno" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentLayout />
              </ProtectedRoute>
            }>
              <Route index element={<StudentHome />} />
              <Route path="aulas" element={<StudentClasses />} />
              <Route path="historico" element={<StudentAttendanceHistory />} />
              <Route path="faturas" element={<StudentInvoices />} />
              <Route path="perfil" element={<StudentProfile />} />
            </Route>

            {/* Teacher routes */}
            <Route path="/professor" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherLayout />
              </ProtectedRoute>
            }>
              <Route index element={<TeacherHome />} />
              <Route path="turmas" element={<TeacherClasses />} />
              <Route path="presenca" element={<TeacherAttendance />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
