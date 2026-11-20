import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Period } from "@Rso/entities/rso/api/contract";
import type { PayrollGroupRow, PayrollGroups } from "@Rso/entities/rso/lib/payroll";
import { PayrollGroupsTable } from "@Rso/features/drill/ui/payroll/PayrollGroupsTable";
import { exportPayrollGroups } from "@Rso/features/drill/ui/payroll/payrollCsv";
import { groupName, type Translate } from "@Rso/features/drill/ui/payroll/payrollLabels";
import { formatMoney, formatPct } from "@Rso/shared/lib/format";
import { Card } from "@Rso/shared/ui/Card/Card";
import { HBarList } from "@Rso/shared/ui/HBarList/HBarList";
import styles from "./StaffBlocks.module.css";

interface PayrollDepartmentsProps {
  groups: (PayrollGroups & { mismatch: boolean }) | null;
  // null — периода ещё нет, выгрузка недоступна
  period: Period | null;
  fallback?: ReactNode;
  onOpen?: (row: PayrollGroupRow) => void;
}

const NO_DEPARTMENT = "none";
const rowKey = (row: PayrollGroupRow) => (row.id === null ? NO_DEPARTMENT : String(row.id));

// ФОТ по отделам: бары + таблица с итогом (ТЗ §7). «Без отдела» — отдельной строкой
export function PayrollDepartments({ groups, period, fallback, onOpen }: PayrollDepartmentsProps) {
  const { t } = useTranslation();
  const tr: Translate = (key) => t(key);

  // Сумма строк разошлась с итогом больше округления — только суммы, без сотрудников
  const mismatch = groups?.mismatch ?? false;
  const sum = groups?.rows.reduce((acc, row) => acc + row.wage, 0) ?? null;
  const total = groups?.total.wage ?? null;
  useEffect(() => {
    if (import.meta.env.DEV && mismatch) {
      console.warn("[rso] payroll: departments sum != total", { sum, total });
    }
  }, [mismatch, sum, total]);

  const card = (content: ReactNode) => (
    <Card
      title={t("rso.block.payrollByDept.title")}
      subtitle={t("rso.block.payrollByDept.subtitle")}
      actions={
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => groups && period && exportPayrollGroups(groups, "department", period, tr)}
          disabled={!groups || !period || Boolean(fallback)}
        >
          {t("rso.drill.exportCsv")}
        </button>
      }
    >
      {content}
    </Card>
  );

  if (fallback || !groups) return card(fallback);

  // Отделы с ФОТ 0 (были только в прошлом периоде) — только в таблице
  const bars = groups.rows.filter((row) => row.wage > 0);

  return card(
    <div className={styles.stack}>
      <HBarList
        items={bars.map((row) => ({
          key: rowKey(row),
          label: groupName(row, "department", tr),
          value: row.wage,
          caption: `${formatMoney(row.wage)} · ${formatPct(row.share)}`,
          color: row.id === null ? "var(--rso-neutral)" : undefined,
        }))}
        onSelect={
          onOpen
            ? (key) => {
                const row = groups.rows.find((item) => rowKey(item) === key);
                if (row) onOpen(row);
              }
            : undefined
        }
      />
      <p className={styles.footnote}>{t("rso.staff.byDept.note")}</p>
      <div className={styles.tableBleed}>
        <PayrollGroupsTable groups={groups} kind="department" onOpen={onOpen} />
      </div>
    </div>,
  );
}
