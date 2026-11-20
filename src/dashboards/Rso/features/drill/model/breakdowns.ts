import type {
  CapacityRow,
  DashboardRsoData,
  Period,
  SummaryRow,
  VatMode,
} from "@Rso/entities/rso/api/contract";
import { diff, finite, nettoFactor, pick, ratio } from "@Rso/entities/rso/lib/money";
import { summaryOf } from "@Rso/entities/rso/lib/summary";

// Разбивки уровня drill-down из ответа DashboardRSO за период — чистые функции.
// Пустые названия уже приведены к null в normalize — подставляет прочерк UI.

export interface DepartmentLine {
  id: number;
  name: string | null;
  turnover: number | null;
  accountCount: number | null;
  normHours: number | null;
  avgCheck: number | null;
  normHoursPerAccount: number | null;
  // Доля оборота отдела в обороте периода, %
  share: number | null;
}

// Отделы периода — группа turnoverAndIncome с ключом периода
export function departmentLines(
  data: DashboardRsoData | undefined,
  period: Period,
  vat: VatMode,
): DepartmentLine[] {
  const group = data?.turnoverAndIncome?.find((rows) => rows[0]?.PERIOD_KEY === period.key) ?? [];
  const total = group.reduce((sum, row) => sum + (pick(row, "TURNOVER_TOTAL", vat) ?? 0), 0);

  // Сумма по отделам должна совпадать с выручкой периода — расхождение видно разработчику
  if (import.meta.env.DEV && group.length > 0) {
    const revenue = pick(summaryOf(data, period), "REVENUE_TOTAL", vat);
    if (revenue !== null && Math.abs(revenue - total) > 1) {
      console.warn("[rso] department turnover does not match period revenue", {
        period,
        departments: total,
        revenue,
      });
    }
  }

  return group
    .map((row) => {
      const turnover = pick(row, "TURNOVER_TOTAL", vat);
      const accountCount = finite(row.ACCOUNT_COUNT);
      const normHours = finite(row.NORM_HOUR);
      const share = ratio(turnover, total);
      return {
        id: row.DEPARTMENT_ID,
        name: row.DEPARTMENT_NAME,
        turnover,
        accountCount,
        normHours,
        avgCheck: ratio(turnover, accountCount),
        normHoursPerAccount: ratio(normHours, accountCount),
        share: share === null ? null : share * 100,
      };
    })
    .sort((a, b) => (b.turnover ?? 0) - (a.turnover ?? 0));
}

// Загрузка ремзоны по компании (DEPARTMENT_ID = -1). Строки отдела вместо итога
// не подставляем: это были бы цифры одного отдела под видом компании
export function companyCapacity(data: DashboardRsoData | undefined): CapacityRow | undefined {
  return data?.capacity?.find((row) => row.DEPARTMENT_ID === -1);
}

export interface DiscountLine {
  key: string;
  department: string | null;
  segment: string | null;
  turnover: number | null;
  discount: number | null;
  discountPct: number | null;
}

// Скидки по отделам и сегментам клиентов. clientSegment приходит только с НДС —
// для «без НДС» суммы пересчитываются коэффициентом выручки периода (оценочно)
export function discountLines(
  data: DashboardRsoData | undefined,
  period: Period,
  vat: VatMode,
): DiscountLine[] {
  const factor = nettoFactor(summaryOf(data, period), vat);
  const scale = (value: number | null) => (value === null ? null : value * factor);
  return (data?.clientSegment ?? [])
    .filter((row) => !row.IS_TOTAL)
    .map((row, index) => ({
      key: `${row.DEPARTMENT_ID}-${row.IS_PRIMARY ? "p" : "r"}-${index}`,
      department: row.DEPARTMENT_NAME,
      segment: row.SEGMENT,
      turnover: scale(finite(row.TURNOVER_TOTAL_BRUTTO)),
      discount: scale(finite(row.DISCOUNT_TOTAL_BRUTTO)),
      discountPct: finite(row.DISCOUNT_AVG_PCT),
    }))
    .sort((a, b) => (b.turnover ?? 0) - (a.turnover ?? 0));
}

export interface SegmentLine {
  key: string;
  department: string | null;
  segment: string | null;
  isPrimary: boolean;
  accountCount: number | null;
  parts: number | null;
  work: number | null;
  turnover: number | null;
  avgCheck: number | null;
  normHoursPerAccount: number | null;
  partsToWorkPct: number | null;
}

