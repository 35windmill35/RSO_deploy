import type { AccountRow, VatMode } from "@Rso/entities/rso/api/contract";
import { pick, ratio } from "@Rso/entities/rso/lib/money";

// Агрегаты по списку заказ-нарядов месяца — чистые функции

export interface AccountsTotals {
  count: number;
  turnover: number;
  avgCheck: number | null;
}

export interface DayRow extends AccountsTotals {
  // YYYY-MM-DD
  date: string;
}

export function accountsTotals(rows: readonly AccountRow[], vat: VatMode): AccountsTotals {
  const turnover = rows.reduce((sum, row) => sum + (pick(row, "TURNOVER_TOTAL", vat) ?? 0), 0);
  return { count: rows.length, turnover, avgCheck: ratio(turnover, rows.length) };
}

// Разбивка месяца по дням закрытия ЗН, по возрастанию даты
export function groupByDay(rows: readonly AccountRow[], vat: VatMode): DayRow[] {
  const byDay = new Map<string, AccountRow[]>();
  rows.forEach((row) => {
    const date = row.DATE_EVENT?.slice(0, 10);
    if (!date) return;
    const list = byDay.get(date);
    if (list) list.push(row);
    else byDay.set(date, [row]);
  });
  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({ date, ...accountsTotals(list, vat) }));
}

export type AccountSortKey =
  | "ACCOUNT_CODE"
  | "DATE_EVENT"
  | "DEPARTMENT_NAME"
  | "ACCOUNT_TYPE_NAME"
  | "PAYMENT_TYPE_NAME"
  | "TURNOVER";

export interface AccountFilters {
  search: string;
  department: string;
  accountType: string;
  paymentType: string;
}

export const EMPTY_FILTERS: AccountFilters = {
  search: "",
  department: "",
  accountType: "",
  paymentType: "",
};

// Варианты фильтра строятся из обрезанных значений — сравниваем так же
function matches(value: string | null, filter: string): boolean {
  return !filter || (value ?? "").trim() === filter;
}

export function filterAccounts(rows: readonly AccountRow[], filters: AccountFilters): AccountRow[] {
  const search = filters.search.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (!search || (row.ACCOUNT_CODE ?? "").toLowerCase().includes(search)) &&
      matches(row.DEPARTMENT_NAME, filters.department) &&
      matches(row.ACCOUNT_TYPE_NAME, filters.accountType) &&
      matches(row.PAYMENT_TYPE_NAME, filters.paymentType),
  );
}

// Номер ЗН сортируется как число, если это число
function compareCodes(a: string | null, b: string | null): number {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return (a ?? "").localeCompare(b ?? "", "ru");
}

export function sortAccounts(
  rows: readonly AccountRow[],
  key: AccountSortKey,
  order: 1 | -1,
  vat: VatMode,
): AccountRow[] {
  const sorted = [...rows].sort((a, b) => {
    if (key === "TURNOVER") {
      return (pick(a, "TURNOVER_TOTAL", vat) ?? 0) - (pick(b, "TURNOVER_TOTAL", vat) ?? 0);
    }
    if (key === "ACCOUNT_CODE") return compareCodes(a.ACCOUNT_CODE, b.ACCOUNT_CODE);
    return (a[key] ?? "").localeCompare(b[key] ?? "", "ru");
  });
  return order === 1 ? sorted : sorted.reverse();
}

// Варианты фильтра — уникальные значения колонки по алфавиту
export function distinctValues(
  rows: readonly AccountRow[],
  field: "DEPARTMENT_NAME" | "ACCOUNT_TYPE_NAME" | "PAYMENT_TYPE_NAME",
): string[] {
  const values = new Set<string>();
  rows.forEach((row) => {
    const value = row[field]?.trim();
    if (value) values.add(value);
  });
  return Array.from(values).sort((a, b) => a.localeCompare(b, "ru"));
}
