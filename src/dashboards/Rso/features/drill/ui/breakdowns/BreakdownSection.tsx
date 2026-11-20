import type { ReactNode } from "react";
import styles from "../DrillDrawer.module.css";

interface BreakdownSectionProps {
  title: string;
  hint?: string;
  // Примечание под таблицей (оценочный пересчёт, источник цифр)
  note?: string;
  children: ReactNode;
}

// Обёртка раздела разбивки: заголовок, подсказка справа, содержимое, примечание
export function BreakdownSection({ title, hint, note, children }: BreakdownSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>{title}</h3>
        {hint && <span className={styles.sectionHint}>{hint}</span>}
      </div>
      {children}
      {note && <p className={styles.footnote}>{note}</p>}
    </section>
  );
}