// Сегменты клиентов по отделам (строки clientSegment без итогов).
// Суммы — с НДС; для «без НДС» пересчёт коэффициентом выручки периода (оценочно)
export function segmentLines(
  data: DashboardRsoData | undefined,
  period: Period,
  vat: VatMode,
): SegmentLine[] {
  const factor = nettoFactor(summaryOf(data, period), vat);
  const scale = (value: number | null) => (value === null ? null : value * factor);
  return (data?.clientSegment ?? [])
    .filter((row) => !row.IS_TOTAL)
    .map((row, index) => {
      const turnover = scale(finite(row.TURNOVER_TOTAL_BRUTTO));
      const accountCount = finite(row.ACCOUNT_COUNT);
      return {
        key: `${row.DEPARTMENT_ID}-${row.IS_PRIMARY ? "p" : "r"}-${index}`,
        department: row.DEPARTMENT_NAME,
        segment: row.SEGMENT,
        isPrimary: row.IS_PRIMARY,
        accountCount,
        parts: scale(finite(row.TURNOVER_PARTS_BRUTTO)),
        work: scale(finite(row.TURNOVER_WORK_BRUTTO)),
        turnover,
        avgCheck: ratio(turnover, accountCount),
        normHoursPerAccount: finite(row.AVG_NORM_HOUR_PER_ACCOUNT),
        partsToWorkPct: finite(row.PARTS_TO_WORK_RATIO_PCT),
      };
    })
    .sort((a, b) => (b.turnover ?? 0) - (a.turnover ?? 0));
}

export interface PlanLine {
  id: "money" | "gain" | "selling";
  plan: number | null;
  fact: number | null;
  pct: number | null;
  // Факт − план; null, если факта нет
  deviation: number | null;
}

// Все три плана периода. Планы и PLAN_*_FACT_PCT в API считаются с НДС, поэтому и факт
// берётся с НДС независимо от переключателя — иначе отклонение не сходится с процентом.
// Факт по «реализации» API не отдаёт
export function planLines(summary: SummaryRow | undefined): PlanLine[] {
  if (!summary) return [];
  const revenue = pick(summary, "REVENUE_TOTAL", "Brutto");
  const profit = pick(summary, "OPERATING_PROFIT", "Brutto");
  const line = (
    id: PlanLine["id"],
    plan: number | null,
    fact: number | null,
    pct: number | null,
  ): PlanLine => ({ id, plan, fact, pct, deviation: plan ? diff(fact, plan) : null });
  return [
    line("money", finite(summary.PLAN_MONEY), revenue, finite(summary.PLAN_MONEY_FACT_PCT)),
    line("gain", finite(summary.PLAN_GAIN), profit, finite(summary.PLAN_GAIN_FACT_PCT)),
    line("selling", finite(summary.PLAN_SELLING), null, null),
  ];
}

export interface ExpenseLine {
  key: string;
  // null — строка «Прочие расходы» (остаток до EXPENSE_TOTAL)
  category: string | null;
  article: string | null;
  department: string | null;
  amount: number | null;
}

// Статьи расходов периода. Если статьи не покрывают EXPENSE_TOTAL из summary,
// разница выводится отдельной строкой, чтобы сумма таблицы сходилась с карточкой
export function expenseLines(
  data: DashboardRsoData | undefined,
  period: Period,
  vat: VatMode,
): ExpenseLine[] {
  const lines: ExpenseLine[] = (data?.expenses ?? [])
    .map((row, index) => ({
      key: `${row.CATEGORY}-${row.ARTICLE_ID}-${row.DEPARTMENT_ID}-${index}`,
      category: row.CATEGORY,
      article: row.ARTICLE_NAME,
      department: row.DEPARTMENT_NAME,
      amount: pick(row, "AMOUNT", vat),
    }))
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
  const total = pick(summaryOf(data, period), "EXPENSE_TOTAL", vat);
  const listed = lines.reduce((sum, line) => sum + (line.amount ?? 0), 0);
  if (total !== null && total - listed >= 1) {
    lines.push({
      key: "other",
      category: null,
      article: null,
      department: null,
      amount: total - listed,
    });
  }
  return lines;
}
