import type { ComponentType } from "react";
import type { RsoTabId } from "@Rso/shared/config/navigation";
import { IconOverview, IconSales, IconStaff } from "./icons";

export const NAV_ICONS: Record<RsoTabId, ComponentType<{ size?: number }>> = {
  overview: IconOverview,
  sales: IconSales,
  staff: IconStaff,
};
