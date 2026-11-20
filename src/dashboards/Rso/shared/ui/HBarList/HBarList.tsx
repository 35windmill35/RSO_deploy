import styles from "./HBarList.module.css";

export interface HBarItem {
  key: string;
  label: string;
  value: number | null;
  // Текст справа от полосы: «5 978 478 ₽ · 99,9 %»
  caption: string;
  // Цвет полосы — CSS-переменная темы; по умолчанию основной акцент
  color?: string;
  // Отрицательное значение — полоса красная
  negative?: boolean;
}

interface HBarListProps {
  items: HBarItem[];
  onSelect?: (key: string) => void;
}

// Горизонтальные бары со шкалой от максимума. Строка — кнопка, если есть onSelect
export function HBarList({ items, onSelect }: HBarListProps) {
  const max = Math.max(0, ...items.map((item) => Math.abs(item.value ?? 0)));

  return (
    <ul className={styles.list}>
      {items.map((item) => {
        const width = max > 0 ? (Math.abs(item.value ?? 0) / max) * 100 : 0;
        const content = (
          <>
            <span className={styles.label} title={item.label}>
              {item.label}
            </span>
            <span className={styles.track} aria-hidden="true">
              <span
                className={`${styles.fill} ${item.negative ? styles.negative : ""}`}
                style={{ width: `${width}%`, background: item.negative ? undefined : item.color }}
              />
            </span>
            <span className={styles.caption}>{item.caption}</span>
          </>
        );
        return (
          <li key={item.key}>
            {onSelect ? (
              <button
                type="button"
                className={`${styles.row} ${styles.button}`}
                aria-label={`${item.label}: ${item.caption}`}
                onClick={() => onSelect(item.key)}
              >
                {content}
              </button>
            ) : (
              <div className={styles.row}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
