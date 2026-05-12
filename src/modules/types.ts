import type { RouteObject } from "react-router-dom";

export interface AppModule {
  id: string;
  routes: RouteObject[];
}
