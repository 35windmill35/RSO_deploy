import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { DashboardRsoData, Period, StockRow } from "@Rso/entities/rso/api/contract";
import { downloadCsv } from "@Rso/shared/lib/csv";
import { useTableSort } from "@Rso/shared/lib/useTableSort";
import { Card } from "@Rso/shared/ui/Card/Card";
import { DataTable } from "@Rso/shared/ui/DataTable/DataTable";
import { csvName } from "@Rso/shared/lib/csvName";
import {
  stockColumns,
  stockCsv,
  stockSortAccessors,
  stockTotalsOf,
} from "@Rso/features/drill/ui/stock/stockColumns";
import { StockFooter } from "@Rso/features/drill/ui/stock/StockFooter";
import styles from "./SalesBlocks.module.css";

interface StockWarehousesProps {
  data: DashboardRsoData | null;
  // null — периода ещё нет, выгрузка недоступна
  period: Period | null;
  fallback?: ReactNode;
  onOpen?: (row: StockRow) => void;
}

const EMPTY: StockRow[] = [];

// Склады (§ЗК 3.9 п. 2): остатки и движение по каждому складу + итог по компании
export function StockWarehouses({ data, period, fallback, onOpen }: StockWarehousesProps) {
  const { t } = useTranslation();
  const translate = (key: string) => t(key);
  const rows = data?.stockW ?? EMPTY;
  const columns = stockColumns(translate, "warehouse");
  const table = useTableSort(rows, stockSortAccessors("warehouse"), {
    key: "stockEnd",
    order: -1,
  });
  // Итог — только по строкам складов: без складов итога нет
  const totals = stockTotalsOf(rows, "warehouse");

  const exportCsv = () => {
    if (!period) return;
    const { headers, lines } = stockCsv(table.rows, totals, "warehouse", translate);
    downloadCsv(csvName("sales", "warehouses", period), headers, lines);
  };

  return (
    <Card
      title={t("rso.block.stockWarehouses.title")}
      subtitle={t("rso.block.stockWarehouses.subtitle")}
      actions={
        <button
          type="button"
          className={styles.actionButton}
          onClick={exportCsv}
          disabled={rows.length === 0 || !period || Boolean(fallback)}
        >
          {t("rso.drill.exportCsv")}
        </button>
      }
    >
      {fallback ?? (
        <div className={styles.tableBleed}>
          <DataTable<StockRow>
            columns={columns}
            rows={table.rows}
            getRowKey={(row) => String(row.WAREHOUSE_ID)}
            onRowClick={onOpen}
            footer={
              totals ? <StockFooter totals={totals} kind="warehouse" t={translate} /> : undefined
            }
            sort={table.sort}
            onSort={table.onSort}
          />
        </div>
      )}
    </Card>
  );
}
