import { useTranslation } from "react-i18next";
import { Skeleton } from "@Rso/shared/ui/Skeleton/Skeleton";
import styles from "./BlockState.module.css";

export type BlockStateKind = "loading" | "empty" | "error";

interface BlockStateProps {
  kind: BlockStateKind;
  // Своё сообщение вместо стандартного
  message?: string;
  onRetry?: () => void;
}

// Состояние блока без данных. Ошибка одного блока не трогает соседние.
export function BlockState({ kind, message, onRetry }: BlockStateProps) {
  const { t } = useTranslation();

  if (kind === "loading") {
    return (
      <div className={styles.loading} aria-busy="true" aria-label={t("rso.block.loading")}>
        <Skeleton height={14} width="45%" />
        <Skeleton height={120} />
        <Skeleton height={14} width="70%" />
      </div>
    );
  }

  return (
    <div
      className={`${styles.state} ${kind === "error" ? styles.error : ""}`}
      role={kind === "error" ? "alert" : "status"}
    >
      <span className={styles.message}>{message ?? t(`rso.block.${kind}`)}</span>
      {kind === "error" && onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          {t("rso.block.retry")}
        </button>
      )}
    </div>
  );
}
