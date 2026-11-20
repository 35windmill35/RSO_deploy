import type { CSSProperties } from "react";
import styles from "./Segmented.module.css";

export interface SegmentedOption<V extends string> {
  value: V;
  label: string;
}

interface SegmentedProps<V extends string> {
  label: string;
  value: V;
  options: readonly SegmentedOption<V>[];
  onChange: (value: V) => void;
  // sidebar — на тёмном сайдбаре, card — в шапке карточки
  tone?: "sidebar" | "card";
}

// Переключатель на 2–3 варианта (Месяц/Квартал/Год, С НДС/Без НДС).
// Выделение — «бегунок», который переезжает к выбранному варианту.
export function Segmented<V extends string>({
  label,
  value,
  options,
  onChange,
  tone = "sidebar",
}: SegmentedProps<V>) {
  const activeIndex = options.findIndex((option) => option.value === value);
  const style = { "--count": options.length, "--active-index": activeIndex } as CSSProperties;

  return (
    <div
      className={`${styles.group} ${tone === "card" ? styles.card : ""}`}
      role="group"
      aria-label={label}
      style={style}
    >
      {activeIndex >= 0 && <span className={styles.thumb} aria-hidden="true" />}
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={`${styles.segment} ${isActive ? styles.active : ""}`}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
