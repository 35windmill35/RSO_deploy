import type { SummaryRow, VatMode } from "../api/contract";
import { deltaPct, diff, finite, pick, ratio } from "./money";
import { formatHours, formatMoney, formatNumber, formatPct } from "@Rso/shared/lib/format";

// Словарь показателей дашборда: формула из строки DashboardRSO.summary, формат,
// направление «лучше» и единица дельты. Единый источник для KPI «Обзора» и drill-down.

export type MetricId =
  | "revenue"
  | "expense"
  | "operatingProfit"
  | "cashProfit"
  | "planMoney"
  | "accountCount"
  | "normHours"
  | "avgCheck"
  | "discount"
  | "planGain"
  // Открываются с графиков «Обзора»
  | "partsToWork"
  | "clients";

export interface Metric {
  id: MetricId;
  format: (value: number | null) => string;
  // null — нейтральный показатель: дельта без оценки «лучше / хуже»
  higherIsBetter: boolean | null;
  // pct — относительная дельта, pp — в процентных пунктах, none — без дельты (планы)
  deltaUnit: "pct" | "pp" | "none";
  // Значение показателя за период из строки DashboardRSO.summary
  value: (row: SummaryRow, vat: VatMode) => number | null;
  // Показатель считается из заказ-нарядов — доступен спуск до дня и списка ЗН
  accounts: boolean;
  // Сопутствующие показатели в шапке панели
  related: MetricId[];
}

const money =
  (base: "REVENUE_TOTAL" | "EXPENSE_TOTAL" | "OPERATING_PROFIT") =>
  (row: SummaryRow, vat: VatMode) =>
    pick(row, base, vat);

const plain = (field: keyof SummaryRow) => (row: SummaryRow) => finite(row[field]);

export const METRICS: Record<MetricId, Metric> = {
  // Структура выручки: запчасти к работам
  partsToWork: {
    id: "partsToWork",
    format: formatPct,
    higherIsBetter: null,
    deltaUnit: "pp",
    value: plain("PARTS_TO_WORK_RATIO_PCT"),
    accounts: false,
    related: ["revenue"],
  },
  // Новые и повторные клиенты: заезды по сегментам
  clients: {
    id: "clients",
    format: formatNumber,
    higherIsBetter: true,
    deltaUnit: "pct",
    value: plain("ACCOUNT_COUNT_TOTAL"),
    accounts: false,
    related: ["revenue", "avgCheck"],
  },
  revenue: {
    id: "revenue",
    format: formatMoney,
    higherIsBetter: true,
    deltaUnit: "pct",
    value: money("REVENUE_TOTAL"),
    accounts: true,
    related: ["accountCount", "avgCheck"],
  },
  accountCount: {
    id: "accountCount",
    format: formatNumber,
    higherIsBetter: true,
    deltaUnit: "pct",
    value: plain("ACCOUNT_COUNT_TOTAL"),
    accounts: true,
    related: ["revenue", "avgCheck"],
  },
  avgCheck: {
    id: "avgCheck",
    format: formatMoney,
    higherIsBetter: true,
    deltaUnit: "pct",
    value: (row, vat) => ratio(pick(row, "REVENUE_TOTAL", vat), finite(row.ACCOUNT_COUNT_TOTAL)),
    accounts: true,
    related: ["revenue", "accountCount"],
  },
  expense: {
    id: "expense",
    format: formatMoney,
    higherIsBetter: false,
    deltaUnit: "pct",
    value: money("EXPENSE_TOTAL"),
    accounts: false,
    related: ["revenue", "operatingProfit"],
  },
  operatingProfit: {
    id: "operatingProfit",
    format: formatMoney,
    higherIsBetter: true,
    deltaUnit: "pct",
    value: money("OPERATING_PROFIT"),
    accounts: false,
    related: ["revenue", "expense"],
  },
  cashProfit: {
    id: "cashProfit",
    format: formatMoney,
    higherIsBetter: true,
    deltaUnit: "pct",
    value: (row, vat) => diff(pick(row, "CASH_IN_TOTAL", vat), pick(row, "CASH_OUT_TOTAL", vat)),
    accounts: false,
    related: ["revenue"],
  },
  normHours: {
    id: "normHours",
    format: formatHours,
    higherIsBetter: true,
    deltaUnit: "pct",
    value: plain("NORM_HOUR_TOTAL"),
    accounts: false,
    related: ["accountCount"],
  },
  discount: {
    id: "discount",
    format: formatPct,
    higherIsBetter: false,
    deltaUnit: "pp",
    value: plain("DISCOUNT_AVG_PCT"),
    accounts: false,
    related: ["revenue"],
  },
  planMoney: {
    id: "planMoney",
    format: formatPct,
    higherIsBetter: true,
    deltaUnit: "none",
    value: plain("PLAN_MONEY_FACT_PCT"),
    accounts: false,
    related: ["revenue"],
  },
  planGain: {
    id: "planGain",
    format: formatPct,
    higherIsBetter: true,
    deltaUnit: "none",
    value: plain("PLAN_GAIN_FACT_PCT"),
    accounts: false,
    related: ["operatingProfit"],
  },
};

// Дельта к прошлому периоду в единице показателя; undefined — показатель без дельты
export function metricDelta(
  metric: Metric,
  current: number | null,
  previous: number | null,
): number | null | undefined {
  if (metric.deltaUnit === "none") return undefined;
  if (metric.deltaUnit === "pp") return diff(current, previous);
  return deltaPct(current, previous);
}
