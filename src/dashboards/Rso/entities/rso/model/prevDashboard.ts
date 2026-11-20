import type { DashboardRsoData, Period } from "../api/contract";
import { prevPeriod } from "../lib/periodKey";
import { dashboardCache, prevPeriodKeyFor, type Resource } from "./dashboardCache";

// Ответ DashboardRSO за календарный прошлый период — для дельт разделов,
// у которых в ответе нет prev* (capacity, stock). Только если период посчитан.

export function hasPrevPeriod(period: Period): boolean {
  return prevPeriodKeyFor(period) !== period.key;
}

export function prevDashboardResource(
  dbIndex: number,
  period: Period,
): Resource<DashboardRsoData> | undefined {
  return hasPrevPeriod(period) ? dashboardCache.get(dbIndex, prevPeriod(period)) : undefined;
}

export function ensurePrevDashboard(dbIndex: number, period: Period): void {
  if (hasPrevPeriod(period)) dashboardCache.ensure(dbIndex, prevPeriod(period));
}
