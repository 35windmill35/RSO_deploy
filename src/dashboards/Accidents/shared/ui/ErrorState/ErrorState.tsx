import i18n from "@/APP/i18n";
import styles from "./ErrorState.module.css";
import { useTranslation } from "react-i18next";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = i18n.t("roadAccidents.error.loadFailed"),
  onRetry,
}: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.wrapper} role="status">
      <span className={styles.icon} aria-hidden="true">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 8v4.5" />
          <path d="M12 15.8v.2" />
        </svg>
      </span>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <button className={styles.retry} type="button" onClick={onRetry}>
          {t("roadAccidents.common.retry")}
        </button>
      )}
    </div>
  );
}
