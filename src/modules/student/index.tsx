import type { AppModule } from "@/modules/types";
import { studentRoutes } from "./routes";

export const studentModule: AppModule = {
  id: "student",
  routes: studentRoutes,
};
