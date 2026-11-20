import type { DashboardRsoData, Period, PayrollRow } from "../api/contract";
import { deltaPct, finite, pick, ratio } from "./money";
import { prevPeriod } from "./periodKey";
import { summaryOf } from "./summary";

// ФОТ (DashboardRSO.payroll / prevPayroll) — чистые функции, общие для вкладки
// «Персонал и финансы» и панели детализации. ТЗ «Персонал и финансы» §4.2, §7, §8, §15.
//
// Особенность данных: итог по компании — только строка IS_TOTAL. Сотрудник без отдела
// в карточке повторяется во всех отделах с одной и той же суммой, поэтому сумма строк
// больше итога. Сотрудник учитывается один раз, «без отдела» — отдельной строкой.

// Расхождение суммы строк с итогом в пределах округления (П-4: до 2 ₽)
const TOTAL_TOLERANCE = 5;

// Отдел сотрудника и его начисления в этом отделе
export interface EmployeeDepartment {
  id: number;
  name: string | null;
  wage: number;
}

export interface PayrollEmployee {
  userId: number;
  name: string | null;
  positionId: number;
  positionName: string | null;
  // null — «без отдела» (строка повторена во всех отделах с одной суммой)
  departments: EmployeeDepartment[] | null;
  isNotHired: boolean;
  wage: number;
}

// Дельта к прошлому периоду: null — прошлого периода нет, undefined — «новый»
export type PayrollDelta = number | null | undefined;

export function payrollTotal(rows: readonly PayrollRow[] | null | undefined): number | null {
  const total = rows?.find((row) => row.IS_TOTAL);
  return total ? finite(total.WAGE_SUMMA) : null;
}

// Сотрудники по USER_PCOMMON_ID. Повтор с одинаковыми суммой, должностью и статусом —
// «без отдела» (сумма одной строки); с разными суммами — работает в нескольких отделах
// (сумма строк). Второй случай на стенде не встречается — предупреждение разработчику
export function payrollEmployees(
  rows: readonly PayrollRow[] | null | undefined,
): PayrollEmployee[] {
  const groups = new Map<number, PayrollRow[]>();
  (rows ?? []).forEach((row) => {
    if (row.IS_TOTAL) return;
    const list = groups.get(row.USER_PCOMMON_ID);
    if (list) list.push(row);
    else groups.set(row.USER_PCOMMON_ID, [row]);
  });

  return Array.from(groups.entries()).map(([userId, list]) => {
    const first = list[0];
    const wageOf = (row: PayrollRow) => finite(row.WAGE_SUMMA) ?? 0;
    const base = {
      userId,
      name: first.EMPLOYEE_NAME,
      positionId: first.EMPLOYEE_POSITION_ID,
      positionName: first.EMPLOYEE_POSITION_NAME,
      isNotHired: Boolean(first.IS_NOT_HIRED),
    };
    const departments = list.map((row) => ({
      id: row.DEPARTMENT_ID,
      name: row.DEPARTMENT_NAME,
      wage: wageOf(row),
    }));
    if (list.length === 1) return { ...base, departments, wage: wageOf(first) };

    const sameRow = list.every(
      (row) =>
        wageOf(row) === wageOf(first) &&
        row.EMPLOYEE_POSITION_ID === first.EMPLOYEE_POSITION_ID &&
        Boolean(row.IS_NOT_HIRED) === Boolean(first.IS_NOT_HIRED),
    );
    if (sameRow) return { ...base, departments: null, wage: wageOf(first) };

    if (import.meta.env.DEV) {
      // Только ID: имена и суммы сотрудников в консоль не пишем (ТЗ §9.4)
      console.warn("[rso] payroll: employee in several departments with different sums", {
        userId,
      });
    }
    return {
      ...base,
      departments,
      wage: departments.reduce((sum, item) => sum + item.wage, 0),
    };
  });
}

// Сотрудники с начислениями — их считаем в KPI «Сотрудники»
export function withWage(employees: readonly PayrollEmployee[]): PayrollEmployee[] {
  return employees.filter((employee) => employee.wage > 0);
}

export interface PayrollGroupRow {
  // Отдел: DEPARTMENT_ID, null — «без отдела». Должность: EMPLOYEE_POSITION_ID
  id: number | null;
  name: string | null;
  wage: number;
  // Сотрудники с начислениями
  employees: number;
  notHired: number;
  // Доля в итоге ФОТ компании, %
  share: number | null;
  delta: PayrollDelta;
  // Средний ФОТ на сотрудника (для должностей)
  avgWage: number | null;
}

export interface PayrollGroups {
  rows: PayrollGroupRow[];
  total: {
    wage: number | null;
    employees: number;
    notHired: number;
    delta: number | null;
  };
}

interface Bucket {
  name: string | null;
  wage: number;
  employees: number;
  notHired: number;
}

function addTo(buckets: Map<number | null, Bucket>, key: number | null, name: string | null) {
  const bucket = buckets.get(key) ?? { name, wage: 0, employees: 0, notHired: 0 };
  buckets.set(key, bucket);
  return bucket;
}

