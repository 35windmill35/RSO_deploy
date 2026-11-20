import styles from "./StackedBar.module.css";

export interface StackedSegment {
  key: string;
  label: string;
  value: number;
  // Цвет — CSS-переменная темы
  color: string;
  // Цвет подписи внутри сегмента — контрастный к заливке (токен темы)
  textColor?: string;
  // Подпись внутри сегмента: «48,6 %»
  caption: string;
}

interface StackedBarProps {
  segments: StackedSegment[];
  // Описание полосы для экранного диктора
  label: string;
  onSelect?: (key: string) => void;
}

// Подпись внутри сегмента видна, только если он шире 8 %
const MIN_LABEL_SHARE = 0.08;

// Полоса 100 % из сегментов (структура оборота, доли)
export function StackedBar({ segments, label, onSelect }: StackedBarProps) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0);
  if (total <= 0) return null;

  return (
    <div className={styles.bar} role="group" aria-label={label}>
      {segments
        .filter((segment) => segment.value > 0)
        .map((segment) => {
          const share = segment.value / total;
          const text = share >= MIN_LABEL_SHARE ? segment.caption : "";
          const style = { flexGrow: share, background: segment.color, color: segment.textColor };
          const title = `${segment.label}: ${segment.caption}`;
          return onSelect ? (
            <button
              key={segment.key}
              type="button"
              className={`${styles.segment} ${styles.button}`}
              style={style}
              title={title}
              aria-label={title}
              onClick={() => onSelect(segment.key)}
            >
              {text}
            </button>
          ) : (
            <span key={segment.key} className={styles.segment} style={style} title={title}>
              {text}
            </span>
          );
        })}
    </div>
  );
}
