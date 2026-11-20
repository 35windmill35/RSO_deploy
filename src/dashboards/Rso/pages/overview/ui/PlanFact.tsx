import { useTranslation } from "react-i18next";
import { DASH, formatMoney, formatPct } from "@Rso/shared/lib/format";
import type { PlanFactRow } from "../model/overviewData";
import styles from "./OverviewBlocks.module.css";

interface PlanFactProps {
  rows: PlanFactRow[];
  planSelling: number | null;
  // Drill-down по плану: money → «План по выручке», gain → «План по прибыли»
  onOpen?: (id: PlanFactRow["id"]) => void;
}

// Выполнение планов: полоса заполняется до 100 %, перевыполнение — отметкой.
// Процент берём из API (PLAN_*_FACT_PCT), он может быть больше 100 %.
// План и процент в API — с НДС, поэтому факт тоже с НДС при любом переключателе.
export function PlanFact({ rows, planSelling, onOpen }: PlanFactProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.planList}>
      {rows.map((row) => {
        const hasPlan = row.plan !== null && row.plan > 0;
        const fill = hasPlan && row.pct !== null ? Math.max(0, Math.min(100, row.pct)) : 0;
        const done = hasPlan && row.pct !== null && row.pct >= 100;
        return (
          <button
            key={row.id}
            type="button"
            className={`${styles.planRow} ${styles.rowButton}`}
            disabled={!onOpen}
            onClick={() => onOpen?.(row.id)}
          >
            <div className={styles.planHead}>
              <span className={styles.planName}>{t(`rso.plan.${row.id}`)}</span>
              <span className={`${styles.planPct} ${done ? styles.positive : ""}`}>
                {hasPlan ? formatPct(row.pct) : t("rso.plan.noPlan")}
              </span>
            </div>
            <div className={styles.track} aria-hidden="true">
              <span
                className={`${styles.bar} ${done ? styles.barDone : ""}`}
                style={{ width: `${fill}%` }}
              />
            </div>
            <div className={styles.planMeta}>
              <span>
                {t("rso.plan.fact")}: {formatMoney(row.fact)}
              </span>
              <span>
                {t("rso.plan.plan")}: {hasPlan ? formatMoney(row.plan) : DASH}
              </span>
            </div>
          </button>
        );
      })}
      <p className={styles.footnote}>{t("rso.plan.bruttoNote")}</p>
      {planSelling !== null && planSelling > 0 && (
        <p className={styles.footnote}>
          {t("rso.plan.selling", { value: formatMoney(planSelling) })}
        </p>
      )}
    </div>
  );
}
