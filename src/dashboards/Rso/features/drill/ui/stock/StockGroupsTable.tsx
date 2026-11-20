import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { StockRow } from "@Rso/entities/rso/api/contract";
import { isEmptyStockRow } from "@Rso/entities/rso/lib/sales";
import { useTableSort } from "@Rso/shared/lib/useTableSort";
import { DataTable } from "@Rso/shared/ui/DataTable/DataTable";
import { stockColumns, stockSortAccessors, stockTotalsOf, type Translate } from "./stockColumns";
import { StockFooter } from "./StockFooter";
import styles from "./Stock.module.css";

interface StockGroupsTableProps {
  rows: readonly StockRow[];
  onOpen?: (row: StockRow) => void;
}

// Все товарные группы: поиск, «Показать пустые», сортировка, итог по видимым строкам.
// Суммы — с НДС
export function StockGroupsTable({ rows, onOpen }: StockGroupsTableProps) {
  const { t } = useTranslation();
  const translate: Translate = (key) => t(key);
  const [search, setSearch] = useState("");
  const [showEmpty, setShowEmpty] = useState(false);

  const nonEmpty = rows.filter((row) => !isEmptyStockRow(row));
  const query = search.trim().toLowerCase();
  const visible = (showEmpty ? rows : nonEmpty).filter(
    (row) => !query || (row.GROUP_NAME ?? "").toLowerCase().includes(query),
  );
  const table = useTableSort(visible, stockSortAccessors("group"), { key: "stockEnd", order: -1 });
  // Итог — по видимым строкам: меняется вместе с поиском и «Показать пустые»
  const totals = stockTotalsOf(table.rows, "group");

  return (
    <>
      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.search}
          placeholder={t("rso.sales.stock.search")}
          aria-label={t("rso.sales.stock.search")}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {rows.length > nonEmpty.length && (
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={showEmpty}
              onChange={(event) => setShowEmpty(event.target.checked)}
            />
            {t("rso.sales.stock.showEmpty", { count: rows.length - nonEmpty.length })}
          </label>
        )}
      </div>
      <DataTable<StockRow>
        columns={stockColumns(translate, "group")}
        rows={table.rows}
        getRowKey={(row) => String(row.GROUP_ID)}
        onRowClick={onOpen}
        footer={totals ? <StockFooter totals={totals} kind="group" t={translate} /> : undefined}
        sort={table.sort}
        onSort={table.onSort}
      />
    </>
  );
}
