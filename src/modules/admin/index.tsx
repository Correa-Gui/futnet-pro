import type { AppModule } from "@/modules/types";
import { adminRoutes } from "./routes";

export const adminModule: AppModule = {
  id: "admin",
  routes: adminRoutes,
};

export { ADMIN_MENU_GROUPS, getAdminMenuGroups, getAdminPageTitle } from "./menu";
