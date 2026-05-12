import type { AppModule } from "@/modules/types";
import { publicRoutes } from "./routes";

export const publicModule: AppModule = {
  id: "public",
  routes: publicRoutes,
};
