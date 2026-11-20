import type { ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps {
  title: string;
  subtitle?: string;
  // Кнопки и переключатели справа от заголовка
  actions?: ReactNode;
  // chart — фиксированная высота под график, table — без внутренних отступов по бокам
  variant?: "default" | "chart" | "table";
  children: ReactNode;
}

export function Card({ title, subtitle, actions, variant = "default", children }: CardProps) {
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <h3 className={styles.title}>{title}</h3>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      <div className={`${styles.body} ${variant === "default" ? "" : styles[variant]}`}>
        {children}
      </div>
    </section>
  );
}
