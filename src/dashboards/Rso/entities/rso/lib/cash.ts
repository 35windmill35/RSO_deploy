import type { DashboardRsoData, Period, VatMode } from "../api/contract";
import { diff, pick } from "./money";

// Касса по строкам summary: приход, расход, прибыль по кассе. Общая для панели
// детализации (таблица от новых к старым) и графика вкладки «Персонал и финансы»

export interface CashLine {
  period: Period;
  cashIn: number | null;
  cashOut: number | null;
  cashProfit: number | null;
}

// Касса за 12 периодов уровня (тренд summary), от новых к старым
export function cashLines(
  data: DashboardRsoData | undefined,
  period: Period,
  vat: VatMode,
): CashLine[] {
  return (data?.summary ?? [])
    .filter((row) => row.PERIOD_TYPE === period.type)
    .sort((a, b) => b.PERIOD_KEY - a.PERIOD_KEY)
    .map((row) => {
      const cashIn = pick(row, "CASH_IN_TOTAL", vat);
      const cashOut = pick(row, "CASH_OUT_TOTAL", vat);
      return {
        period: { type: period.type, key: row.PERIOD_KEY },
        cashIn,
        cashOut,
        cashProfit: diff(cashIn, cashOut),
      };
    });
}
