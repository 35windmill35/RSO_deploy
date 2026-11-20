import type { Period } from "../api/contract";
import { childPeriods } from "../lib/periodKey";
import { periodsStore } from "./periodsStore";

// Посчитанные месяцы периода: заказ-наряды (DashboardRSOAccounts) отдаются только
// помесячно, поэтому срез по ЗН за квартал и год собирается из месяцев
export function availableMonths(period: Period): Period[] {
  if (period.type === "M") return [period];
  const quarters = period.type === "Y" ? childPeriods(period) : [period];
  const available = new Set(periodsStore.options("M").map((month) => month.key));
  return quarters.flatMap(childPeriods).filter((month) => available.has(month.key));
}
