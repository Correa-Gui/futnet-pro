import type { AppModule } from "@/modules/types";
import { teacherRoutes } from "./routes";

export const teacherModule: AppModule = {
  id: "teacher",
  routes: teacherRoutes,
};
