import type { DashboardRsoData, Period, VatMode } from "@Rso/entities/rso/api/contract";
import type { MetricId } from "@Rso/entities/rso/lib/metrics";
import { cashLines, type CashLine } from "@Rso/entities/rso/lib/cash";
import { deltaPct, diff, pick, ratio } from "@Rso/entities/rso/lib/money";
import { prevPeriod } from "@Rso/entities/rso/lib/periodKey";
import {
  employeeHistory,
  payrollByDepartment,
  payrollByPosition,
  payrollEmployees,
  payrollKpis,
  payrollSources,
  payrollTotal,
  type EmployeeHistory,
  type PayrollEmployee,
  type PayrollGroups,
} from "@Rso/entities/rso/lib/payroll";
import { summaryOf } from "@Rso/entities/rso/lib/summary";

// Вкладка «Персонал и финансы» — чистые функции, без MobX и React (ТЗ §15)

export type StaffKpiId =
  | "payrollTotal"
  | "payrollShare"
  | "employees"
  | "notHired"
  | "payrollPerEmployee"
  | "cashIn"
  | "cashOut"
  | "cashProfit"
  | "expense"
  | "revenuePerEmployee";

export interface StaffKpiValue {
  value: number | null;
  // Дельта к прошлому периоду в единице карточки; null — нет данных
  delta: number | null;
}

export interface StaffKpis {
  values: Record<StaffKpiId, StaffKpiValue>;
  // Сотрудники без начислений — подпись под «Сотрудниками»
  zeroWage: number;
}

const perEmployee = (value: number | null, employees: number | null) =>
  employees ? ratio(value, employees) : null;

// 10 KPI (ТЗ §6). ФОТ — из payroll / prevPayroll; касса, расходы, выручка — из строк summary
// текущего и прошлого периода того же ответа. hasPrevPeriod — прошлый период посчитан
export function computeStaffKpis(
  data: DashboardRsoData | null,
  period: Period,
  vat: VatMode,
  hasPrevPeriod: boolean,
): StaffKpis | null {
  if (!data) return null;
  const sources = payrollSources(data, period, hasPrevPeriod);
  const payroll = payrollKpis(sources.cur, sources.prev, sources.revenue, sources.prevRevenue);
  const prevEmployees = sources.prev ? payrollKpis(sources.prev, null, null, null).employees : null;

  const now = summaryOf(data, period);
  // Нет строки прошлого периода в summary — дельты кассы и расходов «нет данных»
  const before = hasPrevPeriod ? summaryOf(data, prevPeriod(period)) : undefined;
  const money = (base: "CASH_IN_TOTAL" | "CASH_OUT_TOTAL" | "EXPENSE_TOTAL" | "REVENUE_TOTAL") => ({
    now: pick(now, base, vat),
    before: before ? pick(before, base, vat) : null,
  });
  const cashIn = money("CASH_IN_TOTAL");
  const cashOut = money("CASH_OUT_TOTAL");
  const expense = money("EXPENSE_TOTAL");
  const revenue = money("REVENUE_TOTAL");
  const cashProfit = {
    now: diff(cashIn.now, cashOut.now),
    before: diff(cashIn.before, cashOut.before),
  };
  const revenuePerEmployee = {
    now: perEmployee(revenue.now, payroll.employees),
    before: perEmployee(revenue.before, prevEmployees),
  };
  const item = (pair: { now: number | null; before: number | null }): StaffKpiValue => ({
    value: pair.now,
    delta: deltaPct(pair.now, pair.before),
  });

  return {
    values: {
      payrollTotal: { value: payroll.total, delta: payroll.totalDelta },
      payrollShare: { value: payroll.share, delta: payroll.shareDelta },
      employees: { value: payroll.employees, delta: payroll.employeesDelta },
      notHired: { value: payroll.notHired, delta: payroll.notHiredDelta },
      payrollPerEmployee: { value: payroll.perEmployee, delta: payroll.perEmployeeDelta },
      cashIn: item(cashIn),
      cashOut: item(cashOut),
      cashProfit: item(cashProfit),
      expense: item(expense),
      revenuePerEmployee: item(revenuePerEmployee),
    },
    zeroWage: payroll.zeroWage,
  };
}

