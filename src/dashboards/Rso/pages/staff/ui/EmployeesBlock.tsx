import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Period } from "@Rso/entities/rso/api/contract";
import type { PayrollEmployee } from "@Rso/entities/rso/lib/payroll";
import { EmployeesTable } from "@Rso/features/drill/ui/payroll/EmployeesTable";
import { exportEmployees } from "@Rso/features/drill/ui/payroll/payrollCsv";
import type { Translate } from "@Rso/features/drill/ui/payroll/payrollLabels";
import { Card } from "@Rso/shared/ui/Card/Card";
import type { StaffPayroll } from "../model/staffData";
import styles from "./StaffBlocks.module.css";

// Свёрнутая таблица: первые строки, остальное — по «Показать все»
const PREVIEW_ROWS = 5;

interface EmployeesBlockProps {
  payroll: StaffPayroll | null;
  period: Period | null;
  fallback?: ReactNode;
  onOpen?: (employee: PayrollEmployee) => void;
}

// Сотрудники: начисления, должность, отдел, статус (ТЗ §9). Персональные данные —
// блок и выгрузка изолированы, чтобы скрыть их за отдельным правом одной правкой (В-8)
export function EmployeesBlock({ payroll, period, fallback, onOpen }: EmployeesBlockProps) {
  const { t } = useTranslation();
  const tr: Translate = (key) => t(key);

  const card = (content: ReactNode) => (
    <Card
      title={t("rso.block.payrollEmployees.title")}
      subtitle={t("rso.block.payrollEmployees.subtitle")}
      actions={
        <button
          type="button"
          className={styles.actionButton}
          onClick={() =>
            payroll &&
            period &&
            exportEmployees(payroll.employees, payroll.history, payroll.total, period, tr)
          }
          disabled={!payroll || !period || Boolean(fallback)}
        >
          {t("rso.drill.exportCsv")}
        </button>
      }
    >
      {content}
    </Card>
  );

  if (fallback || !payroll) return card(fallback);

  return card(
    <div className={styles.stack}>
      {payroll.gone !== null && payroll.gone > 0 && (
        <p className={styles.footnote}>{t("rso.staff.employees.gone", { count: payroll.gone })}</p>
      )}
      <div className={styles.tableBleed}>
        <EmployeesTable
          employees={payroll.employees}
          history={payroll.history}
          total={payroll.total}
          preview={PREVIEW_ROWS}
          onOpen={onOpen}
        />
      </div>
    </div>,
  );
}
