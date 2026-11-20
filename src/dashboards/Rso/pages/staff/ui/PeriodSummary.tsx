import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { formatMoney, formatPct } from "@Rso/shared/lib/format";
import { Card } from "@Rso/shared/ui/Card/Card";
import type { SummaryLine } from "../model/staffData";
import styles from "./StaffBlocks.module.css";

interface PeriodSummaryProps {
  lines: SummaryLine[] | null;
  fallback?: ReactNode;
  onOpen?: (line: SummaryLine) => void;
}

// Итоговые строки «= …» — жирным
const RESULTS: ReadonlySet<SummaryLine["id"]> = new Set(["operatingProfit", "cashProfit"]);

// Сводка периода: выручка и расходы, касса, ФОТ — сверка показателей (ТЗ §11).
// Строки с переходом — кнопки; «ФОТ в расходе по кассе» без перехода, с пояснением
export function PeriodSummary({ lines, fallback, onOpen }: PeriodSummaryProps) {
  const { t } = useTranslation();

  const card = (content: ReactNode) => (
    <Card
      title={t("rso.block.periodSummary.title")}
      subtitle={t("rso.block.periodSummary.subtitle")}
    >
      {content}
    </Card>
  );

  if (fallback || !lines) return card(fallback);

  return card(
    <table className={styles.summaryTable}>
      <tbody>
        {lines.map((line) => {
          const label = t(`rso.staff.summary.${line.id}`);
          const clickable = Boolean(line.open && onOpen);
          const rowClass = [
            RESULTS.has(line.id) ? styles.summaryResult : "",
            clickable ? styles.summaryClickable : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <tr key={line.id} className={rowClass || undefined}>
              <th scope="row">
                {clickable ? (
                  // Кнопка растянута на всю строку: наведение и клик — по строке целиком
                  <button
                    type="button"
                    className={styles.summaryButton}
                    onClick={() => onOpen?.(line)}
                  >
                    {label}
                  </button>
                ) : line.id === "payrollCash" ? (
                  <span className={styles.hintText} title={t("rso.staff.summary.payrollCashHint")}>
                    {label}
                  </span>
                ) : (
                  label
                )}
              </th>
              <td>
                {line.unit === "pct" ? formatPct(line.value) : formatMoney(line.value)}
                {clickable && (
                  <span className={styles.summaryChevron} aria-hidden="true">
                    ›
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>,
  );
}
