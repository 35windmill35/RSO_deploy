import type {
  EmployeeHistory,
  PayrollDelta,
  PayrollEmployee,
  PayrollGroups,
} from "@Rso/entities/rso/lib/payroll";
import { downloadCsv } from "@Rso/shared/lib/csv";
import { csvName } from "@Rso/shared/lib/csvName";
import { formatCsvNumber } from "@Rso/shared/lib/format";
import {
  employeeDepartment,
  employeeName,
  groupName,
  positionName,
  type PayrollGroupKind,
  type Translate,
} from "./payrollLabels";

// Выгрузки ФОТ (ТЗ §20). НДС к ФОТ не применяется — без пометки режима в имени и заголовках.
// «Новый», статус и «Без отдела» — текстом

interface CsvPeriod {
  type: string;
  key: number;
}

const deltaText = (value: PayrollDelta, t: Translate) =>
  value === undefined ? t("rso.sales.delta.new") : formatCsvNumber(value);

const share = (wage: number | null, total: number | null) =>
  wage !== null && total ? (wage / total) * 100 : null;

export function exportPayrollGroups(
  groups: PayrollGroups,
  kind: PayrollGroupKind,
  period: CsvPeriod,
  t: Translate,
): void {
  const isDepartment = kind === "department";
  const headers = [
    t(isDepartment ? "rso.col.department" : "rso.col.position"),
    t("rso.kpi.employees.label"),
    t("rso.col.wage"),
    t("rso.col.share"),
    ...(isDepartment ? [] : [t("rso.kpi.payrollPerEmployee.label")]),
    t("rso.col.deltaPrev"),
    ...(isDepartment ? [t("rso.kpi.notHired.label")] : []),
  ];
  const line = (
    name: string,
    row: { wage: number | null; employees: number; notHired: number; delta: PayrollDelta },
    rowShare: number | null,
  ) => [
    name,
    formatCsvNumber(row.employees),
    formatCsvNumber(row.wage),
    formatCsvNumber(rowShare),
    ...(isDepartment
      ? []
      : [
          formatCsvNumber(row.wage !== null && row.employees > 0 ? row.wage / row.employees : null),
        ]),
    deltaText(row.delta, t),
    ...(isDepartment ? [formatCsvNumber(row.notHired)] : []),
  ];
  const { total } = groups;
  downloadCsv(csvName("staff", isDepartment ? "departments" : "positions", period), headers, [
    ...groups.rows.map((row) => line(groupName(row, kind, t), row, row.share)),
    line(t("rso.drill.total"), total, share(total.wage, total.wage)),
  ]);
}

// Все сотрудники, без учёта фильтров таблицы. Персональные данные — ТЗ §9.4
export function exportEmployees(
  employees: readonly PayrollEmployee[],
  history: EmployeeHistory,
  total: number | null,
  period: CsvPeriod,
  t: Translate,
): void {
  const headers = [
    t("rso.col.employee"),
    t("rso.col.position"),
    t("rso.col.department"),
    t("rso.col.status"),
    t("rso.col.wage"),
    t("rso.col.share"),
    t("rso.col.deltaPrev"),
  ];
  const rows = [...employees]
    .sort((a, b) => b.wage - a.wage)
    .map((employee) => [
      employeeName(employee, t),
      positionName(employee, t),
      employeeDepartment(employee, t),
      employee.isNotHired ? t("rso.staff.notHired") : "",
      formatCsvNumber(employee.wage),
      formatCsvNumber(employee.wage > 0 ? share(employee.wage, total) : null),
      deltaText(history.deltas.get(employee.userId) ?? null, t),
    ]);
  downloadCsv(csvName("staff", "employees", period), headers, rows);
}
