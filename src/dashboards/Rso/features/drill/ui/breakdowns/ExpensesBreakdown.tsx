import { observer } from "mobx-react-lite";
import { useTranslation } from "react-i18next";
import { filtersStore } from "@Rso/entities/rso/model/filtersStore";
import { DASH, formatMoney } from "@Rso/shared/lib/format";
import { BlockState } from "@Rso/shared/ui/BlockState/BlockState";
import { DataTable, type DataTableColumn } from "@Rso/shared/ui/DataTable/DataTable";
import { expenseLines, type ExpenseLine } from "../../model/breakdowns";
import { BreakdownSection } from "./BreakdownSection";
import type { BreakdownProps } from "./types";

// Расходы периода по категориям и статьям (DashboardRSO.expenses)
export const ExpensesBreakdown = observer(function ExpensesBreakdown({
  period,
  data,
}: BreakdownProps) {
  const { t } = useTranslation();
  const lines = expenseLines(data, period, filtersStore.vat);
  const total = lines.reduce((sum, line) => sum + (line.amount ?? 0), 0);

  const columns: DataTableColumn<ExpenseLine>[] = [
    {
      key: "category",
      label: t("rso.drill.category"),
      render: (line) =>
        line.category === null
          ? t("rso.drill.otherExpenses")
          : t(`rso.expenseCategory.${line.category}`, { defaultValue: line.category }),
    },
    {
      key: "article",
      label: t("rso.drill.article"),
      grow: true,
      render: (line) => line.article ?? DASH,
    },
    {
      key: "department",
      label: t("rso.col.department"),
      render: (line) => line.department ?? DASH,
    },
    {
      key: "amount",
      label: t("rso.drill.amount"),
      align: "right",
      render: (line) => formatMoney(line.amount),
    },
  ];

  return (
    <BreakdownSection
      title={t("rso.drill.expenses")}
      hint={lines.length > 0 ? `${t("rso.drill.total")}: ${formatMoney(total)}` : undefined}
    >
      {lines.length === 0 ? (
        <BlockState kind="empty" message={t("rso.drill.noExpenses")} />
      ) : (
        <DataTable<ExpenseLine> columns={columns} rows={lines} getRowKey={(line) => line.key} />
      )}
    </BreakdownSection>
  );
});
