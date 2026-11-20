import type { ReactNode } from "react";
import styles from "./StatusScreen.module.css";

type StatusTone = "loading" | "locked" | "error";

interface StatusScreenProps {
  tone: StatusTone;
  title: string;
  message?: ReactNode;
  // Кнопки действий
  children?: ReactNode;
}

function ToneIcon({ tone }: { tone: Exclude<StatusTone, "loading"> }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {tone === "locked" ? (
        <>
          <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
          <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
        </>
      ) : (
        <>
          <path d="M12 3.5 21.5 20h-19Z" />
          <path d="M12 10v4.5" />
          <path d="M12 17.2v.3" />
        </>
      )}
    </svg>
  );
}

// Полноэкранное состояние дашборда: проверка доступа, нет доступа, ошибка
export function StatusScreen({ tone, title, message, children }: StatusScreenProps) {
  const isLoading = tone === "loading";

  return (
    <div className={`rso ${styles.wrapper}`}>
      <div className={styles.card} role={isLoading ? "status" : "alert"} aria-live="polite">
        {isLoading ? (
          <span className={styles.spinner} aria-hidden="true" />
        ) : (
          <span className={`${styles.badge} ${tone === "error" ? styles.badgeError : ""}`}>
            <ToneIcon tone={tone} />
          </span>
        )}
        <h1 className={styles.title}>{title}</h1>
        {message && <p className={styles.message}>{message}</p>}
        {children && <div className={styles.actions}>{children}</div>}
      </div>
    </div>
  );
}
