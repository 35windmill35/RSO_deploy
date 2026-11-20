import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import styles from "../DrillDrawer.module.css";

interface DepartmentMismatchProps {
  // Название отдела из turnoverAndIncome и названия отделов в ЗН месяца
  department: string | null;
  accountDepartments: readonly (string | null)[];
}

// В ЗН нет ID отдела, сопоставление идёт по названию. Если в месяце есть ЗН, но ни
// одного с названием отдела — показываем все ЗН и объясняем почему
export function DepartmentMismatch({ department, accountDepartments }: DepartmentMismatchProps) {
  const { t } = useTranslation();
  const names = Array.from(new Set(accountDepartments)).join(" | ");

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.warn("[rso] department not found in accounts by name", { department, names });
    }
  }, [department, names]);

  return (
    <p className={styles.notice} role="status">
      {t("rso.drill.departmentNoMatch")}
    </p>
  );
}
