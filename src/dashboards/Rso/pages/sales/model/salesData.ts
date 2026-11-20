import type { DashboardRsoData, Period, VatMode } from "@Rso/entities/rso/api/contract";
import { deltaPct, diff, finite, nettoFactor } from "@Rso/entities/rso/lib/money";
import { prevPeriod } from "@Rso/entities/rso/lib/periodKey";
import { capacityRow, capacityView, partsAndWork, stockTotals } from "@Rso/entities/rso/lib/sales";
import { summaryOf } from "@Rso/entities/rso/lib/summary";

// KPI вкладки «Продажи и виды услуг» — чистые функции, без MobX и React

export type SalesKpiId =
  | "partsTurnover"
  | "workTurnover"
  | "partsToWork"
  | "loadPct"
  | "soldHoursPct"
  | "stockEnd"
  | "stockTurnover"
  | "stockMarkup"
  | "stockProfit"
  | "itemsCount";

export interface SalesKpiValue {
  value: number | null;
  // Дельта к прошлому периоду в единице карточки; null — нет данных
  delta: number | null;
}

export interface SalesKpis {
  values: Record<SalesKpiId, SalesKpiValue>;
  // Подпись под «Продажей часов»: продано из доступного
  hours: { sold: number | null; available: number | null } | null;
}

// cur — ответ за выбранный период; prev — ответ за прошлый период (для ремзоны и
// склада, у которых в ответе нет prev*); hasPrevPeriod — прошлый период посчитан
export function computeSalesKpis(
  cur: DashboardRsoData | null,
  prev: DashboardRsoData | null,
  period: Period,
  vat: VatMode,
  hasPrevPeriod: boolean,
): SalesKpis | null {
  if (!cur) return null;
  const before = prevPeriod(period);

  // Запчасти и работы: clientSegment только с НДС — для «без НДС» пересчёт оценочный
  const pw = partsAndWork(cur.clientSegment, nettoFactor(summaryOf(cur, period), vat));
  const prevPw = hasPrevPeriod
    ? partsAndWork(cur.prevClientSegment, nettoFactor(summaryOf(cur, before), vat))
    : { parts: null, work: null };

  const ratioNow = finite(summaryOf(cur, period)?.PARTS_TO_WORK_RATIO_PCT);
  const ratioBefore = finite(summaryOf(cur, before)?.PARTS_TO_WORK_RATIO_PCT);

  const capacity = capacityView(capacityRow(cur, -1));
  const prevCapacity = capacityView(capacityRow(prev, -1));

  const stock = stockTotals(cur);
  const prevStock = stockTotals(prev);

  return {
    values: {
      partsTurnover: { value: pw.parts, delta: deltaPct(pw.parts, prevPw.parts) },
      workTurnover: { value: pw.work, delta: deltaPct(pw.work, prevPw.work) },
      partsToWork: { value: ratioNow, delta: diff(ratioNow, ratioBefore) },
      loadPct: {
        value: capacity?.loadPct ?? null,
        delta: diff(capacity?.loadPct ?? null, prevCapacity?.loadPct ?? null),
      },
      soldHoursPct: {
        value: capacity?.soldPct ?? null,
        delta: diff(capacity?.soldPct ?? null, prevCapacity?.soldPct ?? null),
      },
      stockEnd: {
        value: stock?.stockEnd ?? null,
        delta: deltaPct(stock?.stockEnd ?? null, prevStock?.stockEnd ?? null),
      },
      stockTurnover: {
        value: stock?.turnoverPct ?? null,
        delta: diff(stock?.turnoverPct ?? null, prevStock?.turnoverPct ?? null),
      },
      stockMarkup: {
        value: stock?.markupPct ?? null,
        delta: diff(stock?.markupPct ?? null, prevStock?.markupPct ?? null),
      },
      stockProfit: {
        value: stock?.profit ?? null,
        delta: deltaPct(stock?.profit ?? null, prevStock?.profit ?? null),
      },
      // Изменение номенклатуры за период — из API, в позициях
      itemsCount: { value: stock?.items ?? null, delta: stock?.itemsDelta ?? null },
    },
    hours: capacity ? { sold: capacity.sold, available: capacity.available } : null,
  };
}
