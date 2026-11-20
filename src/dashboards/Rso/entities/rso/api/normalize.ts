import type { AccountRow, ClientSegmentRow, DashboardRsoData, PayrollRow } from "./contract";

// Нормализация ответа API на границе: дальше по коду данные уже «чистые».
// - флаги: ТЗ заказчика описывает их как 0/1, стенд отдаёт true/false — приводим к boolean;
// - названия: на стенде приходят с пробелами в конце — обрезаем, пустую строку → null.

type Row = Record<string, unknown>;

function flag(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  return Boolean(Number(value));
}

function text(value: unknown): string | null {
  if (typeof value !== "string")
    return value === null || value === undefined ? null : String(value);
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

// Все поля *_NAME и SEGMENT — строки-названия
function normalizeNames<T>(row: T): T {
  const result: Row = { ...(row as Row) };
  Object.keys(result).forEach((key) => {
    if (key.endsWith("_NAME") || key === "SEGMENT" || key === "ACCOUNT_CODE") {
      result[key] = text(result[key]);
    }
  });
  return result as T;
}

function normalizeSegment(row: ClientSegmentRow): ClientSegmentRow {
  return { ...normalizeNames(row), IS_TOTAL: flag(row.IS_TOTAL), IS_PRIMARY: flag(row.IS_PRIMARY) };
}

function normalizePayroll(row: PayrollRow): PayrollRow {
  return {
    ...normalizeNames(row),
    IS_TOTAL: flag(row.IS_TOTAL),
    IS_NOT_HIRED: row.IS_NOT_HIRED === null ? null : flag(row.IS_NOT_HIRED),
  };
}

function list<T>(rows: T[] | undefined, map: (row: T) => T): T[] | undefined {
  return Array.isArray(rows) ? rows.map(map) : undefined;
}

export function normalizeDashboard(raw: DashboardRsoData): DashboardRsoData {
  return {
    summary: raw.summary,
    turnoverAndIncome: Array.isArray(raw.turnoverAndIncome)
      ? raw.turnoverAndIncome.map((group) =>
          Array.isArray(group) ? group.map(normalizeNames) : [],
        )
      : undefined,
    cars: list(raw.cars, normalizeNames),
    capacity: list(raw.capacity, normalizeNames),
    clientSegment: list(raw.clientSegment, normalizeSegment),
    prevClientSegment: list(raw.prevClientSegment, normalizeSegment),
    payroll: list(raw.payroll, normalizePayroll),
    prevPayroll: list(raw.prevPayroll, normalizePayroll),
    stockG: list(raw.stockG, normalizeNames),
    stockW: list(raw.stockW, normalizeNames),
    expenses: list(raw.expenses, normalizeNames),
  };
}

export function normalizeAccount(row: AccountRow): AccountRow {
  return normalizeNames(row);
}