function countIn(bucket: Bucket, wage: number, isNotHired: boolean) {
  bucket.wage += wage;
  if (wage > 0) {
    bucket.employees += 1;
    if (isNotHired) bucket.notHired += 1;
  }
}

// Свой ФОТ отделов + «без отдела» (ключ null)
function byDepartment(employees: readonly PayrollEmployee[]): Map<number | null, Bucket> {
  const buckets = new Map<number | null, Bucket>();
  employees.forEach((employee) => {
    if (employee.departments === null) {
      countIn(addTo(buckets, null, null), employee.wage, employee.isNotHired);
      return;
    }
    employee.departments.forEach((department) =>
      countIn(addTo(buckets, department.id, department.name), department.wage, employee.isNotHired),
    );
  });
  return buckets;
}

function byPosition(employees: readonly PayrollEmployee[]): Map<number | null, Bucket> {
  const buckets = new Map<number | null, Bucket>();
  employees.forEach((employee) =>
    countIn(
      addTo(buckets, employee.positionId, employee.positionName),
      employee.wage,
      employee.isNotHired,
    ),
  );
  return buckets;
}

function groupDelta(
  current: number,
  previous: Map<number | null, Bucket> | null,
  key: number | null,
): PayrollDelta {
  if (!previous) return null;
  const before = previous.get(key)?.wage ?? 0;
  return before > 0 ? deltaPct(current, before) : undefined;
}

function totals(
  cur: readonly PayrollRow[] | null | undefined,
  prev: readonly PayrollRow[] | null,
  employees: readonly PayrollEmployee[],
) {
  const paid = withWage(employees);
  return {
    wage: payrollTotal(cur),
    employees: paid.length,
    notHired: paid.filter((employee) => employee.isNotHired).length,
    delta: prev ? deltaPct(payrollTotal(cur), payrollTotal(prev)) : null,
  };
}

const sharePct = (wage: number, total: number | null) => {
  const share = ratio(wage, total);
  return share === null ? null : share * 100;
};

// ФОТ по отделам (ТЗ §7.1). prev — prevPayroll только при посчитанном прошлом периоде
export function payrollByDepartment(
  cur: readonly PayrollRow[] | null | undefined,
  prev: readonly PayrollRow[] | null,
): PayrollGroups & { mismatch: boolean } {
  const employees = payrollEmployees(cur);
  const current = byDepartment(employees);
  const previous = prev ? byDepartment(payrollEmployees(prev)) : null;
  const total = totals(cur, prev, employees);

  const rows: PayrollGroupRow[] = [];
  const keys = new Set<number | null>([...current.keys(), ...(previous?.keys() ?? [])]);
  keys.forEach((key) => {
    if (key === null) return;
    const now = current.get(key);
    const before = previous?.get(key);
    // Отдел без своего ФОТ в обоих периодах — только «без отдела» внутри, не выводим
    if ((now?.wage ?? 0) <= 0 && (before?.wage ?? 0) <= 0) return;
    const wage = now?.wage ?? 0;
    rows.push({
      id: key,
      name: now?.name ?? before?.name ?? null,
      wage,
      employees: now?.employees ?? 0,
      notHired: now?.notHired ?? 0,
      share: sharePct(wage, total.wage),
      delta: groupDelta(wage, previous, key),
      avgWage: ratio(wage, now?.employees ?? 0),
    });
  });
  rows.sort((a, b) => b.wage - a.wage);

  const noDepartment = current.get(null);
  if (noDepartment && noDepartment.employees + noDepartment.wage > 0) {
    rows.push({
      id: null,
      name: null,
      wage: noDepartment.wage,
      employees: noDepartment.employees,
      notHired: noDepartment.notHired,
      share: sharePct(noDepartment.wage, total.wage),
      delta: groupDelta(noDepartment.wage, previous, null),
      avgWage: ratio(noDepartment.wage, noDepartment.employees),
    });
  }

  const sum = rows.reduce((acc, row) => acc + row.wage, 0);
  const mismatch = total.wage !== null && Math.abs(sum - total.wage) > TOTAL_TOLERANCE;
  return { rows, total, mismatch };
}

// ФОТ по должностям (ТЗ §8). Должности без начислений не выводятся
export function payrollByPosition(
  cur: readonly PayrollRow[] | null | undefined,
  prev: readonly PayrollRow[] | null,
): PayrollGroups {
  const employees = payrollEmployees(cur);
  const current = byPosition(employees);
  const previous = prev ? byPosition(payrollEmployees(prev)) : null;
  const total = totals(cur, prev, employees);

  const rows: PayrollGroupRow[] = Array.from(current.entries())
    .filter(([, bucket]) => bucket.wage > 0)
    .map(([key, bucket]) => ({
      id: key,
      name: bucket.name,
      wage: bucket.wage,
      employees: bucket.employees,
      notHired: bucket.notHired,
      share: sharePct(bucket.wage, total.wage),
      delta: groupDelta(bucket.wage, previous, key),
      avgWage: ratio(bucket.wage, bucket.employees),
    }))
    .sort((a, b) => b.wage - a.wage);
  return { rows, total };
}