// Касса по периодам уровня, по возрастанию — для графика (ТЗ §10)
export function cashTrend(data: DashboardRsoData | null, period: Period, vat: VatMode): CashLine[] {
  return data ? cashLines(data, period, vat).reverse() : [];
}

export type SummaryLineId =
  | "revenue"
  | "expense"
  | "operatingProfit"
  | "cashIn"
  | "cashOut"
  | "cashProfit"
  | "payroll"
  | "payrollCash";

export interface SummaryLine {
  id: SummaryLineId;
  value: number | null;
  // Деньги или доля, %
  unit: "money" | "pct";
  // Переход: метрика панели, ФОТ компании или нет перехода
  open: MetricId | "payroll" | null;
}

// Допуск сверки «выручка − расходы = операционная прибыль» (ТЗ §11)
const PROFIT_TOLERANCE = 1;

// Сводка периода (ТЗ §11). null — нет строки summary за период
export function periodSummary(
  data: DashboardRsoData | null,
  period: Period,
  vat: VatMode,
): SummaryLine[] | null {
  const row = summaryOf(data, period);
  if (!row) return null;
  const revenue = pick(row, "REVENUE_TOTAL", vat);
  const expense = pick(row, "EXPENSE_TOTAL", vat);
  const operatingProfit = pick(row, "OPERATING_PROFIT", vat);
  const cashIn = pick(row, "CASH_IN_TOTAL", vat);
  const cashOut = pick(row, "CASH_OUT_TOTAL", vat);
  const payroll = payrollTotal(data?.payroll);
  const payrollCash = cashOut ? ratio(payroll, cashOut) : null;

  const check = diff(diff(revenue, expense), operatingProfit);
  if (import.meta.env.DEV && check !== null && Math.abs(check) > PROFIT_TOLERANCE) {
    console.warn("[rso] summary: revenue - expense != operating profit", {
      period: `${period.type}${period.key}`,
      vat,
      revenue,
      expense,
      operatingProfit,
    });
  }

  return [
    { id: "revenue", value: revenue, unit: "money", open: "revenue" },
    { id: "expense", value: expense, unit: "money", open: "expense" },
    { id: "operatingProfit", value: operatingProfit, unit: "money", open: "operatingProfit" },
    { id: "cashIn", value: cashIn, unit: "money", open: "cashProfit" },
    { id: "cashOut", value: cashOut, unit: "money", open: "cashProfit" },
    { id: "cashProfit", value: diff(cashIn, cashOut), unit: "money", open: "cashProfit" },
    { id: "payroll", value: payroll, unit: "money", open: "payroll" },
    {
      id: "payrollCash",
      value: payrollCash === null ? null : payrollCash * 100,
      unit: "pct",
      open: null,
    },
  ];
}

export interface StaffPayroll {
  employees: PayrollEmployee[];
  history: EmployeeHistory;
  // В прошлом периоде начисления были ещё у N сотрудников; null — прошлого периода нет
  gone: number | null;
  departments: PayrollGroups & { mismatch: boolean };
  positions: PayrollGroups;
  total: number | null;
}

// Блоки «ФОТ по отделам», «ФОТ по должностям», «Сотрудники». null — нет раздела payroll
export function staffPayroll(
  data: DashboardRsoData | null,
  period: Period,
  hasPrevPeriod: boolean,
): StaffPayroll | null {
  const { cur, prev } = payrollSources(data, period, hasPrevPeriod);
  if (!cur) return null;
  const employees = payrollEmployees(cur);
  const history = employeeHistory(employees, prev);
  return {
    employees,
    history,
    gone: prev ? history.gone : null,
    departments: payrollByDepartment(cur, prev),
    positions: payrollByPosition(cur, prev),
    total: payrollTotal(cur),
  };
}
