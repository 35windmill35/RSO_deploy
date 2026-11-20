import type { DashboardRsoData, Period, SummaryRow } from "../api/contract";

// Строка summary за период из ответа DashboardRSO (summary — тренд на 12 периодов
// того же уровня, поэтому в нём есть и прошлый период, и дочерние у более позднего)
export function summaryOf(
  data: DashboardRsoData | undefined | null,
  period: Period,
): SummaryRow | undefined {
  return data?.summary?.find(
    (row) => row.PERIOD_TYPE === period.type && row.PERIOD_KEY === period.key,
  );
}