export interface EmployeeHistory {
  // Дельта ФОТ сотрудника и его ФОТ в прошлом периоде (null — не было или нет данных)
  deltas: Map<number, PayrollDelta>;
  previous: Map<number, number>;
  // Сотрудники с начислениями в прошлом периоде, которых нет в текущем
  gone: number;
}

export function employeeHistory(
  employees: readonly PayrollEmployee[],
  prev: readonly PayrollRow[] | null,
): EmployeeHistory {
  const deltas = new Map<number, PayrollDelta>();
  const previous = new Map<number, number>();
  if (!prev) {
    employees.forEach((employee) => deltas.set(employee.userId, null));
    return { deltas, previous, gone: 0 };
  }
  const before = new Map(payrollEmployees(prev).map((employee) => [employee.userId, employee]));
  before.forEach((employee) => previous.set(employee.userId, employee.wage));
  employees.forEach((employee) => {
    const past = before.get(employee.userId)?.wage ?? 0;
    deltas.set(employee.userId, past > 0 ? deltaPct(employee.wage, past) : undefined);
  });
  const current = new Set(employees.map((employee) => employee.userId));
  const gone = Array.from(before.values()).filter(
    (employee) => employee.wage > 0 && !current.has(employee.userId),
  ).length;
  return { deltas, previous, gone };
}

export interface PayrollKpis {
  total: number | null;
  totalDelta: number | null;
  // ФОТ к выручке без НДС, % (решение владельца: не зависит от переключателя НДС)
  share: number | null;
  shareDelta: number | null;
  employees: number | null;
  employeesDelta: number | null;
  notHired: number | null;
  notHiredDelta: number | null;
  perEmployee: number | null;
  perEmployeeDelta: number | null;
  // Сотрудники без начислений — подпись под карточкой «Сотрудники»
  zeroWage: number;
}

interface PayrollCounts {
  total: number | null;
  employees: number;
  notHired: number;
}

function counts(rows: readonly PayrollRow[]): PayrollCounts {
  const paid = withWage(payrollEmployees(rows));
  return {
    total: payrollTotal(rows),
    employees: paid.length,
    notHired: paid.filter((employee) => employee.isNotHired).length,
  };
}

const share = (wage: number | null, revenue: number | null) => {
  const value = ratio(wage, revenue);
  return value === null ? null : value * 100;
};

const minus = (a: number | null, b: number | null) => (a === null || b === null ? null : a - b);

// KPI ФОТ за период. cur/prev — строки payroll и prevPayroll (prev = null, если
// прошлый период не посчитан); revenue — выручка без НДС текущего и прошлого периода
export function payrollKpis(
  cur: readonly PayrollRow[] | null | undefined,
  prev: readonly PayrollRow[] | null,
  revenue: number | null,
  prevRevenue: number | null,
): PayrollKpis {
  if (!cur) {
    return {
      total: null,
      totalDelta: null,
      share: null,
      shareDelta: null,
      employees: null,
      employeesDelta: null,
      notHired: null,
      notHiredDelta: null,
      perEmployee: null,
      perEmployeeDelta: null,
      zeroWage: 0,
    };
  }
  const now = counts(cur);
  const before = prev ? counts(prev) : null;
  const perEmployee = ratio(now.total, now.employees);
  const perEmployeeBefore = before ? ratio(before.total, before.employees) : null;
  const shareNow = share(now.total, revenue);
  const shareBefore = before ? share(before.total, prevRevenue) : null;
  return {
    total: now.total,
    totalDelta: before ? deltaPct(now.total, before.total) : null,
    share: shareNow,
    shareDelta: minus(shareNow, shareBefore),
    employees: now.employees,
    employeesDelta: before ? now.employees - before.employees : null,
    notHired: now.notHired,
    notHiredDelta: before ? now.notHired - before.notHired : null,
    perEmployee,
    perEmployeeDelta: deltaPct(perEmployee, perEmployeeBefore),
    zeroWage: payrollEmployees(cur).filter((employee) => employee.wage <= 0).length,
  };
}

export interface PayrollSources {
  cur: PayrollRow[] | null;
  // prevPayroll — только если прошлый период посчитан (П-10, R-07)
  prev: PayrollRow[] | null;
  // Выручка без НДС текущего и прошлого периода — база «ФОТ / выручка» (решение 4)
  revenue: number | null;
  prevRevenue: number | null;
}

export function payrollSources(
  data: DashboardRsoData | null | undefined,
  period: Period,
  hasPrev: boolean,
): PayrollSources {
  return {
    cur: data?.payroll ?? null,
    prev: hasPrev ? (data?.prevPayroll ?? null) : null,
    revenue: pick(summaryOf(data, period), "REVENUE_TOTAL", "Netto"),
    prevRevenue: hasPrev
      ? pick(summaryOf(data, prevPeriod(period)), "REVENUE_TOTAL", "Netto")
      : null,
  };
}
