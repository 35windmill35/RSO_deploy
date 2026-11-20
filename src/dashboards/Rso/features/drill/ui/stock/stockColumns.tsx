import type { StockRow } from "@Rso/entities/rso/api/contract";
import { finite } from "@Rso/entities/rso/lib/money";
import { stockRowsTotals, type StockTotals } from "@Rso/entities/rso/lib/sales";
import {
  DASH,
  formatCsvNumber,
  formatMoney,
  formatNumber,
  formatPct,
  formatSignedCount,
} from "@Rso/shared/lib/format";
import type { SortValue } from "@Rso/shared/lib/useTableSort";
import type { DataTableColumn } from "@Rso/shared/ui/DataTable/DataTable";
import { moneyHeader } from "@Rso/shared/lib/csvName";
import styles from "./Stock.module.css";

// Колонки, итог и CSV таблиц склада: товарные группы и склады. Все суммы — с НДС
export type StockKind = "group" | "warehouse";

// Перевод подписи по ключу (t из useTranslation)
export type Translate = (key: string) => string;

interface StockField {
  key: string;
  label: string;
  value: (row: StockRow) => number | null;
  // Итог колонки по набору строк
  total: (totals: StockTotals) => number | null;
  format: (value: number | null) => string;
  money: boolean;
  // Только для одного вида таблицы
  only?: StockKind;
}

function fields(t: Translate, kind: StockKind): StockField[] {
  const all: StockField[] = [
    {
      key: "stockBegin",
      label: t("rso.col.stockBegin"),
      value: (r) => finite(r.STOCK_BEGIN_BRUTTO),
      total: (s) => s.stockBegin,
      format: formatMoney,
      money: true,
    },
    {
      key: "delivery",
      label: t("rso.col.delivery"),
      value: (r) => finite(r.DELIVERY_SUM_BRUTTO),
      total: (s) => s.delivery,
      format: formatMoney,
      money: true,
    },
    {
      key: "returnToSupplier",
      label: t("rso.col.returnToSupplier"),
      value: (r) => finite(r.RETURN_TO_SUPPLIER_BRUTTO),
      total: (s) => s.returnToSupplier,
      format: formatMoney,
      money: true,
      only: "warehouse",
    },
    {
      key: "sale",
      label: t("rso.col.shipmentSale"),
      value: (r) => finite(r.SHIPMENT_SALE_BRUTTO),
      total: (s) => s.shipmentSale,
      format: formatMoney,
      money: true,
    },
    {
      key: "cost",
      label: t("rso.col.cost"),
      value: (r) => finite(r.SHIPMENT_COST_BRUTTO),
      total: (s) => s.shipmentCost,
      format: formatMoney,
      money: true,
      only: "group",
    },
    {
      key: "profit",
      label: t("rso.col.profit"),
      value: (r) => finite(r.PROFIT_BRUTTO),
      total: (s) => s.profit,
      format: formatMoney,
      money: true,
    },
    {
      key: "markup",
      label: t("rso.col.markup"),
      value: (r) => finite(r.MARKUP_PCT),
      total: (s) => s.markupPct,
      format: formatPct,
      money: false,
    },
    {
      key: "turnoverPct",
      label: t("rso.col.turnoverPct"),
      value: (r) => finite(r.TURNOVER_PCT),
      total: (s) => s.turnoverPct,
      format: formatPct,
      money: false,
    },
    {
      key: "stockEnd",
      label: t("rso.col.stockEnd"),
      value: (r) => finite(r.STOCK_END_BRUTTO),
      total: (s) => s.stockEnd,
      format: formatMoney,
      money: true,
    },
  ];
  return all.filter((field) => !field.only || field.only === kind);
}

const nameOf = (row: StockRow, kind: StockKind) =>
  (kind === "group" ? row.GROUP_NAME : row.WAREHOUSE_NAME) ?? DASH;

// Без перевода: для сортировки и CSV-значений подписи не нужны
const keyOnly: Translate = (key) => key;

export function stockColumns(t: Translate, kind: StockKind): DataTableColumn<StockRow>[] {
  return [
    {
      key: "name",
      label: t(kind === "group" ? "rso.col.group" : "rso.col.warehouse"),
      grow: true,
      sortable: true,
      render: (row) => nameOf(row, kind),
    },
    ...fields(t, kind).map((field): DataTableColumn<StockRow> => ({
      key: field.key,
      label: field.label,
      align: "right",
      sortable: true,
      render: (row) => {
        const value = field.value(row);
        // Отрицательная наценка — продажа ниже себестоимости
        return field.key === "markup" && value !== null && value < 0 ? (
          <span className={styles.negative}>{field.format(value)}</span>
        ) : (
          field.format(value)
        );
      },
    })),
    {
      key: "items",
      label: t("rso.col.itemsCount"),
      align: "right",
      sortable: true,
      render: (row) => {
        const delta = formatSignedCount(finite(row.ITEMS_COUNT_DELTA));
        return (
          <>
            {formatNumber(finite(row.ITEMS_COUNT_END))}
            {delta && delta !== "0" && <span className={styles.subValue}>({delta})</span>}
          </>
        );
      },
    },
  ];
}

export function stockSortAccessors(kind: StockKind): Record<string, (row: StockRow) => SortValue> {
  const accessors: Record<string, (row: StockRow) => SortValue> = {
    name: (row) => nameOf(row, kind),
    items: (row) => finite(row.ITEMS_COUNT_END),
  };
  fields(keyOnly, kind).forEach((field) => {
    accessors[field.key] = field.value;
  });
  return accessors;
}

// Поля для итоговой строки: подпись и значение итога
export function stockTotalCells(
  t: Translate,
  kind: StockKind,
  totals: StockTotals,
): { key: string; text: string }[] {
  return fields(t, kind).map((field) => ({
    key: field.key,
    text: field.format(field.total(totals)),
  }));
}

// Итог по строкам таблицы (видимым). У складов номенклатура не складывается:
// позиция на нескольких складах посчиталась бы несколько раз
export function stockTotalsOf(rows: readonly StockRow[], kind: StockKind): StockTotals | null {
  return stockRowsTotals(rows, kind === "group" ? rows : null);
}

// CSV: заголовки с пометкой «с НДС», строки, итог; номенклатура и её изменение
export function stockCsv(
  rows: readonly StockRow[],
  totals: StockTotals | null,
  kind: StockKind,
  t: Translate,
): { headers: string[]; lines: string[][] } {
  const list = fields(t, kind);
  const brutto = t("rso.vat.Brutto");
  const headers = [
    t(kind === "group" ? "rso.col.group" : "rso.col.warehouse"),
    ...list.map((field) => (field.money ? moneyHeader(field.label, brutto) : field.label)),
    t("rso.col.itemsCount"),
    t("rso.col.itemsDelta"),
  ];
  const lines = rows.map((row) => [
    kind === "group" ? (row.GROUP_NAME ?? "") : (row.WAREHOUSE_NAME ?? ""),
    ...list.map((field) => formatCsvNumber(field.value(row))),
    formatCsvNumber(finite(row.ITEMS_COUNT_END)),
    formatCsvNumber(finite(row.ITEMS_COUNT_DELTA)),
  ]);
  if (totals) {
    lines.push([
      t("rso.drill.total"),
      ...list.map((field) => formatCsvNumber(field.total(totals))),
      kind === "group" ? formatCsvNumber(totals.items) : "",
      kind === "group" ? formatCsvNumber(totals.itemsDelta) : "",
    ]);
  }
  return { headers, lines };
}
