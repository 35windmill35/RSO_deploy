import i18n from "@/APP/i18n";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  message?: string;
}

// Состояние "нет данных" (ТЗ §5: empty — «Нет данных за период»).
export function EmptyState({ message = i18n.t("growthPoints.noDataByPeriod") }: EmptyStateProps) {
  return <div className={styles.wrapper}>{message}</div>;
}
