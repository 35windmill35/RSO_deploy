import { URL_RSO } from "./urls";

export type RsoTabId = "overview" | "sales" | "staff";

export interface RsoNavItem {
  id: RsoTabId;
  to: string;
  // Корневой маршрут активен только при точном совпадении
  end: boolean;
}

export const RSO_NAV: readonly RsoNavItem[] = [
  { id: "overview", to: URL_RSO.overview, end: true },
  { id: "sales", to: URL_RSO.sales, end: false },
  { id: "staff", to: URL_RSO.staff, end: false },
];
