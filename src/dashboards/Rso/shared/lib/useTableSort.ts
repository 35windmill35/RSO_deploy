import { useState } from "react";

export type SortValue = number | string | null | undefined;

export interface TableSort {
  key: string;
  order: 1 | -1;
}

// Сортировка строк таблицы на клиенте по значениям колонок.
// Пустые значения всегда внизу; первый клик по числовой колонке — по убыванию.
// Текстовая колонка — по первому непустому значению: у первой строки оно может быть null
function isTextColumn<T>(rows: readonly T[], accessor?: (row: T) => SortValue): boolean {
  if (!accessor) return false;
  for (const row of rows) {
    const value = accessor(row);
    if (value !== null && value !== undefined && value !== "") return typeof value === "string";
  }
  return false;
}

export function useTableSort<T>(
  rows: readonly T[],
  accessors: Record<string, (row: T) => SortValue>,
  initial: TableSort,
) {
  const [sort, setSort] = useState<TableSort>(initial);

  // Строк немного (до ~130 групп склада) — сортируем на каждом рендере
  const sorted = (() => {
    const accessor = accessors[sort.key];
    if (!accessor) return [...rows];
    return [...rows].sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      const emptyA = va === null || va === undefined || va === "";
      const emptyB = vb === null || vb === undefined || vb === "";
      if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1;
      const result =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "ru");
      return result * sort.order;
    });
  })();

  const onSort = (key: string) =>
    setSort((current) =>
      current.key === key
        ? { key, order: current.order === 1 ? -1 : 1 }
        : { key, order: isTextColumn(rows, accessors[key]) ? 1 : -1 },
    );

  return { rows: sorted, sort, onSort };
}
