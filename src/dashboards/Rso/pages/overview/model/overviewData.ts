import type {
  ClientSegmentRow,
  DashboardRsoData,
  Period,
  SummaryRow,
  VatMode,
} from "@Rso/entities/rso/api/contract";
import { prevPeriod } from "@Rso/entities/rso/lib/periodKey";
import { METRICS, metricDelta, type MetricId } from "@Rso/entities/rso/lib/metrics";
import { deltaPct, finite, nettoFactor, pick, ratio } from "@Rso/entities/rso/lib/money";

// Расчёты «Обзора» из ответа DashboardRSO — чистые функции, без MobX и React

// KPI с дельтой к прошлому периоду и KPI выполнения плана (без дельты, §8.1)
export type DeltaKpiId = Exclude<MetricId, "planMoney" | "planGain" | "partsToWork" | "clients">;
export type PlanKpiId = "planMoney" | "planGain";

export const DELTA_KPI_IDS: readonly DeltaKpiId[] = [
  "revenue",
  "expense",
  "operatingProfit",
  "cashProfit",
  "accountCount",
  "normHours",
  "avgCheck",
  "discount",
];

export interface KpiValue {
  value: number | null;
  // Дельта к прошлому периоду в единице показателя; null — нет данных за прошлый период
  delta: number | null;
}

export interface PlanKpi {
  // Процент выполнения из API (PLAN_*_FACT_PCT)
  pct: number | null;
  plan: number | null;
}

export interface OverviewKpis {
  metrics: Record<DeltaKpiId, KpiValue>;
  plans: Record<PlanKpiId, PlanKpi>;
}

export interface TrendPoint {
  key: number;
  revenue: number | null;
  operatingProfit: number | null;
  isSelected: boolean;
}

export interface PlanFactRow {
  id: "money" | "gain";
  fact: number | null;
  plan: number | null;
  pct: number | null;
}

export interface StructureSlice {
  id: "parts" | "work" | "other";
  value: number;
}

export interface SegmentStats {
  accountCount: number;
  turnover: number;
  normHours: number;
  discount: number;
  avgCheck: number | null;
  avgNormHours: number | null;
  discountPct: number | null;
}

export interface SegmentsData {
  primary: SegmentStats;
  repeat: SegmentStats;
  // Доля первичных по числу заездов, 0…1
  primaryShare: number | null;
  primaryCountDelta: number | null;
  repeatCountDelta: number | null;
}

export interface OverviewData {
  kpis: OverviewKpis;
  trend: TrendPoint[];
  planFact: PlanFactRow[];
  planSelling: number | null;
  structure: StructureSlice[];
  segments: SegmentsData | null;
}

// KPI строятся из общего словаря METRICS — формулы те же, что в drill-down
function computeKpis(
  cur: SummaryRow | undefined,
  prev: SummaryRow | undefined,
  vat: VatMode,
): OverviewKpis {
  const value = (id: MetricId, row: SummaryRow | undefined) =>
    row ? METRICS[id].value(row, vat) : null;
  const metrics = Object.fromEntries(
    DELTA_KPI_IDS.map((id) => {
      const current = value(id, cur);
      return [
        id,
        { value: current, delta: metricDelta(METRICS[id], current, value(id, prev)) ?? null },
      ];
    }),
  ) as Record<DeltaKpiId, KpiValue>;
  const plan = (field: "PLAN_MONEY" | "PLAN_GAIN") => (cur ? finite(cur[field]) : null);
  return {
    metrics,
    plans: {
      planMoney: { pct: value("planMoney", cur), plan: plan("PLAN_MONEY") },
      planGain: { pct: value("planGain", cur), plan: plan("PLAN_GAIN") },
    },
  };
}

// Сегменты по компании = сумма строк отделов (итоговой строки по сегменту нет)
function sumSegment(rows: ClientSegmentRow[], isPrimary: boolean, vatFactor = 1): SegmentStats {
  const own = rows.filter((row) => !row.IS_TOTAL && row.IS_PRIMARY === isPrimary);
  const sum = (field: keyof ClientSegmentRow) =>
    own.reduce((acc, row) => acc + (finite(row[field]) ?? 0), 0);
  const accountCount = sum("ACCOUNT_COUNT");
  const turnover = sum("TURNOVER_TOTAL_BRUTTO") * vatFactor;
  const normHours = sum("NORM_HOUR_TOTAL");
  const discount = sum("DISCOUNT_TOTAL_BRUTTO") * vatFactor;
  return {
    accountCount,
    turnover,
    normHours,
    discount,
    avgCheck: ratio(turnover, accountCount),
    avgNormHours: ratio(normHours, accountCount),
    // Скидка к обороту без скидки
    discountPct: (() => {
      const share = ratio(discount, turnover + discount);
      return share === null ? null : share * 100;
    })(),
  };
}

