import type { RouteObject } from "react-router-dom";
import {
  ChangePassword,
  CourtBooking,
  ForgotPassword,
  Index,
  LandingPage,
  Login,
  NotFound,
  Register,
  ResetPassword,
} from "./pages";

export const publicRoutes: RouteObject[] = [
  { path: "/login", element: <Login /> },
  { path: "/cadastro", element: <Register /> },
  { path: "/landing", element: <LandingPage /> },
  { path: "/reservar", element: <CourtBooking /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/change-password", element: <ChangePassword /> },
  { path: "/", element: <Index /> },
  { path: "*", element: <NotFound /> },
];
