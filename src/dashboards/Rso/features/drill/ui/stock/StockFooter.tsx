import type { StockTotals } from "@Rso/entities/rso/lib/sales";
import { DASH, formatNumber } from "@Rso/shared/lib/format";
import { stockTotalCells, type StockKind, type Translate } from "./stockColumns";
import styles from "./Stock.module.css";

interface StockFooterProps {
  totals: StockTotals;
  kind: StockKind;
  t: Translate;
}

// Итоговая строка таблицы склада. У складов номенклатура не складывается
export function StockFooter({ totals, kind, t }: StockFooterProps) {
  return (
    <tr>
      <td>{t("rso.drill.total")}</td>
      {stockTotalCells(t, kind, totals).map((cell) => (
        <td key={cell.key} className={styles.num}>
          {cell.text}
        </td>
      ))}
      {kind === "group" ? (
        <td className={styles.num}>{formatNumber(totals.items)}</td>
      ) : (
        <td className={styles.num} title={t("rso.sales.stock.itemsTotalHint")}>
          {DASH}
        </td>
      )}
    </tr>
  );
}