// prev = null — прошлого периода нет в списке посчитанных, дельты не показываем
function computeSegments(
  cur: ClientSegmentRow[] | undefined,
  prev: ClientSegmentRow[] | null | undefined,
  vatFactor: number,
): SegmentsData | null {
  if (!cur || cur.length === 0) return null;
  const primary = sumSegment(cur, true, vatFactor);
  const repeat = sumSegment(cur, false, vatFactor);
  const total = primary.accountCount + repeat.accountCount;
  const prevPrimary = prev && prev.length > 0 ? sumSegment(prev, true) : null;
  const prevRepeat = prev && prev.length > 0 ? sumSegment(prev, false) : null;
  return {
    primary,
    repeat,
    primaryShare: total > 0 ? primary.accountCount / total : null,
    primaryCountDelta: deltaPct(primary.accountCount, prevPrimary?.accountCount ?? null),
    repeatCountDelta: deltaPct(repeat.accountCount, prevRepeat?.accountCount ?? null),
  };
}

// Структура оборота — из итоговой строки компании (DEPARTMENT_ID = -1)
function computeStructure(
  rows: ClientSegmentRow[] | undefined,
  vatFactor: number,
): StructureSlice[] {
  const company = rows?.find((row) => row.IS_TOTAL && row.DEPARTMENT_ID === -1);
  if (!company) return [];
  const parts = (finite(company.TURNOVER_PARTS_BRUTTO) ?? 0) * vatFactor;
  const work = (finite(company.TURNOVER_WORK_BRUTTO) ?? 0) * vatFactor;
  const total = (finite(company.TURNOVER_TOTAL_BRUTTO) ?? 0) * vatFactor;
  const other = Math.max(0, total - parts - work);
  const slices: StructureSlice[] = [
    { id: "parts", value: parts },
    { id: "work", value: work },
    { id: "other", value: other },
  ];
  return slices.filter((slice) => slice.value > 0);
}

// hasPrevPeriod — календарный прошлый период есть среди посчитанных: только тогда
// prevClientSegment относится к нему же, что и дельты KPI (R-07)
export function computeOverview(
  data: DashboardRsoData | null,
  period: Period | null,
  vat: VatMode,
  hasPrevPeriod: boolean,
): OverviewData | null {
  if (!data || !period) return null;

  const summary = (data.summary ?? []).filter((row) => row.PERIOD_TYPE === period.type);
  const cur = summary.find((row) => row.PERIOD_KEY === period.key);
  const prevKey = prevPeriod(period).key;
  const prev = summary.find((row) => row.PERIOD_KEY === prevKey);
  // clientSegment приходит только с НДС — для «без НДС» пересчёт оценочный
  const vatFactor = nettoFactor(cur, vat);

  const trend: TrendPoint[] = [...summary]
    .sort((a, b) => a.PERIOD_KEY - b.PERIOD_KEY)
    .map((row) => ({
      key: row.PERIOD_KEY,
      revenue: pick(row, "REVENUE_TOTAL", vat),
      operatingProfit: pick(row, "OPERATING_PROFIT", vat),
      isSelected: row.PERIOD_KEY === period.key,
    }));

  return {
    kpis: computeKpis(cur, prev, vat),
    trend,
    // Планы и PLAN_*_FACT_PCT в API — с НДС, поэтому и факт всегда с НДС (R-06)
    planFact: [
      {
        id: "money",
        fact: cur ? pick(cur, "REVENUE_TOTAL", "Brutto") : null,
        plan: cur ? finite(cur.PLAN_MONEY) : null,
        pct: cur ? finite(cur.PLAN_MONEY_FACT_PCT) : null,
      },
      {
        id: "gain",
        fact: cur ? pick(cur, "OPERATING_PROFIT", "Brutto") : null,
        plan: cur ? finite(cur.PLAN_GAIN) : null,
        pct: cur ? finite(cur.PLAN_GAIN_FACT_PCT) : null,
      },
    ],
    planSelling: cur ? finite(cur.PLAN_SELLING) : null,
    structure: computeStructure(data.clientSegment, vatFactor),
    segments: computeSegments(
      data.clientSegment,
      hasPrevPeriod ? data.prevClientSegment : null,
      vatFactor,
    ),
  };
}
