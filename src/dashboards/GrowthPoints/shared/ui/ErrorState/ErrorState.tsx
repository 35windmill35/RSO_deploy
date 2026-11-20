import { useTranslation } from "react-i18next";
import styles from "./ErrorState.module.css";
import i18n from "@/APP/i18n";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

// Состояние ошибки (ТЗ §5: error — сообщение + повтор). onRetry необязателен
// — если не передан, кнопка "Повторить" не показывается.
export function ErrorState({
  message = i18n.t("growthPoints.errorLoadData"),
  onRetry,
}: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.wrapper}>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <button className={styles.retry} type="button" onClick={onRetry}>
          {t("growthPoints.repeat")}
        </button>
      )}
    </div>
  );
}
