import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { deltaTone, formatDelta, formatSignedCount, type DeltaUnit } from "@Rso/shared/lib/format";
import { useCountUp } from "@Rso/shared/lib/useCountUp";
import { Skeleton } from "@Rso/shared/ui/Skeleton/Skeleton";
import styles from "./KpiCard.module.css";

interface KpiCardProps {
  label: string;
  // Число без форматирования; null — прочерк
  value: number | null;
  // Как показать число: formatMoney, formatPct, formatNumber…
  format: (value: number | null) => string;
  // Дельта к прошлому периоду, %; undefined — карточка без дельты (например, «Выполнение плана»)
  delta?: number | null;
  // Единица дельты: % для сумм и количеств, п.п. для долей, count — абсолютное изменение
  deltaUnit?: DeltaUnit | "count";
  // null — нейтральный показатель, дельта серым
  higherIsBetter?: boolean | null;
  // Текст вместо дельты или рядом с ней: «план: 5 000 000 ₽»
  note?: string;
  // Подсказка: описание метрики
  hint?: string;
  loading?: boolean;
  // Значение есть, дельта ещё считается (грузится прошлый период) — скелетон вместо текста
  deltaLoading?: boolean;
  onClick?: () => void;
}

export function KpiCard({
  label,
  value,
  format,
  delta,
  deltaUnit = "pct",
  higherIsBetter = true,
  note,
  hint,
  loading = false,
  deltaLoading = false,
  onClick,
}: KpiCardProps) {
  const { t } = useTranslation();
  // Число «набегает» от нуля; экранный диктор читает итог из aria-label
  const shown = useCountUp(value);
  const exact = format(value);
  const deltaText =
    deltaUnit === "count" ? formatSignedCount(delta) : formatDelta(delta, deltaUnit);
  const tone = deltaTone(delta, higherIsBetter);

  let deltaNode: ReactNode = null;
  if (deltaLoading) {
    deltaNode = <Skeleton width={40} height={12} />;
  } else if (delta !== undefined) {
    deltaNode = (
      <span className={`${styles.delta} ${styles[tone]}`}>{deltaText ?? t("rso.kpi.noDelta")}</span>
    );
  }

  const content = loading ? (
    <>
      <Skeleton width="60%" height={12} />
      <Skeleton width="80%" height={26} />
      <Skeleton width="40%" height={12} />
    </>
  ) : (
    <>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>
        {/* Анимированное число — для глаз, точное значение и описание — для экранного диктора */}
        <span aria-hidden="true">{format(shown)}</span>
        <span className={styles.srOnly}>{exact}</span>
      </span>
      {hint && <span className={styles.srOnly}>{hint}</span>}
      <span className={styles.footer}>
        {deltaNode}
        {note && <span className={styles.note}>{note}</span>}
      </span>
    </>
  );

  if (onClick && !loading) {
    return (
      <button
        type="button"
        className={`${styles.card} ${styles.clickable}`}
        title={hint}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={styles.card} title={hint}>
      {content}
    </div>
  );
}

// Сетка KPI: 5 колонок ≥ 1280 px, 3 — до 1280, 2 — < 900 (§8.2)
export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}
