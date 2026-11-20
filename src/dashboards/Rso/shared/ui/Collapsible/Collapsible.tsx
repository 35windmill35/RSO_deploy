import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import styles from "./Collapsible.module.css";

interface CollapsibleProps {
  collapsed: boolean;
  // Есть что раскрывать; иначе — только содержимое
  collapsible: boolean;
  total: number;
  onToggle: () => void;
  children: ReactNode;
}

// Свёрнутая таблица: нижняя строка уходит под полупрозрачную шторку — видно,
// что список продолжается; кнопка раскрывает и сворачивает его
export function Collapsible({
  collapsed,
  collapsible,
  total,
  onToggle,
  children,
}: CollapsibleProps) {
  const { t } = useTranslation();
  if (!collapsible) return <>{children}</>;

  return (
    <div className={styles.root}>
      <div className={`${styles.body} ${collapsed ? styles.collapsed : ""}`}>
        {children}
        {collapsed && <div className={styles.fade} aria-hidden="true" />}
      </div>
      <div className={styles.bar}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={!collapsed}
          onClick={onToggle}
        >
          {collapsed ? t("rso.block.showAll", { count: total }) : t("rso.block.collapse")}
        </button>
      </div>
    </div>
  );
}
