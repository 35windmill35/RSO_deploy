import { useTranslation } from "react-i18next";
import type { PayrollDelta as Delta } from "@Rso/entities/rso/lib/payroll";
import { DASH, deltaTone, formatDelta } from "@Rso/shared/lib/format";
import styles from "./Payroll.module.css";

// Дельта ФОТ: «новый», «—» (нет прошлого периода) или процент. Рост ФОТ нейтрален
export function PayrollDelta({ value }: { value: Delta }) {
  const { t } = useTranslation();
  if (value === undefined)
    return <span className={styles.neutral}>{t("rso.sales.delta.new")}</span>;
  const text = formatDelta(value);
  if (!text) return <>{DASH}</>;
  return <span className={styles[deltaTone(value, null)]}>{text}</span>;
}
