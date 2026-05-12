import { useRoutes } from "react-router-dom";
import { useSubscriptions } from "@/core/tenant";
import { adminModule } from "@/modules/admin";
import { publicModule } from "@/modules/public";
import { studentModule } from "@/modules/student";
import { teacherModule } from "@/modules/teacher";

const PUBLIC_MODULES = [publicModule];
const PROTECTED_MODULES = [adminModule, studentModule, teacherModule];

export function AppRouter() {
  const availableModuleIds = PROTECTED_MODULES.map((module) => module.id);
  const { data } = useSubscriptions(availableModuleIds);

  const enabledProtectedModules = PROTECTED_MODULES.filter((module) =>
    data?.activeModules.includes(module.id)
  );

  return useRoutes([...PUBLIC_MODULES, ...enabledProtectedModules].flatMap((module) => module.routes));
}
