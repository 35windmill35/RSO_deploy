import type { DashboardRsoData, Period } from "@Rso/entities/rso/api/contract";

// Общие пропсы разбивок: период узла и ответ DashboardRSO, в котором он лежит
export interface BreakdownProps {
  period: Period;
  data: DashboardRsoData | undefined;
}
