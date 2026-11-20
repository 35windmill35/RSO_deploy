import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Period } from "@Rso/entities/rso/api/contract";
import type { PayrollGroupRow, PayrollGroups } from "@Rso/entities/rso/lib/payroll";
import { exportPayrollGroups } from "@Rso/features/drill/ui/payroll/payrollCsv";
import { groupName, type Translate } from "@Rso/features/drill/ui/payroll/payrollLabels";
import { formatMoney, formatPct } from "@Rso/shared/lib/format";
import { Card } from "@Rso/shared/ui/Card/Card";
import { HBarList, type HBarItem } from "@Rso/shared/ui/HBarList/HBarList";
import styles from "./StaffBlocks.module.css";

interface PayrollPositionsProps {
  groups: PayrollGroups | null;
  period: Period | null;
  fallback?: ReactNode;
  onOpen?: (row: PayrollGroupRow) => void;
  // «Детализация» и «Ещё N должностей» — панель со всеми должностями
  onOpenAll?: () => void;
}

const TOP_BARS = 8;
const REST_KEY = "rest";

// ФОТ по должностям: топ-8 барами + «Ещё N должностей», полная таблица — в панели детализации
export function PayrollPositions({
  groups,
  period,
  fallback,
  onOpen,
  onOpenAll,
}: PayrollPositionsProps) {
  const { t } = useTranslation();
  const tr: Translate = (key) => t(key);

  const card = (content: ReactNode) => (
    <Card
      title={t("rso.block.payrollPositions.title")}
      subtitle={t("rso.block.payrollPositions.subtitle")}
      actions={
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => groups && period && exportPayrollGroups(groups, "position", period, tr)}
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

  const items: HBarItem[] = groups.rows.slice(0, TOP_BARS).map((row) => ({
    key: String(row.id),
    label: groupName(row, "position", tr),
    value: row.wage,
    caption: `${formatMoney(row.wage)} · ${formatPct(row.share)}`,
  }));
  const rest = groups.rows.slice(TOP_BARS);
  if (rest.length > 0) {
    const restWage = rest.reduce((sum, row) => sum + row.wage, 0);
    items.push({
      key: REST_KEY,
      label: t("rso.staff.positions.others", { count: rest.length }),
      value: restWage,
      caption: `${formatMoney(restWage)} · ${formatPct(
        groups.total.wage ? (restWage / groups.total.wage) * 100 : null,
      )}`,
      color: "var(--rso-neutral)",
    });
  }

  return card(
    <div className={styles.stack}>
      <HBarList
        items={items}
        onSelect={(key) => {
          if (key === REST_KEY) {
            onOpenAll?.();
            return;
          }
          const row = groups.rows.find((item) => String(item.id) === key);
          if (row) onOpen?.(row);
        }}
      />
      {onOpenAll && (
        <div className={styles.detailsFooter}>
          <button type="button" className={styles.actionButton} onClick={onOpenAll}>
            {t("rso.staff.positions.details")}
          </button>
        </div>
      )}
    </div>,
  );
}
