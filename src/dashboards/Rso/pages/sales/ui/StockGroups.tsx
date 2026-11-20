import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Period, StockRow } from "@Rso/entities/rso/api/contract";
import { finite } from "@Rso/entities/rso/lib/money";
import { isEmptyStockRow } from "@Rso/entities/rso/lib/sales";
import { downloadCsv } from "@Rso/shared/lib/csv";
import { DASH, formatMoney, formatPct } from "@Rso/shared/lib/format";
import { Card } from "@Rso/shared/ui/Card/Card";
import { HBarList, type HBarItem } from "@Rso/shared/ui/HBarList/HBarList";
import { Segmented } from "@Rso/shared/ui/Segmented/Segmented";
import { csvName } from "@Rso/shared/lib/csvName";
import { stockCsv, stockTotalsOf } from "@Rso/features/drill/ui/stock/stockColumns";
import styles from "./SalesBlocks.module.css";

// Баров — топ-15, остальные группы одной строкой
const TOP_BARS = 15;
const REST_KEY = "__rest__";

type StockMeasure = "stockEnd" | "sale" | "profit" | "markup";

const MEASURE_VALUE: Record<StockMeasure, (row: StockRow) => number | null> = {
  stockEnd: (row) => finite(row.STOCK_END_BRUTTO),
  sale: (row) => finite(row.SHIPMENT_SALE_BRUTTO),
  profit: (row) => finite(row.PROFIT_BRUTTO),
  markup: (row) => finite(row.MARKUP_PCT),
};

interface StockGroupsProps {
  rows: StockRow[] | null;
  // null — периода ещё нет, выгрузка недоступна
  period: Period | null;
  fallback?: ReactNode;
  onOpen?: (row: StockRow) => void;
  // «Посмотреть все группы» и «Ещё N групп» — панель со всеми группами
  onOpenAll?: () => void;
}

const EMPTY: StockRow[] = [];

// Склад по товарным группам (§ЗК 3.9 п. 1): бары по выбранному показателю; все группы —
// в панели детализации
export function StockGroups({ rows, period, fallback, onOpen, onOpenAll }: StockGroupsProps) {
  const { t } = useTranslation();
  const [measure, setMeasure] = useState<StockMeasure>("stockEnd");
  const translate = (key: string) => t(key);

  const all = rows ?? EMPTY;
  const nonEmpty = all.filter((row) => !isEmptyStockRow(row));

  const exportCsv = () => {
    if (!period) return;
    // Выгрузка — все группы, включая пустые, с итогом по ним
    const { headers, lines } = stockCsv(all, stockTotalsOf(all, "group"), "group", translate);
    downloadCsv(csvName("sales", "stock_groups", period), headers, lines);
  };

  const card = (content: ReactNode) => (
    <Card
      title={t("rso.block.stockGroups.title")}
      subtitle={t("rso.block.stockGroups.subtitle")}
      actions={
        <div className={styles.actions}>
          <Segmented<StockMeasure>
            tone="card"
            label={t("rso.sales.measure.label")}
            value={measure}
            options={[
              { value: "stockEnd", label: t("rso.sales.stock.measure.stockEnd") },
              { value: "sale", label: t("rso.sales.stock.measure.sale") },
              { value: "profit", label: t("rso.sales.stock.measure.profit") },
              { value: "markup", label: t("rso.sales.stock.measure.markup") },
            ]}
            onChange={setMeasure}
          />
          <button
            type="button"
            className={styles.actionButton}
            onClick={exportCsv}
            disabled={all.length === 0 || !period || Boolean(fallback)}
          >
            {t("rso.drill.exportCsv")}
          </button>
        </div>
      }
    >
      {content}
    </Card>
  );

  if (fallback || !rows) return card(fallback);

  // Бары: группы со значением показателя, по убыванию
  const value = MEASURE_VALUE[measure];
  const ranked = nonEmpty
    .filter((row) => value(row) !== null && value(row) !== 0)
    .sort((a, b) => (value(b) ?? 0) - (value(a) ?? 0));
  const format = measure === "markup" ? formatPct : formatMoney;
  const items: HBarItem[] = ranked.slice(0, TOP_BARS).map((row) => ({
    key: String(row.GROUP_ID),
    label: row.GROUP_NAME ?? DASH,
    value: value(row),
    caption: format(value(row)),
    negative: (value(row) ?? 0) < 0,
  }));
  const rest = ranked.slice(TOP_BARS);
  if (rest.length > 0) {
    // Наценка «остальных» — средневзвешенная по себестоимости
    const restValue =
      measure === "markup"
        ? (() => {
            const cost = rest.reduce((s, row) => s + (finite(row.SHIPMENT_COST_BRUTTO) ?? 0), 0);
            const profit = rest.reduce((s, row) => s + (finite(row.PROFIT_BRUTTO) ?? 0), 0);
            return cost ? (profit / cost) * 100 : null;
          })()
        : rest.reduce((s, row) => s + (value(row) ?? 0), 0);
    items.push({
      key: REST_KEY,
      label: t("rso.sales.stock.others", { count: rest.length }),
      value: restValue,
      caption: format(restValue),
      color: "var(--rso-neutral)",
    });
  }

  return card(
    <div className={styles.stack}>
      <HBarList
        items={items}
        onSelect={(key) => {
          if (key === REST_KEY) {
            onOpenAll?.();
            return;
          }
          const row = all.find((item) => String(item.GROUP_ID) === key);
          if (row) onOpen?.(row);
        }}
      />
      {onOpenAll && (
        <div className={styles.detailsFooter}>
          <button type="button" className={styles.actionButton} onClick={onOpenAll}>
            {t("rso.sales.stock.allGroups")}
          </button>
        </div>
      )}
    </div>,
  );
}
