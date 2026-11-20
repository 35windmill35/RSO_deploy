import type { KeyboardEvent, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import styles from "./DataTable.module.css";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  // Числа — по правому краю, моноширинные цифры
  align?: "left" | "right";
  // Колонка забирает оставшуюся ширину
  grow?: boolean;
  // Колонку можно сортировать — заголовок становится кнопкой
  sortable?: boolean;
}

export interface DataTableSort {
  key: string;
  // 1 — по возрастанию, -1 — по убыванию
  order: 1 | -1;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyText?: string;
  // Итоговая строка под таблицей
  footer?: ReactNode;
  // Текущая сортировка и обработчик клика по заголовку сортируемой колонки
  sort?: DataTableSort;
  onSort?: (key: string) => void;
}

// Таблица внутри карточки: на узких экранах прокручивается по горизонтали
// внутри себя, не ломая страницу (§8.2)
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  emptyText,
  footer,
  sort,
  onSort,
}: DataTableProps<T>) {
  const { t } = useTranslation();

  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick?.(row);
    }
  };

  const cellClass = (column: DataTableColumn<T>) =>
    [column.align === "right" ? styles.right : "", column.grow ? styles.grow : ""]
      .filter(Boolean)
      .join(" ");

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => {
              const active = sort?.key === column.key;
              const ariaSort = active
                ? sort?.order === 1
                  ? "ascending"
                  : "descending"
                : undefined;
              return (
                <th key={column.key} scope="col" className={cellClass(column)} aria-sort={ariaSort}>
                  {column.sortable && onSort ? (
                    <button
                      type="button"
                      className={`${styles.sortButton} ${active ? styles.sortActive : ""}`}
                      onClick={() => onSort(column.key)}
                    >
                      {column.label}
                      <span className={styles.sortIcon} aria-hidden="true">
                        {active ? (sort?.order === 1 ? "↑" : "↓") : "↕"}
                      </span>
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className={styles.empty} colSpan={columns.length}>
                {emptyText ?? t("rso.block.empty")}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={getRowKey(row)}
                className={onRowClick ? styles.clickable : ""}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (event) => handleKeyDown(event, row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cellClass(column)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {footer && <tfoot>{footer}</tfoot>}
      </table>
    </div>
  );
}
