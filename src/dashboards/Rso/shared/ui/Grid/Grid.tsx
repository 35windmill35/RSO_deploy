import type { ReactNode } from "react";
import styles from "./Grid.module.css";

// Сетка блоков вкладки: 12 колонок на десктопе, 1 колонка < 900 px
export function Grid({ children }: { children: ReactNode }) {
  return <div className={styles.grid}>{children}</div>;
}

export type GridSpan = 4 | 6 | 8 | 12;

interface GridItemProps {
  span: GridSpan;
  // На узком десктопе (900–1279 px) — во всю строку: для пары 4 + 8, где соседний
  // блок тоже переходит на всю ширину
  wide?: boolean;
  children: ReactNode;
}

export function GridItem({ span, wide = false, children }: GridItemProps) {
  return (
    <div className={`${styles.item} ${styles[`span${span}`]} ${wide ? styles.wide : ""}`}>
      {children}
    </div>
  );
}
