import type { PayrollEmployee, PayrollGroupRow } from "@Rso/entities/rso/lib/payroll";

// Подписи ФОТ: пустые названия, «без отдела». Чистые функции — общие для таблиц,
// заголовков панели и CSV

export type Translate = (key: string) => string;

export type PayrollGroupKind = "department" | "position";

export function employeeName(employee: Pick<PayrollEmployee, "name">, t: Translate): string {
  return employee.name ?? t("rso.staff.noName");
}

export function employeeDepartment(employee: PayrollEmployee, t: Translate): string {
  if (employee.departments === null) return t("rso.staff.noDepartment");
  const names = employee.departments.map((item) => item.name).filter(Boolean);
  return names.length > 0 ? names.join(", ") : t("rso.staff.noDepartment");
}

export function positionName(employee: Pick<PayrollEmployee, "positionName">, t: Translate) {
  return employee.positionName ?? t("rso.staff.noPosition");
}

export function groupName(row: PayrollGroupRow, kind: PayrollGroupKind, t: Translate): string {
  if (kind === "department")
    return row.id === null ? t("rso.staff.noDepartment") : (row.name ?? "");
  return row.name ?? t("rso.staff.noPosition");
}
