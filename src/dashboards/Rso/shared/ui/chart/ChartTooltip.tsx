import type { ReactNode } from "react";
import { DASH } from "@Rso/shared/lib/format";
import styles from "./ChartTooltip.module.css";

interface TooltipEntry {
  name?: string | number;
  value?: unknown;
  color?: string;
  dataKey?: unknown;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<TooltipEntry>;
  label?: unknown;
  title?: ReactNode;
  valueFormatter: (value: number) => string;
  // Итоговая строка под значениями серий: «Итого 5 980 700 ₽»
  footer?: { label: string; value: string };
}

// Подсказка графика: заголовок (период) и значения серий
export function ChartTooltip({
  active,
  payload,
  label,
  title,
  valueFormatter,
  footer,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const heading = title ?? (label as ReactNode);

  return (
    <div className={styles.tooltip}>
      {heading !== undefined && heading !== "" && <span className={styles.title}>{heading}</span>}
      {payload.map((entry, index) => (
        <span key={`${String(entry.dataKey)}-${index}`} className={styles.row}>
          <span className={styles.swatch} style={{ background: entry.color }} aria-hidden="true" />
          <span className={styles.name}>{entry.name}</span>
          <span className={styles.value}>
            {typeof entry.value === "number" ? valueFormatter(entry.value) : DASH}
          </span>
        </span>
      ))}
      {footer && (
        <span className={`${styles.row} ${styles.footer}`}>
          <span aria-hidden="true" />
          <span className={styles.name}>{footer.label}</span>
          <span className={styles.value}>{footer.value}</span>
        </span>
      )}
    </div>
  );
}
